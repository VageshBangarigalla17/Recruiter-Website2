// backend/app.js

require('dotenv').config();
const cloudinary = require('./config/cloudinary');
console.log('Cloudinary config OK?', cloudinary.config().cloud_name);

const express        = require('express');
const path           = require('path');
const connectDB      = require('./config/db');
const session        = require('express-session');
const MongoStore     = require('connect-mongo');
const passport       = require('passport');
const methodOverride = require('method-override');
const flash          = require('connect-flash');
const User           = require('./models/User');
const Candidate      = require('./models/candidate');
const fetch          = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// ─── Connect to MongoDB ─────────────────────────────────────────────────────
connectDB();

// ─── Passport Strategies ────────────────────────────────────────────────────
require('./config/passport')();

const app = express();

// ─── Body Parsers ───────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static + Method Override ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ─── View Engine ───────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Session + Flash ───────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'hrms_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg   = req.flash('error_msg');
  next();
});

// ─── Passport Init ──────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── Make `user` Available in ALL Views ────────────────────────────────────
app.use(async (req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.user = req.user;
  } else if (req.session?.user?.id) {
    try {
      const user = await User.findById(req.session.user.id);
      if (user) {
        req.user = user;
        res.locals.user = user;
      }
    } catch (err) {
      console.error('Session user load error:', err);
    }
  } else {
    res.locals.user = null;
  }
  next();
});

const { ensureAuthenticated } = require('./middlewares/authMiddleware');

// ─── Auth Routes ───────────────────────────────────────────────────────────
app.use('/', require('./routes/auth'));

// ─── Landing Page ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.isAuthenticated() || (req.session && req.session.user)) {
    return res.redirect('/dashboard');
  }
  res.render('home');
});

// ─── Dashboard View ────────────────────────────────────────────────────────
app.get('/dashboard', ensureAuthenticated, async (req, res, next) => {
  try {
    const recruiters = await User.find({ role: 'recruiter' }, '_id username').lean();
    res.render('dashboard', { recruiters, user: req.user });
  } catch (err) {
    next(err);
  }
});

// ─── Dashboard API (Live Data) ─────────────────────────────────────────────
app.get('/api/dashboard-stats', ensureAuthenticated, async (req, res) => {
  try {
    const { recruiterId, date } = req.query;
    const filter = {};
    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
    if (recruiterId) filter.createdBy = recruiterId;

    const totalCalls = await Candidate.countDocuments(filter);
    const totalSelected = await Candidate.countDocuments({ ...filter, hrStatus: 'Select' });

    // Group by recruiter and join with User
    const recruiterCalls = await Candidate.aggregate([
      { $match: filter },
      { $group: { _id: '$createdBy', calls: { $sum: 1 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'recruiter'
        }
      },
      { $unwind: { path: '$recruiter', preserveNullAndEmptyArrays: true } }
    ]);

    // Client-wise calls
    const clientCalls = await Candidate.aggregate([
      { $match: filter },
      { $group: { _id: '$client', calls: { $sum: 1 } } },
      { $sort: { calls: -1 } }
    ]);

    res.json({
      totalCalls,
      totalSelected,
      recruiterCalls,
      clientCalls
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Admin Routes ──────────────────────────────────────────────────────────
app.use('/admin/recruiters', require('./routes/admin/recruiters'));
app.use('/admin/dashboard', require('./routes/admin/dashboard'));

// ─── Candidates Routes ─────────────────────────────────────────────────────
app.use('/candidates', ensureAuthenticated, require('./routes/candidates'));
app.use('/profile', require('./routes/profile'));

// ─── Recruiter Routes ──────────────────────────────────────────────────────
app.use('/recruiter', require('./routes/recruiter/dashboard'));

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404');
});

// ─── Socket.IO Server ──────────────────────────────────────────────────────
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('io', io);

const PORT = process.env.PORT || 3000;

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('requestStats', async (filters) => {
    try {
      const { recruiterId, date } = filters;
      const resApi = await fetch(`http://localhost:${PORT}/api/dashboard-stats?recruiterId=${recruiterId || ''}&date=${date || ''}`);
      const data = await resApi.json();
      socket.emit('statsUpdate', data);
    } catch (err) {
      console.error('Socket stats fetch error', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
