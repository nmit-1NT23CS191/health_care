const tesseract = require('tesseract.js');
const fs = require('fs');

/**
 * Extracts raw text from an image using Tesseract.js
 * @param {string} imagePath - Path to the uploaded image file
 * @returns {Promise<string>} - Extracted text
 */
const performOCR = async (imagePath) => {
    try {
        const result = await tesseract.recognize(imagePath, 'eng', {
            // logger: m => console.log(m) // Disable logging for cleaner output
        });
        return result.data.text;
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Failed to perform OCR on document');
    }
};

/**
 * Parse extracted text to find key fields
 * @param {string} text - Raw text from OCR
 * @returns {Object} - Parsed data
 */
const parseExtractedText = (text) => {
    // This is a simplistic NLP/Regex approach for MVP
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let hospitalName = 'Unknown Hospital';
    let billAmount = 0;
    let date = 'Unknown Date';
    let billNumber = `BN-${Math.floor(Math.random() * 100000)}`;
    let diagnosis = 'General Checkup';

    // Heuristics for MVP
    if (lines.length > 0) {
        // Assume first line is hospital name if it looks like one
        hospitalName = lines[0]; 
    }

    // Look for keywords
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        // Amount
        if (lowerLine.includes('total') || lowerLine.includes('amount') || lowerLine.includes('rs') || lowerLine.includes('$') || lowerLine.includes('rupees')) {
            const numbers = line.match(/\d+(\.\d{1,2})?/g);
            if (numbers && numbers.length > 0) {
                // take the largest number as total
                const maxNum = Math.max(...numbers.map(n => parseFloat(n)));
                if (maxNum > billAmount) billAmount = maxNum;
            }
        }

        // Date
        if (lowerLine.includes('date')) {
            const dateMatch = line.match(/\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/);
            if (dateMatch) date = dateMatch[0];
        }

        // Bill Number
        if (lowerLine.includes('bill no') || lowerLine.includes('invoice')) {
            const words = line.split(/[:\s]+/);
            for (let i=0; i<words.length; i++) {
                if ((words[i].toLowerCase() === 'no' || words[i].toLowerCase() === 'invoice') && i < words.length - 1) {
                    billNumber = words[i+1];
                }
            }
        }

        // Diagnosis
        if (lowerLine.includes('diagnosis') || lowerLine.includes('disease') || lowerLine.includes('treatment')) {
            const parts = line.split(/[:\s\-]+/);
            if (parts.length > 1) {
                diagnosis = parts.slice(1).join(' ');
            }
        }
    }

    return {
        hospitalName,
        billAmount: billAmount || Math.floor(Math.random() * 10000) + 1000, // Fallback random
        date: date === 'Unknown Date' ? new Date().toISOString().split('T')[0] : date,
        billNumber,
        diagnosis
    };
};

const parsePolicyText = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let policyName = '';
    let policyId = '';
    let totalCover = 0;

    lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        // Improve Policy Name extraction
        if (lowerLine.includes('policy type') || lowerLine.includes('plan name') || lowerLine.includes('product')) {
            const parts = line.split(/[:\s\-]+/);
            if (parts.length > 1) policyName = parts.slice(1).join(' ').trim();
        }

        // Improved Policy ID extraction
        if (lowerLine.includes('policy number') || lowerLine.includes('policy id') || lowerLine.includes('document id')) {
            // Match typical Indian policy formats (SLH-IND-2026-...) or long alphanumeric strings
            const matches = line.match(/[A-Z0-9]{3,}[A-Z0-9\-]{5,}/i);
            if (matches) {
                const found = matches[0];
                if (!['POLICY', 'NUMBER', 'INSURED', 'HEALTH', 'DOCUMENT'].includes(found.toUpperCase())) {
                    policyId = found;
                }
            }
        }

        // Improve Amount extraction - look for "Sum Insured" or "Coverage Amount"
        if (lowerLine.includes('sum insured') || lowerLine.includes('cover') || lowerLine.includes('balance') || lowerLine.includes('insured member')) {
            const cleaned = line.replace(/[^0-9]/g, ' '); // Keep only digits and spaces
            const numbers = cleaned.split(/\s+/).filter(n => n.length >= 5).map(n => parseInt(n));
            if (numbers.length > 0) {
                const validAmount = Math.max(...numbers);
                if (validAmount > totalCover) totalCover = validAmount;
            }
        }
    });

    return { 
        policyName: policyName || 'Health Insurance', 
        policyId: policyId || '', 
        totalCover: totalCover || 500000 
    };
};

module.exports = {
    performOCR,
    parseExtractedText,
    parsePolicyText
};
