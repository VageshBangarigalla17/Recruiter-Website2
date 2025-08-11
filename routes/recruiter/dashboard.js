const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../../middlewares/authMiddleware');
const recruiterDashboardCtrl = require('../../controllers/recruiterDashboardController');

// Show self performance dashboard
router.get('/dashboard', ensureAuthenticated, recruiterDashboardCtrl.renderSelfDashboard);
router.get('/dashboard/data', ensureAuthenticated, recruiterDashboardCtrl.getSelfDashboardData);

module.exports = router;