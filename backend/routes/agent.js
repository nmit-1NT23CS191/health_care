const express = require('express');
const router = express.Router();
const { getAllPendingClaims, makeDecision, getAllPendingPolicies, decidePolicy } = require('../controllers/agentController');
const authMiddleware = require('../middleware/authMiddleware');

// In a real app, you would have a specific agent auth middleware
router.get('/claims', authMiddleware, getAllPendingClaims);
router.post('/decision', authMiddleware, makeDecision);

router.get('/policies/pending', authMiddleware, getAllPendingPolicies);
router.post('/policies/decision', authMiddleware, decidePolicy);

module.exports = router;
