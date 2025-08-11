// // backend/routes/profile.js
// const express               = require('express');
// const router                = express.Router();
// const upload                = require('../config/multer');
// const profileController     = require('../controllers/profileController');
// const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// // Show the profile edit form
// router.get(
//   '/profile',
//   ensureAuthenticated,
//   profileController.getProfile
// );

// // Handle profile updates (text fields + avatar upload)
// router.post(
//   '/profile',
//   ensureAuthenticated,
//   upload.single('avatar'),        // expects <input name="avatar" type="file">
//   profileController.postProfile
// );

// module.exports = router;

// // backend/routes/profile.js
// const express                 = require('express');
// const router                  = express.Router();
// const avatarUpload            = require('../config/avatarMulter');
// const profileController       = require('../controllers/profileController');
// const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// router.get('/', ensureAuthenticated, profileController.getProfile);

// // Handle profile updates (text fields + avatar upload)
// router.post(
//   '/',
//   ensureAuthenticated,
//   avatarUpload.single('avatar'),
//   profileController.postProfile
// );

// module.exports = router;

// backend/routes/profile.js

const express = require('express');
const router = express.Router();
const upload = require('../config/multerCloudinary'); // ✅ Use Cloudinary config here
const profileController = require('../controllers/profileController');
const { ensureAuthenticated } = require('../middlewares/authMiddleware');

// GET profile page
router.get('/', ensureAuthenticated, profileController.getProfile);

// POST update profile (text + avatar)
router.post(
  '/',
  ensureAuthenticated,
  upload.single('avatar'), // ✅ avatar will go to Cloudinary (folder: avatars/)
  profileController.postProfile
);

module.exports = router;
