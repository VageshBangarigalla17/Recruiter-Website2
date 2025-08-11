// backend/controllers/candidateController.js
const Candidate = require('../models/Candidate');
const ExcelJS   = require('exceljs');
const path      = require('path');

// ─── 1) LIST ALL CANDIDATES ─────────────────────────────────────────────────────
exports.getAllCandidates = async (req, res) => {
  try {
    const { searchName, searchMobile, searchPosition, serialRefNumber, page = 1 } = req.query;
    const mongoFilter = {};

    // Text filters
    if (searchName)     mongoFilter.candidateName = new RegExp(searchName.trim(), 'i');
    if (searchMobile)   mongoFilter.mobile        = new RegExp(searchMobile.trim(), 'i');
    if (searchPosition) mongoFilter.position      = new RegExp(searchPosition.trim(), 'i');
    if (serialRefNumber) mongoFilter.serialRefNumber = Number(serialRefNumber);

    // Role-based: recruiters only see their own entries
    if (req.user.role === 'recruiter') {
      mongoFilter.createdBy = req.user._id;
    }

    const ITEMS_PER_PAGE = 15;
    const totalCount = await Candidate.countDocuments(mongoFilter);
    const candidates = await Candidate.find(mongoFilter)
      .sort({ dateOfCall: -1 })
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    res.render('candidates/index', {
      candidates,
      filter: { searchName, searchMobile, searchPosition, serialRefNumber },
      pagination: {
        page: Number(page),
        totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE)
      }
    });
  } catch (err) {
    console.error('Error fetching candidates:', err);
    req.flash('error_msg', 'Could not load candidates');
    res.redirect('/dashboard');
  }
};

// ─── 2) SHOW “NEW” FORM ─────────────────────────────────────────────────────────
exports.showNewForm = (req, res) => {
  res.render('candidates/new');
};

// ─── 3) CREATE CANDIDATE ─────────────────────────────────────────────────────────
exports.createCandidate = async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };

    // normalize empty strings
    if (data.clientStatus === '') data.clientStatus = undefined;
    if (data.finalStatus  === '') data.finalStatus  = undefined;

    // resume uploaded via Cloudinary or local
    if (req.file) {
      data.resumePath = req.file.path;        // multer-storage-cloudinary sets .path to the URL
      data.resume     = req.file.originalname;
    }

    await new Candidate(data).save();
    req.flash('success_msg', 'Candidate added successfully');
    res.redirect('/candidates');
  } catch (err) {
    console.error('Create error:', err);
    req.flash('error_msg', 'Failed to add candidate.');
    res.redirect('/candidates/new');
  }
};

// ─── 4) FETCH SINGLE CANDIDATE ──────────────────────────────────────────────────
exports.getCandidateById = async (req, res, next) => {
  try {
    const c = await Candidate.findById(req.params.id);
    if (!c) {
      req.flash('error_msg', 'Candidate not found');
      return res.redirect('/candidates');
    }
    // Restrict recruiters to their own records
    if (req.user.role === 'recruiter' && !c.createdBy.equals(req.user._id)) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/candidates');
    }
    res.locals.candidate = c;
    next();
  } catch (err) {
    console.error('Fetch by ID error:', err);
    req.flash('error_msg', 'Could not load candidate');
    res.redirect('/candidates');
  }
};

// ─── 5) UPDATE CANDIDATE ────────────────────────────────────────────────────────
exports.updateCandidate = async (req, res) => {
  try {
    const update = { ...req.body, updatedBy: req.user._id };

    if (req.file) {
      update.resumePath = req.file.path;
      update.resume     = req.file.originalname;
    }

    await Candidate.findByIdAndUpdate(req.params.id, update);
    req.flash('success_msg', 'Candidate updated');
    res.redirect(`/candidates/${req.params.id}`);
  } catch (err) {
    console.error('Update error:', err);
    req.flash('error_msg', 'Failed to update candidate.');
    res.redirect(`/candidates/${req.params.id}/edit`);
  }
};

// ─── 6) DELETE CANDIDATE ────────────────────────────────────────────────────────
exports.deleteCandidate = async (req, res) => {
  try {
    await Candidate.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Candidate deleted successfully!');
    res.redirect('/candidates');
  } catch (err) {
    console.error('Delete error:', err);
    req.flash('error_msg', 'Could not delete candidate');
    res.redirect('/candidates');
  }
};

// ─── 7) SHOW EXPORT PICKER ─────────────────────────────────────────────────────
exports.showExportPage = async (req, res, next) => {
  try {
    const { searchName = '', searchMobile = '', searchPosition = '' } = req.query;
    const filter = {};
    if (searchName)     filter.candidateName = new RegExp(searchName.trim(), 'i');
    if (searchMobile)   filter.mobile        = new RegExp(searchMobile.trim(), 'i');
    if (searchPosition) filter.position      = new RegExp(searchPosition.trim(), 'i');
    if (req.user.role === 'recruiter') filter.createdBy = req.user._id;

    const candidates = await Candidate.find(filter).sort({ createdAt: -1 });
    res.render('candidates/export', {
      candidates,
      filters:     { searchName, searchMobile, searchPosition },
      error_msg:   req.flash('error_msg'),
      success_msg: req.flash('success_msg')
    });
  } catch (err) {
    next(err);
  }
};

// ─── 8) EXPORT SELECTED TO EXCEL ───────────────────────────────────────────────
exports.exportSelected = async (req, res) => {
  try {
    let ids = req.body.ids || [];
    if (!Array.isArray(ids)) ids = [ids];

    const cands = await Candidate.find({ _id: { $in: ids } })
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Candidates');

    ws.columns = [
      { header: 'Name',           key: 'candidateName',    width: 25 },
      { header: 'Mobile',         key: 'mobile',           width: 15 },
      { header: 'Email',          key: 'email',            width: 25 },
      { header: 'Position',       key: 'position',         width: 20 },
      { header: 'Date of Call',   key: 'dateOfCall',       width: 15 },
      { header: 'Interview Type', key: 'interviewType',    width: 15 },
      { header: 'Created By',     key: 'createdByName',    width: 20 },
      { header: 'Created At',     key: 'createdAt',        width: 20 },
      { header: 'Updated By',     key: 'updatedByName',    width: 20 },
      { header: 'Updated At',     key: 'updatedAt',        width: 20 }
    ];

    cands.forEach(c => {
      ws.addRow({
        candidateName:  c.candidateName,
        mobile:         c.mobile,
        email:          c.email,
        position:       c.position,
        dateOfCall:     c.dateOfCall?.toISOString().slice(0,10) || '',
        interviewType:  c.interviewType,
        createdByName:  c.createdBy?.username || '—',
        createdAt:      c.createdAt?.toLocaleString() || '',
        updatedByName:  c.updatedBy?.username || '',
        updatedAt:      c.updatedAt?.toLocaleString() || ''
      });
    });

    res
      .header('Content-Type',  
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition',
        'attachment; filename="candidates.xlsx"');

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export error:', err);
    req.flash('error_msg', 'Export failed.');
    res.redirect('/candidates');
  }
};

// ─── 9) DOWNLOAD RESUME ────────────────────────────────────────────────────────
exports.downloadResume = async (req, res) => {
  try {
    const c = await Candidate.findById(req.params.id);
    if (!c || !c.resumePath) {
      req.flash('error_msg', 'No resume found for this candidate');
      return res.redirect(`/candidates/${req.params.id}`);
    }

    // assume local storage under /public/uploads/resumes
    const fileOnDisk = path.join(__dirname, '..', 'public', c.resumePath);
    res.download(fileOnDisk, c.resume, err => {
      if (err) {
        console.error('Download error:', err);
        req.flash('error_msg', 'Could not download file');
        res.redirect(`/candidates/${req.params.id}`);
      }
    });
  } catch (err) {
    console.error('Resume download error:', err);
    req.flash('error_msg', 'Something went wrong');
    res.redirect(`/candidates/${req.params.id}`);
  }
};

// ─── 10) LIST CANDIDATES (SIMPLE) ───────────────────────────────────────────────
exports.listCandidates = async (req, res) => {
  const filter = {};
  if (req.query.serialRefNumber) {
    filter.serialRefNumber = Number(req.query.serialRefNumber); // Use Number for exact match
    // Or use regex for partial match:
    // filter.serialRefNumber = { $regex: req.query.serialRefNumber, $options: 'i' };
  }
  // Add other filters as needed

  const candidates = await Candidate.find(filter).lean();
  res.render('candidates/index', { candidates, filter, pagination });
};

// ─── 11) EXPORT CANDIDATES ─────────────────────────────────────────────────────
exports.exportCandidates = async (req, res) => {
  try {
    const { searchName, searchMobile, searchPosition, searchClient } = req.query;
    const filters = {};

    if (searchName)     filters.candidateName = new RegExp(searchName.trim(), 'i');
    if (searchMobile)   filters.mobile        = new RegExp(searchMobile.trim(), 'i');
    if (searchPosition) filters.position      = new RegExp(searchPosition.trim(), 'i');
    if (searchClient)   filters.client        = new RegExp(searchClient.trim(), 'i');

    const candidates = await Candidate.find(filters).lean();

    res.render('candidates/export', {
      candidates,
      filters,
      error_msg: req.flash('error_msg')
    });
  } catch (err) {
    req.flash('error_msg', 'Export failed');
    res.redirect('/candidates');
  }
};
