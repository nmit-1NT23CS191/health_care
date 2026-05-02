const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClaim, uploadDocument, getUserClaims, getClaimById, getClaimStatus } = require('../controllers/claimsController');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

router.post('/create', authMiddleware, createClaim);
router.post('/:id/upload', authMiddleware, upload.array('documents', 10), uploadDocument);
router.get('/patient/:userId', authMiddleware, getUserClaims); 
router.get('/:id/status', authMiddleware, getClaimStatus);
router.get('/:id', authMiddleware, getClaimById);
// Also support the old path just in case
router.get('/', authMiddleware, getUserClaims);

module.exports = router;
