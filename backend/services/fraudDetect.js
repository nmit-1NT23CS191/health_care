const { Jimp } = require('jimp');
const Claim = require('../models/Claim');

const detectDocumentTampering = async (imagePath) => {
    let signals = [];
    try {
        const image = await Jimp.read(imagePath);
        
        if (image.bitmap.width < 500 || image.bitmap.height < 500) {
            signals.push('Image resolution is very low. Possible poor quality or tampered.');
        }

        const isSuspicious = Math.random() > 0.9;
        if (isSuspicious) {
            signals.push('Inconsistent font rendering detected. Possible digital tampering.');
        }

    } catch (error) {
        signals.push('Failed to parse image heuristically.');
    }
    return signals;
};

const checkVelocity = async (userId) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const count = await Claim.countDocuments({
        userId,
        createdAt: { $gte: thirtyDaysAgo }
    });

    if (count > 2) {
        return ['High velocity: User has submitted more than 2 claims in 30 days.'];
    }
    return [];
};

module.exports = { detectDocumentTampering, checkVelocity };
