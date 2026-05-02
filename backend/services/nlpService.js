const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HF_TOKEN || '');

const extractMedicalEntities = async (text) => {
    try {
        const lowerText = text.toLowerCase();
        let extractedDiagnosisCode = 'UNKNOWN';
        let treatmentType = 'OUTPATIENT';

        if (lowerText.includes('surgery') || lowerText.includes('operation')) treatmentType = 'INPATIENT';
        if (lowerText.includes('dengue')) extractedDiagnosisCode = 'A90';
        if (lowerText.includes('malaria')) extractedDiagnosisCode = 'B54';
        if (lowerText.includes('covid')) extractedDiagnosisCode = 'U07.1';

        // For MVP, we simulate the NLP extraction since free tier inference APIs can be slow
        return {
            extractedDiagnosisCode,
            treatmentType
        };
    } catch (err) {
        console.error('NLP Error:', err);
        return { extractedDiagnosisCode: 'UNKNOWN', treatmentType: 'UNKNOWN' };
    }
};

module.exports = { extractMedicalEntities };
