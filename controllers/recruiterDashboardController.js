const Candidate = require('../models/Candidate');
const mongoose = require('mongoose');

exports.renderSelfDashboard = async (req, res, next) => {
    try {
        const today = new Date();
        const defaultStart = new Date(today); defaultStart.setHours(0, 0, 0, 0);
        const defaultEnd = new Date(today); defaultEnd.setHours(23, 59, 59, 999);

        const allClients = await Candidate.distinct('client', { createdBy: req.user._id });

        res.render('recruiter/selfDashboard', {
            recruiter: req.user,
            defaultStart: defaultStart.toISOString().slice(0, 10),
            defaultEnd: defaultEnd.toISOString().slice(0, 10),
            allClients
        });
    } catch (err) {
        next(err);
    }
};

exports.getSelfDashboardData = async (req, res, next) => {
    try {
        const { startDate, endDate, client } = req.query;
        const start = startDate ? new Date(startDate) : new Date();
        start.setHours(0, 0, 0, 0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const filter = {
            createdBy: new mongoose.Types.ObjectId(req.user._id),
            createdAt: { $gte: start, $lte: end }
        };
        if (client) filter.client = client;

        // The rest is similar to getRecruiterPerformanceData in adminDashboardController.js
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

        const byDay = byDayAgg.map(day => {
            const clientsObj = {};
            (day.clients || []).forEach(c => { clientsObj[c.client] = c.selected; });
            return { _id: day._id, calls: day.calls, selected: day.selected, clients: clientsObj };
        });

        res.json({
            ok: true,
            totalCalls,
            clientCalls,
            selectedCount,
            clientSelected,
            offersMade,
            dropouts,
            conversionRate: Number(conversionRate.toFixed(2)),
            byDay
        });
    } catch (err) {
        console.error('Error in getSelfDashboardData:', err);
        res.status(500).json({ ok: false, message: 'Server error' });
    }
};