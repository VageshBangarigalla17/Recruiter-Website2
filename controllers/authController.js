// controllers/authController.js
const crypto = require('crypto');
const User = require('../models/User');
// const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Registration
// exports.getRegister = (req, res) => {
//   res.render('auth/register', { error: null });
// };

// exports.postRegister = async (req, res) => {
//   const { username, email, password, role } = req.body;
//   try {
//     if (await User.findOne({ $or: [{ email }, { username }] })) {
//       return res.render('auth/register', { error: 'Email or username exists.' });
//     }
//     const user = new User({ username, email, password, role });
//     await user.save();
//     res.redirect('/login');
//   } catch (err) {
//     console.error(err);
//     res.render('auth/register', { error: 'Registration failed.' });
//   }
// };

// Login
exports.getLogin = (req, res) => {
  res.render('auth/login', { error: null });
};

exports.postLogin = async (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
};

// Change Password
exports.getChangePassword = (req, res) => {
  res.render('auth/change-password', { error: null, success: null });
};

exports.postChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.render('auth/change-password', {
        error: 'All fields are required.',
        success: null
      });
    }
    if (newPassword !== confirmPassword) {
      return res.render('auth/change-password', {
        error: 'New passwords do not match.',
        success: null
      });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.render('auth/change-password', {
        error: 'User not found.',
        success: null
      });
    }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.render('auth/change-password', {
        error: 'Current password is incorrect.',
        success: null
      });
    }
    user.password = newPassword;
    await user.save();
    return res.render('auth/change-password', {
      error: null,
      success: 'Password changed successfully!'
    });
  } catch (err) {
    console.error('Change Password Error:', err);
    return res.render('auth/change-password', {
      error: 'Something went wrong. Please try again.',
      success: null
    });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error_msg', 'No account with that email found.');
      return res.redirect('/forgot-password');
    }
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `http://localhost:3000/reset-password/${token}`;
    await sendEmail(
      user.email,
      'Password Reset Request',
      `<p>You requested a password reset.</p>
       <p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>`
    );

    req.flash('success_msg', 'Password reset link sent to your email.');
    res.redirect('/forgot-password');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Error sending reset email.');
    res.redirect('/forgot-password');
  }
};

// Logout
exports.logout = (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });
};