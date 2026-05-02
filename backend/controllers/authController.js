const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        
        // Simple validation
        if (!name || !phone || !password) {
            return res.status(400).json({ message: 'Please provide all fields' });
        }

        // Check if user exists
        let user = await User.findOne({ phone });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            phone,
            password: hashedPassword
        });

        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: user._id, name: user.name, phone: user.phone, riskProfile: user.riskProfile, policies: user.policies }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            message: 'Logged in successfully',
            token,
            user: { id: user._id, name: user.name, phone: user.phone, riskProfile: user.riskProfile, policies: user.policies }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const { performOCR, parsePolicyText } = require('../services/ocrService');

exports.updatePolicy = async (req, res) => {
    try {
        const { name, policyId, totalCover } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        let finalData = { 
            name: name || 'New Policy', 
            policyId: policyId || `POL-${Math.floor(Math.random()*10000)}`, 
            totalCover: 500000 // Fixed as per user request
        };
        let docUrl = '';

        if (req.file) {
            docUrl = req.file.filename;
        }

        user.policies.push({ 
            name: finalData.name, 
            policyId: finalData.policyId,
            totalCover: finalData.totalCover,
            usedCover: 0,
            documentUrl: docUrl
        });

        await user.save();
        
        res.status(200).json({
            message: 'Policy added and verified successfully',
            user: { id: user._id, name: user.name, phone: user.phone, riskProfile: user.riskProfile, policies: user.policies }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deletePolicy = async (req, res) => {
    try {
        const { id, policyId } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.policies = user.policies.filter(p => p._id.toString() !== policyId);
        await user.save();

        res.status(200).json({
            message: 'Policy deleted successfully',
            user: { id: user._id, name: user.name, phone: user.phone, riskProfile: user.riskProfile, policies: user.policies }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.processPolicyOcr = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const text = await performOCR(req.file.path);
        const parsed = parsePolicyText(text);

        res.status(200).json({
            message: 'OCR processed successfully',
            extractedData: parsed
        });
    } catch (error) {
        res.status(500).json({ message: 'OCR processing failed', error: error.message });
    }
};
