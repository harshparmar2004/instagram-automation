const express = require('express');
const { getDb } = require('../database');
const { syncClickToSheet } = require('../services/googleSheets');

const router = express.Router();

router.get('/r/:trackingId', (req, res) => {
    try {
        const { trackingId } = req.params;
        const db = getDb();

        const event = db.prepare(`
            SELECT e.id as event_id, r.link_url, e.media_ig_id 
            FROM events e 
            LEFT JOIN rules r ON e.rule_id = r.id 
            WHERE e.tracking_id = ?
        `).get(trackingId);

        if (!event) {
            return res.status(404).send('Link not found');
        }

        let destinationUrl = event.link_url;
        if (!destinationUrl) {
            destinationUrl = 'https://instagram.com';
        }
        if (!/^https?:\/\//i.test(destinationUrl)) {
            destinationUrl = 'https://' + destinationUrl;
        }

        // Log click in local DB
        db.prepare(`
            INSERT INTO clicks (event_id, tracking_id, clicked_at, user_agent) 
            VALUES (?, ?, ?, ?)
        `).run(event.event_id, trackingId, new Date().toISOString(), req.get('User-Agent') || '');

        // Update reel_stats_history in real time
        try {
            if (event.media_ig_id) {
                const mediaRow = db.prepare("SELECT id FROM media WHERE ig_media_id = ?").get(event.media_ig_id);
                if (mediaRow) {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    db.prepare(`
                        UPDATE reel_stats_history 
                        SET clicks_count = (SELECT COUNT(*) FROM clicks c JOIN events e ON c.event_id = e.id WHERE e.media_ig_id = ?),
                            updated_at = ?
                        WHERE media_id = ? AND month_year = ?
                    `).run(event.media_ig_id, new Date().toISOString(), mediaRow.id, currentMonth);
                }
            }
        } catch(e) {}

        // Asynchronously update Google Sheet
        try { syncClickToSheet(trackingId).catch(() => {}); } catch(e) {}

        res.redirect(destinationUrl);
    } catch (err) {
        console.error('[Redirect] Error:', err.message);
        res.status(500).send('Internal Error');
    }
});

module.exports = router;
