const Claim = require('../models/Claim');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const crypto = require('crypto');
const fs = require('fs');

exports.createClaim = async (req, res) => {
    try {
        const { hospitalName, diagnosis, claimType, policyId } = req.body;

        if (!policyId) return res.status(400).json({ message: 'Policy ID is required' });

        // Validate policyId is linked to the requesting user
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const hasPolicy = user.policies && user.policies.some(p => String(p.policyId).trim() === String(policyId).trim());
        if (!hasPolicy) {
            return res.status(400).json({ message: 'Policy number invalid or not linked to this account' });
        }
        
        let hospital = await Hospital.findOne({ name: new RegExp(hospitalName, 'i') });
        if (!hospital) {
            hospital = new Hospital({
                name: hospitalName,
                gstNumber: `GST-${Math.floor(Math.random()*1000000)}`,
                trustScore: 0.2,
                totalClaims: 1
            });
            await hospital.save();
        } else {
            hospital.totalClaims += 1;
            await hospital.save();
        }

        const newClaim = new Claim({
            userId: req.user.id,
            hospitalId: hospital._id,
            policyId: policyId,
            claimType: claimType || 'Other',
            ocrData: {
                hospitalName: hospitalName,
                diagnosis: diagnosis
            },
            status: 'SUBMITTED'
        });

        await newClaim.save();

        // update user's claims history (user was loaded earlier for policy validation)
        user.claimsHistory = user.claimsHistory || [];
        user.claimsHistory.push(newClaim._id);
        await user.save();

        res.status(201).json({ message: 'Claim created', claim: newClaim });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Please upload files' });
        
        const claimId = req.params.id;
        const claim = await Claim.findById(claimId);
        if (!claim) return res.status(404).json({ message: 'Claim not found' });

        let hasDuplicate = false;

        for (const file of req.files) {
            const fileBuffer = fs.readFileSync(file.path);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            const fileHash = hashSum.digest('hex');

            const duplicate = await Claim.findOne({ 'documents.hash': fileHash });
            if (duplicate && duplicate._id.toString() !== claimId) {
                hasDuplicate = true;
                continue; // Skip duplicate file
            }

            claim.documents.push({
                filename: file.filename,
                path: file.path,
                hash: fileHash
            });
        }

        if (claim.documents.length === 0 && hasDuplicate) {
             return res.status(400).json({ message: 'All uploaded documents were duplicates' });
        }

        await claim.save();
        res.status(200).json({ message: 'Documents uploaded', claim });
    } catch (error) {
        res.status(500).json({ message: 'Upload error', error: error.message });
    }
};

exports.getUserClaims = async (req, res) => {
    try {
        const claims = await Claim.find({ userId: req.user.id }).populate('hospitalId');
        res.status(200).json(claims);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getClaimById = async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id).populate('hospitalId');
        if (!claim) return res.status(404).json({ message: 'Claim not found' });
        res.status(200).json(claim);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getClaimStatus = async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id).select('status riskBand approvedAmount fundStage');
        if (!claim) return res.status(404).json({ message: 'Claim not found' });
        res.status(200).json(claim);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
