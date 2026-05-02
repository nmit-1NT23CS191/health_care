const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    gstNumber: { type: String },
    phone: { type: String },
    trustScore: { type: Number, default: 0.5 }, // 0.0 to 1.0
    trustLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    verified: { type: Boolean, default: false },
    blacklisted: { type: Boolean, default: false },
    fraudFlags: { type: Number, default: 0 },
    totalClaims: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Hospital', HospitalSchema);
