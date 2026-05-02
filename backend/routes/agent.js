const express = require('express');
const router = express.Router();
const { getAllPendingClaims, makeDecision } = require('../controllers/agentController');
const authMiddleware = require('../middleware/authMiddleware');

// In a real app, you would have a specific agent auth middleware
router.get('/claims', authMiddleware, getAllPendingClaims);
router.post('/decision', authMiddleware, makeDecision);

module.exports = router;
