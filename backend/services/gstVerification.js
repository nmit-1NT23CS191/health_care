const axios = require('axios');

/**
 * Verify GST against a Third-Party Provider (e.g., Razorpay/Sandbox/Karza)
 * Uses a mock fallback structure for the hackathon prototype.
 */
const verifyGST = async (gstNumber, hospitalName = '') => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
    
    let cleanGST = '';
    let isValidFormat = false;
    
    if (gstNumber) {
        cleanGST = gstNumber.replace(/[^A-Z0-9]/ig, '').toUpperCase();
        isValidFormat = gstRegex.test(cleanGST);
    }

    if (!isValidFormat) {
        return {
            validFormat: false,
            registryMatch: false,
            message: 'Invalid GST format or missing.',
            legalName: null
        };
    }

    try {
        // SIMULATED AXIOS CALL
        // If we had a real API key:
        // const response = await axios.get(`https://api.sandbox.co.in/gsp/public/gstin/${cleanGST}`, {
        //     headers: { 'Authorization': `Bearer ${process.env.GST_API_KEY}` }
        // });
        
        // Mocking the Axios response delay
        await new Promise(res => setTimeout(res, 800));

        // Simulated API Response data
        const mockApiResponse = {
            data: {
                status: 'Active',
                taxpayerType: 'Regular',
                legalName: hospitalName || 'Mock Hospital Name Pvt Ltd',
                natureOfBusiness: 'Human health services (SAC 9993)'
            }
        };

        const responseData = mockApiResponse.data;

        // Check active status
        if (responseData.status !== 'Active') {
            return {
                validFormat: true,
                registryMatch: false,
                message: 'GSTIN is registered but inactive.',
                legalName: responseData.legalName
            };
        }

        // We can do further checks like comparing legalName string similarity, etc.
        return {
            validFormat: true,
            registryMatch: true,
            message: 'GST matched against registry and is Active.',
            legalName: responseData.legalName,
            natureOfBusiness: responseData.natureOfBusiness
        };
    } catch (error) {
        console.error('GST API Error:', error.message);
        return {
            validFormat: true,
            registryMatch: false, // Fails open or closed depending on risk appetite
            message: 'Failed to connect to GST registry API.',
            legalName: null
        };
    }
};

module.exports = { verifyGST };
