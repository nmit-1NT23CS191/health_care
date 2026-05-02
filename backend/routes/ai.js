const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { analyzeClaim } = require('../controllers/aiController');

router.post('/analyze/:claimId', authMiddleware, analyzeClaim);

module.exports = router;
