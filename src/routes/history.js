const express = require('express');
const auth = require('../middleware/auth');
const { getAvailableCalendarPeriods, getMonthHistoryData } = require('../services/historyStorage');

const router = express.Router();

/**
 * GET /api/history/calendar
 * Returns available years and all 12 calendar months with indicators for past/current/future and data presence.
 */
router.get('/history/calendar', auth, (req, res) => {
    try {
        const userId = req.user?.id;
        const isSuperAdmin = req.user?.role === 'super_admin' && !req.isImpersonating;
        const result = getAvailableCalendarPeriods(isSuperAdmin ? null : userId);
        res.json(result);
    } catch (err) {
        console.error('[HistoryRoute] Error fetching calendar periods:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/history/month?period=YYYY-MM
 * Returns detailed KPIs, conversion rates, and full reel breakdown for a specific month.
 */
router.get('/history/month', auth, (req, res) => {
    try {
        const { period } = req.query;
        const userId = req.user?.id;
        const isSuperAdmin = req.user?.role === 'super_admin' && !req.isImpersonating;
        const result = getMonthHistoryData(period, isSuperAdmin ? null : userId);
        res.json(result);
    } catch (err) {
        console.error('[HistoryRoute] Error fetching month data:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/history/snapshot
 * Forces/seals a monthly snapshot in SQLite reel_stats_history.
 */
router.post('/history/snapshot', auth, (req, res) => {
    try {
        const period = req.body?.period || new Date().toISOString().slice(0, 7);
        const userId = req.user?.id;
        const isSuperAdmin = req.user?.role === 'super_admin' && !req.isImpersonating;
        const result = getMonthHistoryData(period, isSuperAdmin ? null : userId);
        res.json({ success: true, period, snapshot: result });
    } catch (err) {
        console.error('[HistoryRoute] Error saving monthly snapshot:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
