// backend/controllers/profileController.js
const User = require('../models/User');

exports.getProfile = (req, res) => {
  res.render('auth/profile', {
    user: req.user,
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg')
  });
};

exports.postProfile = async (req, res) => {
  try {
    const user = req.user;

    // ✅ Save avatar Cloudinary URL if uploaded
    if (req.file && req.file.path) {
      user.avatar = req.file.path; // Cloudinary stores direct URL in file.path
    }

    user.fullName = req.body.fullName || '';
    user.phone    = req.body.phone    || '';
    
    await user.save();

    req.flash('success_msg', 'Profile updated successfully.');
    res.redirect('/profile');
  } catch (err) {
    console.error('Profile update error:', err);
    req.flash('error_msg', 'Failed to update profile.');
    res.redirect('/profile');
  }
};
