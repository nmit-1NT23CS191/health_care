const Claim = require('../models/Claim');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { releaseStagePayment } = require('../services/paymentService');

exports.getAnalytics = async (req, res) => {
    try {
        const now = new Date();

        // Today boundaries
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        // Month boundaries
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [todayApproved, todayRejected, monthApproved, monthRejected, totalPending] = await Promise.all([
            Claim.countDocuments({ status: 'APPROVED', updatedAt: { $gte: todayStart, $lt: todayEnd } }),
            Claim.countDocuments({ status: 'REJECTED', updatedAt: { $gte: todayStart, $lt: todayEnd } }),
            Claim.countDocuments({ status: 'APPROVED', updatedAt: { $gte: monthStart } }),
            Claim.countDocuments({ status: 'REJECTED', updatedAt: { $gte: monthStart } }),
            Claim.countDocuments({ status: 'PENDING_AGENT' }),
        ]);

        // Build 14-day daily chart data
        const dailyData = [];
        for (let i = 13; i >= 0; i--) {
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const [approved, rejected] = await Promise.all([
                Claim.countDocuments({ status: 'APPROVED', updatedAt: { $gte: dayStart, $lt: dayEnd } }),
                Claim.countDocuments({ status: 'REJECTED', updatedAt: { $gte: dayStart, $lt: dayEnd } }),
            ]);
            dailyData.push({
                date: dayStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                approved,
                rejected,
            });
        }

        res.status(200).json({
            today: { approved: todayApproved, rejected: todayRejected, pending: totalPending },
            month: { approved: monthApproved, rejected: monthRejected },
            dailyChart: dailyData,
            currentDate: now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllPendingClaims = async (req, res) => {
    try {
        const claims = await Claim.find({ status: { $in: ['PENDING_AGENT'] } })
                                  .populate('userId', 'name phone riskProfile policies')
                                  .populate('hospitalId');
        res.status(200).json(claims);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getClaimHistory = async (req, res) => {
    try {
        const claims = await Claim.find({ status: { $in: ['APPROVED', 'REJECTED'] } })
                                  .populate('userId', 'name phone riskProfile')
                                  .populate('hospitalId')
                                  .sort({ updatedAt: -1 });
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
            const approvedAmt = Number(finalAmount) || Number(claim.ocrData?.billAmount) || 0;
            
            // Validate policy coverage
            const user = await User.findById(claim.userId);
            if (user && claim.policyId) {
                const policyIndex = user.policies.findIndex(p => p.policyId === claim.policyId);
                if (policyIndex !== -1) {
                    const policy = user.policies[policyIndex];
                    const remainingCover = (policy.totalCover || 0) - (policy.usedCover || 0);
                    
                    if (approvedAmt > remainingCover) {
                        return res.status(400).json({ 
                            message: `Insufficient coverage! This policy only has ₹${remainingCover.toLocaleString()} remaining, but you tried to approve ₹${approvedAmt.toLocaleString()}.` 
                        });
                    }

                    // Deduct from policy coverage
                    user.policies[policyIndex].usedCover = (user.policies[policyIndex].usedCover || 0) + approvedAmt;
                    user.markModified('policies');
                    await user.save();
                }
            }

            claim.status = 'APPROVED';
            claim.approvedAmount = approvedAmt;

            // Release final payment for remaining amount
            const previouslyReleased = claim.stages?.stage1?.amount || 0;
            const remainingToRelease = claim.approvedAmount - previouslyReleased;
            if (remainingToRelease > 0) {
                try {
                    await releaseStagePayment(claim._id, remainingToRelease, 'FINAL');
                } catch (e) {
                    console.error('Payment release failed:', e.message);
                }
            }
            claim.fundStage = 'FULL_RELEASED';
        } else if (decision === 'REQUEST_INFO') {
            claim.status = 'PENDING_AGENT'; // stays in queue but logged
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
            if (!Array.isArray(claim.riskBreakdown)) claim.riskBreakdown = [];
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

exports.getAllPendingPolicies = async (req, res) => {
    try {
        const users = await User.find({ "policies.status": "PENDING" }, 'name phone email policies');
        
        let pendingPolicies = [];
        users.forEach(user => {
            user.policies.forEach(policy => {
                if (policy.status === 'PENDING') {
                    pendingPolicies.push({
                        userId: user._id,
                        userName: user.name,
                        userPhone: user.phone,
                        policy: policy
                    });
                }
            });
        });

        res.status(200).json(pendingPolicies);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.decidePolicy = async (req, res) => {
    try {
        const { userId, policyId, decision, totalCover } = req.body;
        // decision: 'ACTIVE', 'REJECTED'

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const policyIndex = user.policies.findIndex(p => p._id.toString() === policyId);
        if (policyIndex === -1) {
            return res.status(404).json({ message: 'Policy not found' });
        }

        user.policies[policyIndex].status = decision;
        if (decision === 'ACTIVE' && totalCover) {
            user.policies[policyIndex].totalCover = Number(totalCover);
        }

        await user.save();
        res.status(200).json({ message: 'Policy decision recorded successfully', policy: user.policies[policyIndex] });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
