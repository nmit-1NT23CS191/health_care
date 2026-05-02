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
        let hospitalMismatch = false;
        let extractedHospitals = [];

        if (claim.documents.length > 0) {
            for (let doc of claim.documents) {
                try {
                    const rawText = await performOCR(doc.path);
                    const parsed = parseExtractedText(rawText);
                    
                    if (parsed.hospitalName && parsed.hospitalName !== 'Unknown Hospital') {
                        extractedHospitals.push(parsed.hospitalName.toLowerCase().trim());
                    }

                    if (!claim.ocrData || !claim.ocrData.hospitalName) {
                        claim.ocrData = parsed;
                        claim.ocrData.confidenceScore = ocrConfidence;
                    }
                } catch (ocrErr) {
                    console.warn(`OCR failed for document ${doc.path}:`, ocrErr.message);
                    // Fall back to manually entered data
                    if (!claim.ocrData || !claim.ocrData.hospitalName) {
                        claim.ocrData = {
                            hospitalName: claim.ocrData?.hospitalName || 'Unknown',
                            diagnosis: claim.ocrData?.diagnosis || 'Unknown',
                            billAmount: 0,
                            confidenceScore: 0
                        };
                    }
                }
            }

            if (extractedHospitals.length > 1) {
                const firstHosp = extractedHospitals[0];
                for (let i = 1; i < extractedHospitals.length; i++) {
                    if (extractedHospitals[i] !== firstHosp) {
                        hospitalMismatch = true;
                        break;
                    }
                }
            }
        }

        if (claim.ocrData && claim.ocrData.diagnosis) {
            claim.nlpData = await extractMedicalEntities(claim.ocrData.diagnosis);
        }
        
        // --- External Verification Services ---
        const { verifyMedicalRegistry } = require('../services/medicalRegistryService');

        // GST Verification (uses hospital name to mock if needed)
        const gstResult = hospital ? await verifyGST(hospital.gstNumber, hospital.name) : { registryMatch: false, legalName: null };
        
        // Medical Registry Verification (IMA/NHA)
        const registryResult = hospital ? await verifyMedicalRegistry(hospital.name) : { isRegistered: false, registryType: 'Unverified' };
        
        const admissionResult = hospital ? await simulateOTPVerification(hospital.phone) : { confirmed: false };
        const documentTamperingSignals = claim.documents.length > 0 ? await detectDocumentTampering(claim.documents[0].path) : [];
        const velocitySignals = await checkVelocity(user._id);

        // Update Hospital Model with new verification info if available
        if (hospital) {
            hospital.isGstVerified = gstResult.registryMatch;
            hospital.isImaRegistered = registryResult.isRegistered;
            hospital.medicalRegistryId = registryResult.medicalRegistryId;
            hospital.verifiedAt = new Date();
            await hospital.save();
        }

        claim.status = 'VERIFYING';
        await claim.save();

        const verificationResults = {
            ocrConfidence: claim.ocrData ? claim.ocrData.confidenceScore : 0,
            isGstValid: gstResult.registryMatch,
            gstLegalName: gstResult.legalName,
            registryStatus: registryResult.registryType,
            isAdmissionConfirmed: admissionResult.confirmed,
            documentTamperingSignals,
            velocitySignals,
            hospitalMismatch
        };

        const riskResult = await calculateRisk(claim, user, hospital, verificationResults);
        console.log(`Risk Analysis for Claim ${claimId}: Score=${riskResult.score}, Band=${riskResult.riskBand}`);

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
