// backend/routes/admin/dashboard.js
const express = require('express');
const router  = express.Router();
const adminCtrl = require('../../controllers/adminDashboardController');
const { ensureAuthenticated } = require('../../middlewares/authMiddleware');
const { isAdmin }             = require('../../middlewares/adminMiddleware');

// Main Admin Dashboard
router.get(
  '/',
  ensureAuthenticated, isAdmin,
  adminCtrl.renderAdminDashboard
);
router.get(
  '/data',
  ensureAuthenticated, isAdmin,
  adminCtrl.getAdminData
);

// Recruiter Performance
router.get(
  '/recruiter/:id',
  ensureAuthenticated, isAdmin,
  adminCtrl.renderRecruiterPerformance
);
router.get(
  '/recruiter/:id/data',
  ensureAuthenticated, isAdmin,
  adminCtrl.getRecruiterPerformanceData
);

module.exports = router;
