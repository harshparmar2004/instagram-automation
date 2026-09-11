const { getDb } = require('../database');

/**
 * Discovers all available years and months across media, events, and saved history.
 */
function getAvailableCalendarPeriods(userId = null) {
    const db = getDb();
    const currentIso = new Date().toISOString();
    const currentMonth = currentIso.slice(0, 7); // e.g. "2026-09"
    const currentYear = parseInt(currentIso.slice(0, 4), 10);

    const userEventFilter = userId ? ' WHERE (user_id = ? OR user_id IS NULL)' : '';
    const userMediaFilter = userId ? ' WHERE (user_id = ? OR user_id IS NULL)' : '';
    const userHistoryFilter = userId ? ' WHERE (user_id = ? OR user_id IS NULL)' : '';
    const params = userId ? [userId] : [];

    // Find all distinct months from media, events, and reel_stats_history
    const monthSet = new Set([currentMonth]);

    try {
        const mediaMonths = db.prepare(`SELECT DISTINCT substr(timestamp, 1, 7) as m FROM media ${userMediaFilter}`).all(...params);
        mediaMonths.forEach(row => { if (row.m && /^\d{4}-\d{2}$/.test(row.m)) monthSet.add(row.m); });

        const eventMonths = db.prepare(`SELECT DISTINCT substr(created_at, 1, 7) as m FROM events ${userEventFilter}`).all(...params);
        eventMonths.forEach(row => { if (row.m && /^\d{4}-\d{2}$/.test(row.m)) monthSet.add(row.m); });

        const historyMonths = db.prepare(`SELECT DISTINCT month_year as m FROM reel_stats_history ${userHistoryFilter}`).all(...params);
        historyMonths.forEach(row => { if (row.m && /^\d{4}-\d{2}$/.test(row.m)) monthSet.add(row.m); });
    } catch (e) {
        console.warn('[HistoryStorage] Error discovering calendar months:', e.message);
    }

    // Determine year range
    const allYears = Array.from(monthSet).map(m => parseInt(m.slice(0, 4), 10)).filter(y => !isNaN(y));
    const minYear = allYears.length > 0 ? Math.min(...allYears, currentYear) : currentYear;
    const maxYear = currentYear;

    const years = [];
    for (let y = maxYear; y >= minYear; y--) {
        years.push(y);
    }

    // Precompute stats per month for quick calendar badge indicators
    const monthStatsMap = new Map();
    try {
        const historyRows = db.prepare(`
            SELECT month_year, 
                   SUM(views_count) as total_views, 
                   SUM(comments_count) as total_comments, 
                   SUM(dms_sent_count) as total_dms, 
                   SUM(clicks_count) as total_clicks
            FROM reel_stats_history
            ${userHistoryFilter}
            GROUP BY month_year
        `).all(...params);

        historyRows.forEach(row => {
            if (row.month_year) {
                monthStatsMap.set(row.month_year, {
                    views: row.total_views || 0,
                    comments: row.total_comments || 0,
                    dms: row.total_dms || 0,
                    clicks: row.total_clicks || 0
                });
            }
        });

        // Also check events directly for any month not yet frozen in history
        const eventRows = db.prepare(`
            SELECT substr(created_at, 1, 7) as m,
                   COUNT(*) as comments,
                   SUM(CASE WHEN dm_status IN ('sent', 'delivered') THEN 1 ELSE 0 END) as dms
            FROM events
            ${userEventFilter}
            GROUP BY substr(created_at, 1, 7)
        `).all(...params);

        eventRows.forEach(row => {
            if (row.m) {
                const existing = monthStatsMap.get(row.m) || { views: 0, comments: 0, dms: 0, clicks: 0 };
                existing.comments = Math.max(existing.comments, row.comments || 0);
                existing.dms = Math.max(existing.dms, row.dms || 0);
                monthStatsMap.set(row.m, existing);
            }
        });
    } catch (e) {
        console.warn('[HistoryStorage] Error precomputing month stats:', e.message);
    }

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const calendarByYear = {};

    years.forEach(year => {
        calendarByYear[year] = [];
        for (let m = 1; m <= 12; m++) {
            const mStr = String(m).padStart(2, '0');
            const periodKey = `${year}-${mStr}`;
            const isCurrent = (periodKey === currentMonth);
            const isFuture = (periodKey > currentMonth);
            const stats = monthStatsMap.get(periodKey) || { views: 0, comments: 0, dms: 0, clicks: 0 };
            const hasData = monthSet.has(periodKey) || stats.dms > 0 || stats.views > 0 || stats.comments > 0;

            calendarByYear[year].push({
                period: periodKey,
                monthNum: m,
                monthName: monthNames[m - 1],
                shortName: monthNames[m - 1].slice(0, 3),
                year,
                isCurrent,
                isFuture,
                hasData,
                dms: stats.dms,
                views: stats.views,
                clicks: stats.clicks
            });
        }
    });

    return {
        currentMonth,
        currentYear,
        years,
        calendarByYear
    };
}

/**
 * Retrieves full metrics and reel breakdown for a specific month (YYYY-MM).
 * Automatically snapshots current or unarchived months into reel_stats_history.
 */
function getMonthHistoryData(period, userId = null) {
    const db = getDb();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const targetPeriod = (period && /^\d{4}-\d{2}$/.test(period)) ? period : currentMonth;
    const isCurrent = (targetPeriod === currentMonth);

    const userMediaFilter = userId ? ' WHERE (m.user_id = ? OR m.user_id IS NULL)' : '';
    const userEventFilter = userId ? ' AND (e.user_id = ? OR e.user_id IS NULL)' : '';
    const params = userId ? [userId] : [];

    // 1. Fetch all media from DB (including deleted ones so history is never lost)
    let allMedia = db.prepare(`SELECT m.* FROM media m ${userMediaFilter} ORDER BY m.timestamp DESC`).all(...params);

    // 2. Fetch any saved snapshots in reel_stats_history for this month
    const historyRows = db.prepare(`
        SELECT * FROM reel_stats_history 
        WHERE month_year = ? ${userId ? 'AND (user_id = ? OR user_id IS NULL)' : ''}
    `).all(targetPeriod, ...(userId ? [userId] : []));

    const historyMap = new Map();
    historyRows.forEach(h => historyMap.set(h.media_id, h));

    // 3. Aggregate live event counts for this target period
    const eventsStmt = db.prepare(`
        SELECT media_ig_id,
               COUNT(*) as total_comments,
               SUM(CASE WHEN dm_status IN ('sent', 'delivered') THEN 1 ELSE 0 END) as dms_sent
        FROM events e
        WHERE substr(created_at, 1, 7) = ? ${userEventFilter}
        GROUP BY media_ig_id
    `);
    const eventStats = eventsStmt.all(targetPeriod, ...(userId ? [userId] : []));
    const eventMap = new Map();
    eventStats.forEach(ev => {
        if (ev.media_ig_id) eventMap.set(String(ev.media_ig_id), ev);
    });

    // 4. Aggregate live click counts for this target period
    const clicksStmt = db.prepare(`
        SELECT e.media_ig_id, COUNT(*) as click_count
        FROM clicks c
        JOIN events e ON c.event_id = e.id
        WHERE (substr(c.clicked_at, 1, 7) = ? OR substr(e.created_at, 1, 7) = ?)
        ${userEventFilter}
        GROUP BY e.media_ig_id
    `);
    const clickStats = clicksStmt.all(targetPeriod, targetPeriod, ...(userId ? [userId] : []));
    const clickMap = new Map();
    clickStats.forEach(cl => {
        if (cl.media_ig_id) clickMap.set(String(cl.media_ig_id), cl.click_count);
    });

    // 5. Build reels breakdown for the target month
    const reelsBreakdown = [];
    const upsertStmt = db.prepare(`
        INSERT INTO reel_stats_history (media_id, month_year, views_count, comments_count, dms_sent_count, clicks_count, updated_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(media_id, month_year) DO UPDATE SET 
            views_count = CASE WHEN excluded.views_count > 0 THEN excluded.views_count ELSE reel_stats_history.views_count END,
            comments_count = CASE WHEN excluded.comments_count > 0 THEN excluded.comments_count ELSE reel_stats_history.comments_count END,
            dms_sent_count = CASE WHEN excluded.dms_sent_count > 0 THEN excluded.dms_sent_count ELSE reel_stats_history.dms_sent_count END,
            clicks_count = CASE WHEN excluded.clicks_count > 0 THEN excluded.clicks_count ELSE reel_stats_history.clicks_count END,
            updated_at = excluded.updated_at
    `);

    for (const m of allMedia) {
        const saved = historyMap.get(m.id);
        const ev = eventMap.get(String(m.ig_media_id)) || {};
        const clCount = clickMap.get(String(m.ig_media_id)) || 0;

        const mediaMonth = (m.timestamp || '').slice(0, 7);
        const existsInMonth = (mediaMonth === targetPeriod || (saved && (saved.views_count > 0 || saved.dms_sent_count > 0)) || (ev.total_comments > 0 || ev.dms_sent > 0 || clCount > 0));

        let views = 0;
        let comments = 0;
        let dms = 0;
        let clicks = 0;

        if (isCurrent) {
            views = m.views_count || (saved ? saved.views_count : 0) || 0;
            comments = Math.max(m.comments_count || 0, ev.total_comments || 0, (saved ? saved.comments_count : 0));
            dms = Math.max(ev.dms_sent || 0, (saved ? saved.dms_sent_count : 0));
            clicks = Math.max(clCount || 0, (saved ? saved.clicks_count : 0));

            // Continuously seal/update live month snapshot in reel_stats_history
            try {
                upsertStmt.run(m.id, targetPeriod, views, comments, dms, clicks, new Date().toISOString(), userId || m.user_id || 1);
            } catch (snapErr) {}
        } else {
            // Archived / past month
            if (saved) {
                views = saved.views_count || 0;
                comments = saved.comments_count || 0;
                dms = saved.dms_sent_count || 0;
                clicks = saved.clicks_count || 0;
            } else if (existsInMonth) {
                // Media was published or had events in that past month, create baseline snapshot
                views = m.views_count || 0;
                comments = ev.total_comments || m.comments_count || 0;
                dms = ev.dms_sent || 0;
                clicks = clCount || 0;

                try {
                    upsertStmt.run(m.id, targetPeriod, views, comments, dms, clicks, new Date().toISOString(), userId || m.user_id || 1);
                } catch (snapErr) {}
            }
        }

        // Only include in breakdown if reel was relevant to that month
        // (For current month, include all active and deleted media; for past month, include if existed in that month)
        if (isCurrent || existsInMonth) {
            const ctr = dms > 0 ? Math.min(100, Math.round((clicks / dms) * 100)) : 0;
            reelsBreakdown.push({
                id: m.id,
                ig_media_id: m.ig_media_id,
                caption: m.caption || 'Instagram Post',
                media_type: m.media_type,
                media_product_type: m.media_product_type,
                thumbnail_url: m.thumbnail_url || m.media_url || '',
                permalink: m.permalink || '',
                timestamp: m.timestamp,
                status: m.status || 'active',
                views_count: views,
                comments_count: comments,
                dms_sent: dms,
                clicks: clicks,
                ctr: ctr
            });
        }
    }

    // Top Summary Totals
    const totalViews = reelsBreakdown.reduce((acc, r) => acc + (r.views_count || 0), 0);
    const totalComments = reelsBreakdown.reduce((acc, r) => acc + (r.comments_count || 0), 0);
    const totalDms = reelsBreakdown.reduce((acc, r) => acc + (r.dms_sent || 0), 0);
    const totalClicks = reelsBreakdown.reduce((acc, r) => acc + (r.clicks || 0), 0);
    const overallCtr = totalDms > 0 ? Math.min(100, Math.round((totalClicks / totalDms) * 100)) : 0;

    // Format human-readable period title (e.g. "September 2026")
    const [y, m] = targetPeriod.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    const periodTitle = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    return {
        period: targetPeriod,
        periodTitle,
        year: parseInt(y, 10),
        month: parseInt(m, 10),
        isCurrentMonth: isCurrent,
        isArchived: !isCurrent,
        summary: {
            totalViews,
            totalComments,
            totalDms,
            totalClicks,
            overallCtr
        },
        reels: reelsBreakdown
    };
}

module.exports = {
    getAvailableCalendarPeriods,
    getMonthHistoryData
};
