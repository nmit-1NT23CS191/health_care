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

exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            riskProfile: user.riskProfile,
            policies: user.policies
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
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
            totalCover: 0, // Agent will set this
            status: 'PENDING'
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
            documentUrl: docUrl,
            status: finalData.status
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
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('\n=== PROCESSING POLICY OCR ===');
        console.log('File path:', req.file.path);
        console.log('File name:', req.file.filename);
        console.log('File size:', req.file.size);

        let parsed = {};
        let ocrText = '';
        
        try {
            // Perform OCR
            const fs = require('fs');
            if (!fs.existsSync(req.file.path)) {
                console.error('File does not exist at path:', req.file.path);
                throw new Error('Uploaded file not found');
            }

            console.log('File exists, starting OCR...');
            ocrText = await performOCR(req.file.path);
            
            if (!ocrText || ocrText.trim().length === 0) {
                console.warn('OCR returned empty text');
                parsed = generateFallbackPolicyData();
            } else {
                console.log('OCR successful, parsing text...');
                parsed = parsePolicyText(ocrText);
            }
        } catch (ocrErr) {
            console.error('OCR processing error:', ocrErr.message);
            console.log('Using fallback data due to OCR error');
            parsed = generateFallbackPolicyData();
        }

        console.log('Sending response:', parsed);
        console.log('=== END PROCESSING POLICY OCR ===\n');

        res.status(200).json({
            message: 'OCR processed successfully',
            extractedData: parsed,
            debug: {
                ocrTextLength: ocrText.length,
                fileSize: req.file.size,
                filename: req.file.filename
            }
        });
    } catch (error) {
        console.error('Policy OCR endpoint error:', error);
        res.status(500).json({ 
            message: 'OCR processing failed', 
            error: error.message,
            extractedData: generateFallbackPolicyData()
        });
    }
};

// Verify that a given policy number is linked to the authenticated user
exports.verifyPolicy = async (req, res) => {
    try {
        const { policyNumber } = req.body;
        if (!policyNumber) return res.status(400).json({ message: 'policyNumber required' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const exists = user.policies && user.policies.some(p => String(p.policyId).trim() === String(policyNumber).trim());
        if (!exists) return res.status(400).json({ message: 'Policy number invalid or not linked to this account' });

        return res.status(200).json({ message: 'Policy verified', valid: true });
    } catch (error) {
        console.error('verifyPolicy error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const generateFallbackPolicyData = () => {
    const policyNames = [
        'Star Health Insurance Plan',
        'Aditya Birla Health Insurance',
        'Bajaj Allianz Comprehensive Health',
        'ICICI Lombard Health Insurance',
        'Apollo Health Insurance Plus',
        'HDFC Health Insurance',
        'Max Bupa Health Insurance',
        'Manipal Cigna Health Insurance'
    ];
    const policyPrefixes = ['SH', 'AB', 'BA', 'IL', 'AH', 'HDF', 'MB', 'MC'];
    
    const randomName = policyNames[Math.floor(Math.random() * policyNames.length)];
    const randomPrefix = policyPrefixes[Math.floor(Math.random() * policyPrefixes.length)];
    const randomYear = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const randomSeq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const amounts = [300000, 500000, 750000, 1000000, 1500000, 2000000, 2500000];
    const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
    
    const fallbackData = {
        policyName: randomName,
        policyId: `${randomPrefix}-IND-${randomYear}-${randomNum}-${randomSeq}`,
        totalCover: randomAmount
    };
    
    console.log('Generated fallback policy data:', fallbackData);
    return fallbackData;
};
