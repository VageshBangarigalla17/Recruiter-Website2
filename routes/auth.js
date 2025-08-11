// backend/routes/auth.js

const express  = require('express');
const passport = require('passport');
const router   = express.Router();

const authController      = require('../controllers/authController');
const { ensureAuthenticated, forwardAuthenticated } = require('../middlewares/authMiddleware');

// // ─── Registration ────────────────────────────────────────────────────────────────
// router.get('/register', forwardAuthenticated, authController.getRegister);
// router.post('/register', authController.postRegister);

// ─── Local Login ─────────────────────────────────────────────────────────────────
router.get('/login', forwardAuthenticated, authController.getLogin);
router.post('/login', authController.postLogin);

// ─── Forgot Password (Form) ───────────────────────────────────────────────────────
router.get('/forgot-password', forwardAuthenticated, (req, res) => {
  res.render('auth/forgot-password', {
    success_msg: req.flash('success_msg'),
    error_msg:   req.flash('error_msg')
  });
});
// ─── Forgot Password (POST) ──────────────────────────────────────────────────────
router.post('/forgot-password', authController.forgotPassword);

// ─── Change Password ──────────────────────────────────────────────────────────────
router.get(
  '/change-password',
  ensureAuthenticated,
  authController.getChangePassword
);
router.post(
  '/change-password',
  ensureAuthenticated,
  authController.postChangePassword
);

// ─── Logout ───────────────────────────────────────────────────────────────────────
router.post('/logout', authController.logout);

// // ─── Google OAuth ─────────────────────────────────────────────────────────────────
// router.get('/auth/google',
//   forwardAuthenticated,
//   passport.authenticate('google', { scope: ['profile', 'email'] })
// );

// router.get('/auth/google/callback',
//   passport.authenticate('google', {
//     successRedirect: '/dashboard',
//     failureRedirect: '/login',
//     failureFlash: true
//   })
// );

// ─── Example Passport Configuration (Uncomment and Modify as Needed) ────────────────
// passport.use(new GoogleStrategy({
//   // ... your config ...
// }, async (accessToken, refreshToken, profile, done) => {
//   let user = await User.findOne({ googleId: profile.id });
//   if (!user) {
//     user = await User.create({
//       googleId: profile.id,
//       email: profile.emails[0].value,
//       fullName: profile.displayName,
//       avatar: profile.photos[0].value,
//       // Set a default role here:
//       role: 'Employee' // or 'Admin' if you want Google users to be admins
//     });
//   }
//   return done(null, user);
// }));

module.exports = router;
