const axios = require('axios');

/**
 * Verify Hospital against IMA / NHA Registry
 * Simulated using an Axios-like architecture for the hackathon prototype.
 */
const verifyMedicalRegistry = async (hospitalName, registryId = null) => {
    if (!hospitalName) {
        return {
            isRegistered: false,
            registryType: 'Unverified',
            message: 'Hospital name missing for verification.'
        };
    }

    try {
        // SIMULATED AXIOS CALL
        // e.g., const response = await axios.get(`https://api.nha.gov.in/registry/v1/hospitals?name=${hospitalName}`, { ... });
        
        // Mocking the delay
        await new Promise(res => setTimeout(res, 600));

        // For the hackathon, we simulate that Apollo/Fortis/Max are in IMA, others might just be NHA
        const lowerName = hospitalName.toLowerCase();
        let isRegistered = false;
        let registryType = 'Unverified';

        if (lowerName.includes('apollo') || lowerName.includes('fortis') || lowerName.includes('max') || lowerName.includes('clearmedi')) {
            isRegistered = true;
            registryType = 'IMA Registered';
        } else if (lowerName.includes('care') || lowerName.includes('health') || lowerName.includes('hospital')) {
            isRegistered = true;
            registryType = 'NHA Listed';
        }

        return {
            isRegistered,
            registryType,
            message: isRegistered ? 'Hospital found in national medical registry.' : 'Hospital not found in registry.',
            medicalRegistryId: isRegistered ? `REG-${Math.floor(Math.random() * 900000) + 100000}` : null
        };

    } catch (error) {
        console.error('Medical Registry API Error:', error.message);
        return {
            isRegistered: false,
            registryType: 'Unverified',
            message: 'Failed to connect to medical registry API.'
        };
    }
};

module.exports = { verifyMedicalRegistry };
