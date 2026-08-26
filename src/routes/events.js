const express = require('express');
const { getDb } = require('../database');
const auth = require('../middleware/auth');
const { getQueueDepth } = require('../services/queue');

const router = express.Router();

router.get('/events', auth, (req, res) => {
    try {
        const db = getDb();
        const { page = 1, limit = 20, rule_id, media_id, status, search } = req.query;
        
        const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
        
        let query = `
            SELECT e.*, r.trigger_keyword, r.action_type, r.response_text as rule_response,
                   m.caption as media_caption, m.thumbnail_url as media_thumbnail
            FROM events e
            LEFT JOIN rules r ON e.rule_id = r.id
            LEFT JOIN media m ON e.media_ig_id = m.ig_media_id
            WHERE 1=1
        `;
        const params = [];

        if (rule_id) {
            query += ' AND e.rule_id = ?';
            params.push(rule_id);
        }
        if (media_id) {
            query += ' AND m.id = ?';
            params.push(media_id);
        }
        if (status) {
            query += ' AND e.dm_status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND (e.commenter_username LIKE ? OR e.comment_text LIKE ? OR r.trigger_keyword LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        const countQuery = query.replace(/SELECT e\.\*.*?FROM/s, 'SELECT COUNT(*) as total FROM');
        const total = db.prepare(countQuery).get(...params).total;

        query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const rawEvents = db.prepare(query).all(...params);
        const clickStmt = db.prepare('SELECT COUNT(*) as count FROM clicks WHERE tracking_id = ?');

        const events = rawEvents.map(ev => {
            const hasClicks = ev.tracking_id ? clickStmt.get(ev.tracking_id).count > 0 : false;
            
            let action_taken = 'Sent DM';
            if (ev.action_type === 'link_dm') action_taken = 'Sent Link';
            if (ev.action_type === 'follow_first') action_taken = 'Asked to Follow';

            return {
                id: ev.id,
                username: ev.commenter_username,
                comment_text: ev.comment_text,
                trigger_word: ev.trigger_keyword || '',
                action_type: ev.action_type,
                action_taken,
                status: ev.dm_status,
                link_clicked: hasClicks,
                media_caption: ev.media_caption,
                media_thumbnail: ev.media_thumbnail,
                created_at: ev.created_at
            };
        });

        res.json({
            events,
            total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error('[Events] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/events/export', auth, (req, res) => {
    try {
        const db = getDb();
        const rawEvents = db.prepare(`
            SELECT e.id, e.commenter_username, e.comment_text, r.trigger_keyword, r.action_type, e.dm_status, e.tracking_id, e.created_at
            FROM events e
            LEFT JOIN rules r ON e.rule_id = r.id
            ORDER BY e.created_at DESC
        `).all();

        const clickStmt = db.prepare('SELECT COUNT(*) as count FROM clicks WHERE tracking_id = ?');

        let csv = 'ID,Username,Comment Text,Trigger Keyword,Action Type,Status,Clicked Link,Created At\n';
        for (const ev of rawEvents) {
            const hasClicked = ev.tracking_id ? (clickStmt.get(ev.tracking_id).count > 0 ? 'Yes' : 'No') : 'N/A';
            const username = `"${(ev.commenter_username || '').replace(/"/g, '""')}"`;
            const comment = `"${(ev.comment_text || '').replace(/"/g, '""')}"`;
            const trigger = `"${(ev.trigger_keyword || '').replace(/"/g, '""')}"`;
            const action = `"${(ev.action_type || '').replace(/"/g, '""')}"`;
            const date = `"${ev.created_at || ''}"`;

            csv += `${ev.id},${username},${comment},${trigger},${action},${ev.dm_status || 'pending'},${hasClicked},${date}\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="leads_export_${Date.now()}.csv"`);
        res.status(200).send(csv);
    } catch (err) {
        console.error('[Events] Export error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/events/stats', auth, (req, res) => {
    try {
        const db = getDb();
        
        const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
        const dmsSent = db.prepare("SELECT COUNT(*) as count FROM events WHERE dm_status IN ('sent', 'delivered')").get().count;
        const dmsDelivered = db.prepare("SELECT COUNT(*) as count FROM events WHERE dm_status = 'delivered'").get().count;
        const dmsFailed = db.prepare("SELECT COUNT(*) as count FROM events WHERE dm_status = 'failed'").get().count;
        const totalClicks = db.prepare('SELECT COUNT(*) as count FROM clicks').get().count;
        
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEvents = db.prepare("SELECT COUNT(*) as count FROM events WHERE created_at >= ?").get(todayStr).count;
        
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekEvents = db.prepare("SELECT COUNT(*) as count FROM events WHERE created_at >= ?").get(weekAgo.toISOString()).count;

        const topPosts = db.prepare(`
            SELECT m.id, m.caption, m.media_type, m.thumbnail_url, COUNT(e.id) as total_triggers
            FROM events e
            JOIN media m ON e.media_ig_id = m.ig_media_id
            GROUP BY m.id
            ORDER BY total_triggers DESC
            LIMIT 5
        `).all();

        res.json({
            total: totalEvents,
            today: todayEvents,
            week: weekEvents,
            dms_sent: dmsSent,
            dms_delivered: dmsDelivered,
            dms_failed: dmsFailed,
            clicks: totalClicks,
            queue: getQueueDepth(),
            top_posts: topPosts
        });
    } catch (err) {
        console.error('[Events] Stats error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
