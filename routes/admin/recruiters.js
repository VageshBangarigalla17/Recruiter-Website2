// backend/routes/admin/recruiters.js
const express  = require('express');
const router   = express.Router();
const { ensureAuthenticated } = require('../../middlewares/authMiddleware');
const { isAdmin }            = require('../../middlewares/adminMiddleware');
const recruiterCtrl          = require('../../controllers/recruiterController');
const methodOverride         = require('method-override');


// All routes here require Admin
router.use(ensureAuthenticated, isAdmin);
router.use(methodOverride('_method'));

// List all recruiters
router.get(
  '/',
  recruiterCtrl.listRecruiters
);

// Show form to add a new recruiter
router.get(
  '/new',
  recruiterCtrl.createRecruiterForm
);

// Handle form submission
router.post(
  '/new',
  recruiterCtrl.postCreateRecruiter
);

// Show edit form for a recruiter
router.get('/:id/edit', recruiterCtrl.editRecruiterForm);

// Handle update (PUT via method-override)
router.post('/:id/edit', recruiterCtrl.updateRecruiter);

// Handle delete (POST for delete button)
router.delete('/:id', recruiterCtrl.deleteRecruiter);


module.exports = router;
