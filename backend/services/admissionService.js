const simulateOTPVerification = async (hospitalPhone) => {
    console.log(`Sending OTP to hospital phone: ${hospitalPhone}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const isConfirmed = Math.random() > 0.1;
    return {
        confirmed: isConfirmed,
        message: isConfirmed ? 'Live admission verified via hospital OTP.' : 'Hospital failed to verify live admission.'
    };
};

module.exports = { simulateOTPVerification };
