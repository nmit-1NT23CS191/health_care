const Payment = require('../models/Payment');
const Claim = require('../models/Claim');

const releaseStagePayment = async (claimId, amount, stage) => {
    try {
        const payment = new Payment({
            claimId,
            amount,
            stage,
            status: 'COMPLETED',
            releasedAt: new Date(),
            receiptUrl: `/receipts/mock-receipt-${claimId}-${stage}.txt`
        });
        await payment.save();
        
        const claim = await Claim.findById(claimId);
        if (stage === 'PARTIAL') {
            claim.fundStage = 'PARTIAL_RELEASED';
            claim.stages.stage1 = { status: 'COMPLETED', amount };
        } else {
            claim.fundStage = 'FULL_RELEASED';
            claim.stages.stage2 = { status: 'COMPLETED', amount }; 
        }
        await claim.save();

        return payment;
    } catch (err) {
        console.error(err);
        throw err;
    }
};

module.exports = { releaseStagePayment };
