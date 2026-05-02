const express = require('express');
const router = express.Router();
const multer = require('multer');
const { register, login, updatePolicy, deletePolicy, processPolicyOcr } = require('../controllers/authController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

router.post('/register', register);
router.post('/login', login);
router.post('/:id/policy', upload.single('policyDoc'), updatePolicy);
router.delete('/:id/policy/:policyId', deletePolicy);
router.post('/policy/ocr', upload.single('policyDoc'), processPolicyOcr);

module.exports = router;
