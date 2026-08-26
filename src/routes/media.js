const express = require('express');
const { getDb } = require('../database');
const auth = require('../middleware/auth');
const { syncMedia } = require('../services/mediaSync');

const router = express.Router();

router.get('/media', auth, (req, res) => {
    try {
        const db = getDb();
        const media = db.prepare(`
            SELECT m.*, 
                   (SELECT COUNT(*) FROM rules r WHERE r.media_id = m.id AND r.is_active = 1) as rulesCount
            FROM media m
            ORDER BY m.timestamp DESC
        `).all();
        res.json(media);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/media/automated — Returns all reels/posts with rules, monthly analytics & saved history
router.get('/media/automated', auth, (req, res) => {
    try {
        const db = getDb();
        
        const mediaWithRules = db.prepare(`
            SELECT DISTINCT m.*
            FROM media m
            JOIN rules r ON r.media_id = m.id
            ORDER BY m.timestamp DESC
        `).all();

        const ruleStmt = db.prepare(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM events e WHERE e.rule_id = r.id) as total_triggers,
                   (SELECT COUNT(*) FROM clicks c JOIN events e ON c.event_id = e.id WHERE e.rule_id = r.id) as total_clicks
            FROM rules r
            WHERE r.media_id = ?
            ORDER BY r.created_at DESC
        `);

        const historyStmt = db.prepare(`
            SELECT * FROM reel_stats_history WHERE media_id = ? ORDER BY month_year DESC
        `);

        const result = mediaWithRules.map(m => {
            const rules = ruleStmt.all(m.id);
            const history = historyStmt.all(m.id);
            return {
                ...m,
                rules,
                history
            };
        });

        // Global rules
        const globalRules = db.prepare(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM events e WHERE e.rule_id = r.id) as total_triggers,
                   (SELECT COUNT(*) FROM clicks c JOIN events e ON c.event_id = e.id WHERE e.rule_id = r.id) as total_clicks
            FROM rules r
            WHERE r.media_id IS NULL
            ORDER BY r.created_at DESC
        `).all();

        if (globalRules.length > 0) {
            result.unshift({
                id: 'global',
                caption: 'Global Rules (Applies to all posts & reels)',
                media_type: 'GLOBAL',
                thumbnail_url: '',
                permalink: '',
                timestamp: new Date().toISOString(),
                views_count: 0,
                comments_count: 0,
                history: [],
                rules: globalRules
            });
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/media/sync', auth, async (req, res) => {
    try {
        await syncMedia();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
