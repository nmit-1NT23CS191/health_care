const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    documents: [{
        filename: String,
        path: String,
        hash: String // for duplicate detection
    }],
    ocrData: { 
        hospitalName: String,
        billAmount: Number,
        date: String,
        billNumber: String,
        diagnosis: String,
        confidenceScore: Number
    },
    nlpData: { 
        extractedDiagnosisCode: String,
        treatmentType: String
    },
    claimType: { type: String, enum: ['Accident', 'Surgery', 'Chronic Illness', 'General Consultation', 'Other'], default: 'Other' },
    riskScore: { type: Number, default: 0 }, // 0 to 100
    riskBand: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    riskBreakdown: [{ type: String }],
    status: { type: String, enum: ['SUBMITTED', 'ANALYZING', 'VERIFYING', 'PENDING_AGENT', 'APPROVED', 'REJECTED'], default: 'SUBMITTED' },
    approvedAmount: { type: Number, default: 0 },
    fundStage: { type: String, enum: ['NONE', 'PARTIAL_RELEASED', 'FULL_RELEASED'], default: 'NONE' },
    stages: {
        stage1: { status: String, amount: Number }, // instant partial amount
        stage2: { status: String, amount: Number }, // after agent approval
        stage3: { status: String, amount: Number }  // after discharge
    }
}, { timestamps: true });

module.exports = mongoose.model('Claim', ClaimSchema);
