const multer  = require('multer');
const path    = require('path');

// store in memory or disk as you prefer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/avatars');
  },
  filename: (req, file, cb) => {
    const name = Date.now() + '-' + file.originalname;
    cb(null, name);
  }
});

function avatarFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (.jpg, .jpeg, .png, .gif)'));
  }
}

const avatarUpload = multer({ storage, fileFilter: avatarFileFilter });

module.exports = avatarUpload;
