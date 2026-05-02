const path = require('path');
const { performOCR, parsePolicyText } = require('./services/ocrService');

(async () => {
  try {
    const filePath = path.join(__dirname, 'uploads', '1777746859019-add polici.jpeg');
    console.log('Testing OCR on file:', filePath);
    const text = await performOCR(filePath);
    const parsed = parsePolicyText(text);
    console.log('Parsed result from test script:', parsed);
  } catch (err) {
    console.error('Test OCR error:', err);
  }
})();
