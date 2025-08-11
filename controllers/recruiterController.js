// backend/controllers/recruiterController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.createRecruiterForm = (req, res) => {
  res.render('admin/recruiters/new', { error: null });
};

exports.postCreateRecruiter = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // ensure unique
    if (await User.exists({ email })) {
      return res.render('admin/recruiters/new', { error: 'Email already in use.' });
    }
    // create recruiter
    const recruiter = new User({ username, email, password, role: 'recruiter' });
    await recruiter.save();
    req.flash('success_msg', 'Recruiter created successfully.');
    return res.redirect('/admin/recruiters');
  } catch (err) {
    console.error(err);
    return res.render('admin/recruiters/new', { error: 'Failed to create recruiter.' });
  }
};

exports.listRecruiters = async (req, res) => {
  const recruiters = await User.find({ role: 'recruiter' }).lean();
  res.render('admin/recruiters/index', { recruiters });
};
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Please log in to view this resource.');
  res.redirect('/login');
};
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Admins only.');
  res.redirect('/dashboard');
};

// deleteRecruiter
exports.deleteRecruiter = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Recruiter deleted successfully');
    res.redirect('/admin/recruiters');
  } catch (err) {
    req.flash('error_msg', 'Failed to delete recruiter');
    res.redirect('/admin/recruiters');
  }
};
//editRecruiterForm
exports.editRecruiterForm = async (req, res) => {
  const { id } = req.params;
  try {
    const recruiter = await User.findById(id).lean();
    if (!recruiter || recruiter.role !== 'recruiter') {
      req.flash('error_msg', 'Recruiter not found.');
      return res.redirect('/admin/recruiters');
    }
    res.render('admin/recruiters/edit', { recruiter });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to load recruiter.');
    res.redirect('/admin/recruiters');
  }
};
// updateRecruiter
exports.updateRecruiter = async (req, res) => {
  const { id } = req.params;
  const { username, email, password } = req.body;
  try {
    const recruiter = await User.findById(id);
    if (!recruiter || recruiter.role !== 'recruiter') {
      req.flash('error_msg', 'Recruiter not found.');
      return res.redirect('/admin/recruiters');
    }
    // Update fields
    recruiter.username = username;
    recruiter.email = email;
    if (password) {
      recruiter.password = bcrypt.hashSync(password, 10);
    }
    await recruiter.save();
    req.flash('success_msg', 'Recruiter updated successfully.');
    res.redirect('/admin/recruiters');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Failed to update recruiter.');
    res.redirect('/admin/recruiters');
  }
};