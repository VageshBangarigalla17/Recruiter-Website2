// backend/routes/candidates.js

const express               = require('express');
const router                = express.Router();
const upload                = require('../config/multerCloudinary');
const candidateCtrl         = require('../controllers/candidateController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// ─── 1) “Pick & Export” must come BEFORE any `/:id` routes ────────────────────

// Show the export-picker page (GET /candidates/export)
router.get(
  '/export',
  ensureAuthenticated,
  candidateCtrl.exportCandidates // <-- use this, not showExportPage
);

// Download the XLSX for selected IDs (POST /candidates/export/download)
router.post(
  '/export/download',
  ensureAuthenticated,
  candidateCtrl.exportSelected
);

// ─── 2) Your normal CRUD routes ──────────────────────────────────────────────

// List all candidates (GET /candidates)
router.get(
  '/',
  ensureAuthenticated,
  candidateCtrl.getAllCandidates
);

// Show “add candidate” form (GET /candidates/new)
router.get(
  '/new',
  ensureAuthenticated,
  (req, res) => res.render('candidates/new')
);

// Create candidate (POST /candidates)
router.post(
  '/',
  ensureAuthenticated,
  upload.single('resume'),
  candidateCtrl.createCandidate
);

// Show candidate details (GET /candidates/:id)
router.get(
  '/:id',
  ensureAuthenticated,
  candidateCtrl.getCandidateById,
  (req, res) => res.render('candidates/show', { candidate: res.locals.candidate })
);

// Show “edit candidate” form (GET /candidates/:id/edit)
router.get(
  '/:id/edit',
  ensureAuthenticated,
  candidateCtrl.getCandidateById,
  (req, res) => res.render('candidates/edit', { candidate: res.locals.candidate })
);

// Update candidate (POST /candidates/:id)
router.post(
  '/:id',
  ensureAuthenticated,
  upload.single('resume'),
  candidateCtrl.updateCandidate
);

// Delete candidate (POST /candidates/:id/delete)
router.post(
  '/:id/delete',
  ensureAuthenticated,
  candidateCtrl.deleteCandidate
);

// ─── 3) Serve the resume file ───────────────────────────────────────────────

// Download resume attachment (GET /candidates/:id/download)
router.get(
  '/:id/download',
  ensureAuthenticated,
  candidateCtrl.downloadResume
);

module.exports = router;
