// backend/config/multer.js
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');

// Ensure upload folder exists
const UPLOAD_DIR = path.join(__dirname, '../public/uploads/resumes');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage config…
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

function fileFilter (req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf' || ext === '.docx') {
    cb(null, true);
  } else {
    cb(new Error('Only .pdf and .docx allowed'), false);
  }
}

module.exports = multer({ storage, fileFilter });
