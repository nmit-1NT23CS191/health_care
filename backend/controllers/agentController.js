const Claim = require('../models/Claim');
const Hospital = require('../models/Hospital');
const AuditLog = require('../models/AuditLog');
const { releaseStagePayment } = require('../services/paymentService');

exports.getAllPendingClaims = async (req, res) => {
    try {
        const claims = await Claim.find({ status: { $in: ['PENDING_AGENT'] } })
                                  .populate('userId', 'name phone riskProfile')
                                  .populate('hospitalId');
        res.status(200).json(claims);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.makeDecision = async (req, res) => {
    try {
        const { claimId, decision, finalAmount, notes } = req.body;
        // decision: 'APPROVED', 'REJECTED', 'REQUEST_INFO'

        const claim = await Claim.findById(claimId).populate('hospitalId');
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }

        const agentId = req.user.id;
        claim.agentId = agentId;

        if (decision === 'APPROVED') {
            claim.status = 'APPROVED';
            claim.approvedAmount = finalAmount || claim.ocrData.billAmount;
            
            // Release final payment for remaining amount
            const previouslyReleased = claim.stages?.stage1?.amount || 0;
            const remainingToRelease = claim.approvedAmount - previouslyReleased;
            if (remainingToRelease > 0) {
                await releaseStagePayment(claim._id, remainingToRelease, 'FINAL');
            }
            claim.fundStage = 'FULL_RELEASED';
        } else if (decision === 'REJECTED') {
            claim.status = 'REJECTED';
            
            if (notes && notes.toLowerCase().includes('fraud')) {
                const hospital = await Hospital.findById(claim.hospitalId);
                if(hospital) {
                    hospital.fraudFlags += 1;
                    hospital.trustScore = Math.max(0, hospital.trustScore - 0.2);
                    await hospital.save();
                }
            }
        }

        if (notes) {
            claim.riskBreakdown.push(`Agent Note: ${notes}`);
        }

        await claim.save();

        // Create Audit Log
        const auditLog = new AuditLog({
            claimId: claim._id,
            agentId: agentId,
            action: decision,
            reason: notes || 'No notes provided'
        });
        await auditLog.save();

        res.status(200).json({ message: 'Decision recorded successfully', claim });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
