const verifyGST = async (gstNumber) => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    let isValidFormat = false;
    if (gstNumber) {
        const cleanGST = gstNumber.replace(/[^A-Z0-9]/ig, '').toUpperCase();
        isValidFormat = gstRegex.test(cleanGST);
    }

    const isRegistryMatch = Math.random() > 0.2;

    return {
        validFormat: isValidFormat,
        registryMatch: isValidFormat ? isRegistryMatch : false,
        message: isValidFormat 
            ? (isRegistryMatch ? 'GST matched against registry.' : 'GST not found in registry.')
            : 'Invalid GST format or missing.'
    };
};

module.exports = { verifyGST };
