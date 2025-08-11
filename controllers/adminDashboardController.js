// backend/controllers/adminDashboardController.js
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Parse a pair of date strings (YYYY-MM-DD) to start/end Date objects.
 */
function parseDateRange(startStr, endStr) {
  const start = startStr ? new Date(startStr) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = endStr ? new Date(endStr) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Render the admin dashboard (initial page load).
 */
exports.renderAdminDashboard = async (req, res, next) => {
  try {
    const [totalCandidates, totalRecruiters] = await Promise.all([
      Candidate.countDocuments(),
      User.countDocuments({ role: 'recruiter' })
    ]);

    // Open positions = distinct position names where finalStatus is not Offered/Yet to Join
    const openPositionsArr = await Candidate.distinct('position', {
      $or: [
        { finalStatus: { $exists: false } },
        { finalStatus: null },
        { finalStatus: { $nin: ['Offered', 'Yet to Join'] } }
      ]
    });
    const openPositions = openPositionsArr.length;

    // Load recruiters for selection and live card list
    const recruiters = await User.find({ role: 'recruiter' })
      .select('_id username')
      .lean();

    // Today's calls per recruiter (map recruiterId -> calls)
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const callsTodayAgg = await Candidate.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: '$createdBy', calls: { $sum: 1 } } }
    ]);
    const callsTodayMap = {};
    callsTodayAgg.forEach(r => {
      if (r._id) callsTodayMap[r._id.toString()] = r.calls;
    });

    // All clients (used to build the daily trend table columns)
    const allClients = await Candidate.distinct('client');

    res.render('admin/dashboard', {
      totalCandidates,
      totalRecruiters,
      openPositions,
      recruiters,
      callsTodayMap,
      defaultStart: todayStart.toISOString().slice(0, 10),
      defaultEnd: todayEnd.toISOString().slice(0, 10),
      user: req.user,
      allClients
    });
  } catch (err) {
    next(err);
  }
};


/**
 * Returns aggregated JSON for dashboard charts / table filtered by
 * optional recruiterId and date range.
 *
 * Query string:
 *  - recruiterId (optional)
 *  - startDate (YYYY-MM-DD)
 *  - endDate   (YYYY-MM-DD)
 */
exports.getAdminData = async (req, res, next) => {
  try {
    const { recruiterId, startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    // Base match: date range
    let match = { createdAt: { $gte: start, $lte: end } };

    if (recruiterId && recruiterId !== 'admin') {
      match.createdBy = new mongoose.Types.ObjectId(recruiterId);
    } else if (recruiterId === 'admin') {
      match.createdBy = new mongoose.Types.ObjectId('688c83f1cb40ca2c42512b80');
    }

    const totalCalls = await Candidate.countDocuments(match);

    // Parallel aggregates
    const [
      clientCalls,
      selectedCount,
      clientSelected,
      offersMade,
      dropouts
    ] = await Promise.all([
      Candidate.aggregate([
        { $match: match },
        { $group: { _id: '$client', calls: { $sum: 1 } } },
        { $sort: { calls: -1 } },
        { $limit: 50 }
      ]),
      Candidate.countDocuments({ ...match, hrStatus: 'Select' }),
      Candidate.aggregate([
        { $match: { ...match, hrStatus: 'Select' } },
        { $group: { _id: '$client', selected: { $sum: 1 } } },
        { $sort: { selected: -1 } },
        { $limit: 50 }
      ]),
      Candidate.countDocuments({ ...match, finalStatus: { $in: ['Offer in Progress', 'Offered'] } }),
      Candidate.countDocuments({ ...match, finalStatus: { $in: ['Shortlist Dropout', 'Offer Dropout', 'Joining Dropout'] } })
    ]);

    const conversionRate = totalCalls ? (offersMade / totalCalls) * 100 : 0;

    // By-day aggregated structure with clients counts embedded
    const byDayAgg = await Candidate.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
            client: "$client"
          },
          calls: { $sum: 1 },
          selected: { $sum: { $cond: [{ $eq: ['$hrStatus', 'Select'] }, 1, 0] } }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          calls: { $sum: "$calls" },
          selected: { $sum: "$selected" },
          clients: {
            $push: { client: "$_id.client", selected: "$selected" }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Convert clients array into object map per day for faster front-end lookup
    const byDay = byDayAgg.map(day => {
      const clientsObj = {};
      (day.clients || []).forEach(c => {
        clientsObj[c.client] = c.selected;
      });
      return {
        _id: day._id,
        calls: day.calls,
        selected: day.selected,
        clients: clientsObj
      };
    });

    const allClients = await Candidate.distinct('client', match);

    res.json({
      ok: true,
      totalCalls,
      clientCalls,
      selectedCount,
      clientSelected,
      offersMade,
      dropouts,
      conversionRate: Number(conversionRate.toFixed(2)),
      allClients,
      byDay
    });
  } catch (err) {
    console.error('Error in getAdminData:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};


/**
 * Render single recruiter's performance page.
 */
exports.renderRecruiterPerformance = async (req, res, next) => {
  try {
    const recruiter = await User.findById(req.params.id).select('username').lean();
    if (!recruiter) return res.status(404).send('Recruiter not found');

    const today = new Date();
    const defaultStart = new Date(today); defaultStart.setHours(0, 0, 0, 0);
    const defaultEnd = new Date(today); defaultEnd.setHours(23, 59, 59, 999);

    const allClients = await Candidate.distinct('client', { createdBy: recruiter._id });

    res.render('admin/recruiterPerformance', {
      recruiter,
      defaultStart: defaultStart.toISOString().slice(0, 10),
      defaultEnd: defaultEnd.toISOString().slice(0, 10),
      user: req.user,
      allClients
    });
  } catch (err) {
    next(err);
  }
};


/**
 * Get single recruiter's aggregated JSON data (calls, selected, by-day).
 */
exports.getRecruiterPerformanceData = async (req, res, next) => {
  try {
    const { startDate, endDate, client } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    const filter = {
      createdBy: new mongoose.Types.ObjectId(req.params.id),
      createdAt: { $gte: start, $lte: end }
    };
    if (client) filter.client = client;

    const totalCalls = await Candidate.countDocuments(filter);
    const [
      clientCalls,
      selectedCount,
      clientSelected,
      offersMade,
      dropouts
    ] = await Promise.all([
      Candidate.aggregate([
        { $match: filter },
        { $group: { _id: '$client', calls: { $sum: 1 } } },
        { $sort: { calls: -1 } },
        { $limit: 50 }
      ]),
      Candidate.countDocuments({ ...filter, hrStatus: 'Select' }),
      Candidate.aggregate([
        { $match: { ...filter, hrStatus: 'Select' } },
        { $group: { _id: '$client', selected: { $sum: 1 } } },
        { $sort: { selected: -1 } },
        { $limit: 50 }
      ]),
      Candidate.countDocuments({ ...filter, finalStatus: { $in: ['Offer in Progress', 'Offered'] } }),
      Candidate.countDocuments({ ...filter, finalStatus: { $in: ['Shortlist Dropout', 'Offer Dropout', 'Joining Dropout'] } })
    ]);

    const conversionRate = totalCalls ? (offersMade / totalCalls) * 100 : 0;

    const byDayAgg = await Candidate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, client: "$client" },
          calls: { $sum: 1 },
          selected: { $sum: { $cond: [{ $eq: ['$hrStatus', 'Select'] }, 1, 0] } }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          calls: { $sum: "$calls" },
          selected: { $sum: "$selected" },
          clients: { $push: { client: "$_id.client", selected: "$selected" } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // convert to map per-day clients
    const byDay = byDayAgg.map(day => {
      const clientsObj = {};
      (day.clients || []).forEach(c => { clientsObj[c.client] = c.selected; });
      return { _id: day._id, calls: day.calls, selected: day.selected, clients: clientsObj };
    });

    const allClients = (await Candidate.distinct('client', filter)).sort();

    res.json({
      ok: true,
      totalCalls,
      clientCalls,
      selectedCount,
      clientSelected,
      offersMade,
      dropouts,
      conversionRate: Number(conversionRate.toFixed(2)),
      byDay,
      allClients
    });
  } catch (err) {
    console.error('Error in getRecruiterPerformanceData:', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
};
