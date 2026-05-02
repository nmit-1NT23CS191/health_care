const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true },
    amount: { type: Number, required: true },
    stage: { type: String, enum: ['PARTIAL', 'FINAL'], required: true },
    status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
    releasedAt: { type: Date },
    receiptUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
