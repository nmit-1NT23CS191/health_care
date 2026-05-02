const calculateRisk = async (claimData, user, hospital, verificationResults) => {
    let score = 0;
    let breakdown = [];

    const {
        ocrConfidence = 85,
        isGstValid = true,
        isAdmissionConfirmed = true,
        documentTamperingSignals = [],
        velocitySignals = []
    } = verificationResults || {};

    // 1. Document Consistency (25%)
    if (documentTamperingSignals && documentTamperingSignals.length > 0) {
        score += 25;
        breakdown.push(`Document tampering detected: ${documentTamperingSignals.join(', ')} (+25)`);
    } else {
        breakdown.push('Documents are consistent and show no tampering (+0)');
    }

    // 2. GST / e-Invoice valid (20%)
    if (!isGstValid) {
        score += 20;
        breakdown.push('Hospital GST is invalid or missing from registry (+20)');
    } else {
        breakdown.push('Hospital GST matches registry (+0)');
    }

    // 3. Admission Confirmed (25%)
    if (!isAdmissionConfirmed) {
        score += 25;
        breakdown.push('Live admission could not be verified via OTP (+25)');
    } else {
        breakdown.push('Live admission confirmed (+0)');
    }

    // 4. OCR Confidence (15%)
    if (ocrConfidence < 70) {
        score += 15;
        breakdown.push(`OCR confidence is low (${ocrConfidence}%) (+15)`);
    } else {
        breakdown.push(`OCR confidence is high (${ocrConfidence}%) (+0)`);
    }

    // 5. Fraud History Signals (15%)
    if (velocitySignals && velocitySignals.length > 0) {
        score += 15;
        breakdown.push(`High velocity or fraud history detected: ${velocitySignals.join(', ')} (+15)`);
    } else if (hospital && hospital.fraudFlags > 0) {
        score += 15;
        breakdown.push('Hospital has prior fraud flags (+15)');
    } else {
        breakdown.push('No significant fraud history signals (+0)');
    }

    score = Math.min(score, 100);

    let riskBand = 'LOW';
    let approvedAmount = 0;
    const billAmount = claimData?.ocrData?.billAmount || 0;

    if (score <= 35) {
        riskBand = 'LOW';
        approvedAmount = billAmount * 0.70;
    } else if (score <= 65) {
        riskBand = 'MEDIUM';
        approvedAmount = billAmount * 0.50;
    } else {
        riskBand = 'HIGH';
        approvedAmount = 0;
    }

    return {
        score,
        riskBand,
        breakdown,
        approvedAmount
    };
};

module.exports = { calculateRisk };
