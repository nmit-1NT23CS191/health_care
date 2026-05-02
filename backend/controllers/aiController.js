const Claim = require('../models/Claim');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { performOCR, parseExtractedText } = require('../services/ocrService');
const { extractMedicalEntities } = require('../services/nlpService');
const { verifyGST } = require('../services/gstVerification');
const { detectDocumentTampering, checkVelocity } = require('../services/fraudDetect');
const { simulateOTPVerification } = require('../services/admissionService');
const { calculateRisk } = require('../services/riskEngine');
const { releaseStagePayment } = require('../services/paymentService');

exports.analyzeClaim = async (req, res) => {
    try {
        const claimId = req.params.claimId;
        const claim = await Claim.findById(claimId).populate('hospitalId');
        if (!claim) return res.status(404).json({ message: 'Claim not found' });
        
        const user = await User.findById(claim.userId);
        const hospital = claim.hospitalId;

        claim.status = 'ANALYZING';
        await claim.save();

        let ocrConfidence = 85;
        if ((!claim.ocrData || !claim.ocrData.hospitalName) && claim.documents.length > 0) {
            const rawText = await performOCR(claim.documents[0].path);
            claim.ocrData = parseExtractedText(rawText);
            claim.ocrData.confidenceScore = ocrConfidence;
        }

        if (claim.ocrData && claim.ocrData.diagnosis) {
            claim.nlpData = await extractMedicalEntities(claim.ocrData.diagnosis);
        }
        
        const gstResult = hospital ? await verifyGST(hospital.gstNumber) : { registryMatch: false };
        const admissionResult = hospital ? await simulateOTPVerification(hospital.phone) : { confirmed: false };
        const documentTamperingSignals = claim.documents.length > 0 ? await detectDocumentTampering(claim.documents[0].path) : [];
        const velocitySignals = await checkVelocity(user._id);

        claim.status = 'VERIFYING';
        await claim.save();

        const verificationResults = {
            ocrConfidence: claim.ocrData ? claim.ocrData.confidenceScore : 0,
            isGstValid: gstResult.registryMatch,
            isAdmissionConfirmed: admissionResult.confirmed,
            documentTamperingSignals,
            velocitySignals
        };

        const riskResult = await calculateRisk(claim, user, hospital, verificationResults);

        claim.riskScore = riskResult.score;
        claim.riskBand = riskResult.riskBand;
        claim.riskBreakdown = riskResult.breakdown;
        claim.approvedAmount = riskResult.approvedAmount;

        if (claim.riskBand === 'LOW') {
            claim.status = 'APPROVED';
            await releaseStagePayment(claim._id, claim.approvedAmount, 'PARTIAL');
        } else if (claim.riskBand === 'MEDIUM') {
            claim.status = 'PENDING_AGENT'; 
            await releaseStagePayment(claim._id, claim.approvedAmount, 'PARTIAL');
        } else {
            claim.status = 'PENDING_AGENT'; 
        }

        await claim.save();

        res.status(200).json({
            message: 'Pipeline execution complete',
            claim,
            verificationResults
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Pipeline Error' });
    }
};
