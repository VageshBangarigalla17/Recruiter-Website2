// backend/models/User.js
const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  // for Google OAuth users
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  // updated roles: admin, recruiter, employee
  role: {
    type: String,
    enum: ['admin', 'recruiter', 'employee'],
    default: 'employee'
  },

  // ── Profile fields ─────────────────────────────────────────────────────────
  fullName: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // store a URL or path to their avatar image
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },

  // ── Forgot Password fields ────────────────────────────────────────────────
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  }
}, { timestamps: true });


// 🔐 Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ✅ Compare password helper
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
