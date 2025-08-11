// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { ensureAuth } = require('../middleware/auth'); // adjust to your auth middleware

// Page (server-side render)
router.get('/', ensureAuth, dashboardController.renderDashboard);

// API for live stats
router.get('/api/live-stats', ensureAuth, dashboardController.getLiveStats);

module.exports = router;
