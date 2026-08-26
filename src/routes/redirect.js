const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

router.get('/r/:trackingId', (req, res) => {
    try {
        const { trackingId } = req.params;
        const db = getDb();

        const event = db.prepare(`
            SELECT e.id as event_id, r.link_url 
            FROM events e 
            JOIN rules r ON e.rule_id = r.id 
            WHERE e.tracking_id = ?
        `).get(trackingId);

        if (!event || !event.link_url) {
            return res.status(404).send('Link not found');
        }

        // Log click
        db.prepare(`
            INSERT INTO clicks (event_id, tracking_id, clicked_at, user_agent) 
            VALUES (?, ?, ?, ?)
        `).run(event.event_id, trackingId, new Date().toISOString(), req.get('User-Agent') || '');

        res.redirect(event.link_url);
    } catch (err) {
        console.error('[Redirect] Error:', err.message);
        res.status(500).send('Internal Error');
    }
});

module.exports = router;
