const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { releaseStagePayment } = require('../services/paymentService');

router.post('/release/:claimId', authMiddleware, async (req, res) => {
    try {
        const { amount, stage } = req.body;
        const payment = await releaseStagePayment(req.params.claimId, amount, stage);
        res.status(200).json({ message: 'Payment released', payment });
    } catch (err) {
        res.status(500).json({ message: 'Payment error', error: err.message });
    }
});

module.exports = router;
