const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ['patient', 'agent'], default: 'patient' },
    riskProfile: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    kycStatus: { type: String, enum: ['UNVERIFIED', 'VERIFIED'], default: 'UNVERIFIED' },
    policies: [{
        name: { type: String },
        policyId: { type: String },
        totalCover: { type: Number, default: 0 },
        usedCover: { type: Number, default: 0 },
        documentUrl: { type: String },
        status: { type: String, enum: ['PENDING', 'ACTIVE', 'REJECTED'], default: 'PENDING' }
    }],
    claimsHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Claim' }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
