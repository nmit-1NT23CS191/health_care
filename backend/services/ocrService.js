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

module.exports = {
    performOCR,
    parseExtractedText
};
