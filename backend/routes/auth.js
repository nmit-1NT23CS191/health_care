const express = require('express');
const router = express.Router();
const multer = require('multer');
<<<<<<< HEAD
const { register, login, updatePolicy, deletePolicy, processPolicyOcr, verifyPolicy } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
=======
const { register, login, updatePolicy, deletePolicy, processPolicyOcr, getUser } = require('../controllers/authController');
>>>>>>> 1e0555e (Fix user dashboard policy sync delay and agent dashboard syntax)

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
router.get('/:id', getUser);
router.post('/:id/policy', upload.single('policyDoc'), updatePolicy);
router.delete('/:id/policy/:policyId', deletePolicy);
router.post('/policy/ocr', upload.single('policyDoc'), processPolicyOcr);
router.post('/verify-policy', authMiddleware, verifyPolicy);

module.exports = router;
