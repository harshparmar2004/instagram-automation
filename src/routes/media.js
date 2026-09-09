const express = require('express');
const { getDb } = require('../database');
const auth = require('../middleware/auth');
const { syncMedia } = require('../services/mediaSync');

const router = express.Router();

router.get('/media', auth, (req, res) => {
    try {
        const db = getDb();
        const type = req.query.type; // 'reels', 'feed', or all
        const userId = req.user?.id;
        const isSuperAdmin = req.user?.role === 'super_admin' && !req.isImpersonating;

        let query = `
            SELECT m.*, 
                   (SELECT COUNT(*) FROM rules r WHERE r.media_id = m.id AND r.is_active = 1) as rulesCount
            FROM media m
        `;
        const whereClauses = [];
        const params = [];

        if (!isSuperAdmin && userId) {
            whereClauses.push('(m.user_id = ? OR m.user_id IS NULL)');
            params.push(userId);
        }

        if (type === 'reels') {
            whereClauses.push("(m.media_product_type = 'REELS' OR m.media_type = 'REEL' OR (m.media_type = 'VIDEO' AND m.media_product_type != 'FEED'))");
        } else if (type === 'feed') {
            whereClauses.push("(m.media_product_type != 'REELS' AND m.media_type != 'REEL')");
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ` ORDER BY m.timestamp DESC `;

        const media = db.prepare(query).all(...params);
        res.json(media);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/media/automated — Returns all reels/posts with rules, monthly analytics & saved history
router.get('/media/automated', auth, (req, res) => {
    try {
        const db = getDb();
        const userId = req.user?.id;
        const isSuperAdmin = req.user?.role === 'super_admin' && !req.isImpersonating;
        
        let rulesQuery = `
            SELECT r.*, 
                   (SELECT COUNT(*) FROM events e WHERE e.rule_id = r.id) as total_triggers,
                   (SELECT COUNT(*) FROM clicks c JOIN events e ON c.event_id = e.id WHERE e.rule_id = r.id) as total_clicks
            FROM rules r
        `;
        const rulesParams = [];
        if (!isSuperAdmin && userId) {
            rulesQuery += ` WHERE (r.user_id = ? OR r.user_id IS NULL)`;
            rulesParams.push(userId);
        }
        rulesQuery += ` ORDER BY r.created_at DESC`;
        const allRules = db.prepare(rulesQuery).all(...rulesParams);

        // 2. Fetch all media from DB
        let mediaQuery = `SELECT * FROM media`;
        const mediaParams = [];
        if (!isSuperAdmin && userId) {
            mediaQuery += ` WHERE (user_id = ? OR user_id IS NULL)`;
            mediaParams.push(userId);
        }
        mediaQuery += ` ORDER BY timestamp DESC`;
        const allMedia = db.prepare(mediaQuery).all(...mediaParams);

        const historyStmt = db.prepare(`
            SELECT * FROM reel_stats_history WHERE media_id = ? ORDER BY month_year DESC
        `);

        // Group rules by media
        const mediaMap = new Map();
        const globalRules = [];

        for (const rule of allRules) {
            if (!rule.media_id || rule.media_id === 'global') {
                globalRules.push(rule);
                continue;
            }

            // Match media row by either DB id or Instagram media ID
            const matchedMedia = allMedia.find(m => 
                m.id === rule.media_id || 
                String(m.id) === String(rule.media_id) || 
                m.ig_media_id === String(rule.media_id)
            );

            if (matchedMedia) {
                if (!mediaMap.has(matchedMedia.id)) {
                    mediaMap.set(matchedMedia.id, {
                        ...matchedMedia,
                        rules: [],
                        history: historyStmt.all(matchedMedia.id)
                    });
                }
                mediaMap.get(matchedMedia.id).rules.push(rule);
            } else {
                // Rule linked to a media ID not currently in media table — never drop it!
                const placeholderKey = `orphan_${rule.media_id}`;
                if (!mediaMap.has(placeholderKey)) {
                    mediaMap.set(placeholderKey, {
                        id: rule.media_id,
                        ig_media_id: String(rule.media_id),
                        caption: `Automation (Reel / Media #${rule.media_id})`,
                        media_type: 'REEL',
                        thumbnail_url: '',
                        permalink: '',
                        timestamp: rule.created_at || new Date().toISOString(),
                        views_count: 0,
                        comments_count: 0,
                        history: [],
                        rules: []
                    });
                }
                mediaMap.get(placeholderKey).rules.push(rule);
            }
        }

        const result = Array.from(mediaMap.values());

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
        const result = await syncMedia(req.user?.id);
        res.json({ success: true, count: result?.synced || 0, pages: result?.pages || 1 });
    } catch (err) {
        res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
});

module.exports = router;
