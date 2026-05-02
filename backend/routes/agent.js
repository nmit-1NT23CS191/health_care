const express = require('express');
const router = express.Router();
const { getAllPendingClaims, getClaimHistory, makeDecision, getAllPendingPolicies, decidePolicy, getAnalytics } = require('../controllers/agentController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/analytics', authMiddleware, getAnalytics);
router.get('/claims/history', authMiddleware, getClaimHistory);
router.get('/claims', authMiddleware, getAllPendingClaims);
router.post('/decision', authMiddleware, makeDecision);

router.get('/policies/pending', authMiddleware, getAllPendingPolicies);
router.post('/policies/decision', authMiddleware, decidePolicy);

module.exports = router;
