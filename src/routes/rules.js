const express = require('express');
const { getDb } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/rules', auth, (req, res) => {
    try {
        const db = getDb();

        // Auto-link any rules whose media_id no longer matches
        try {
            const orphanRules = db.prepare("SELECT id FROM rules WHERE media_id IS NOT NULL AND media_id NOT IN (SELECT id FROM media)").all();
            if (orphanRules.length > 0) {
                const targetMedia = db.prepare("SELECT id FROM media ORDER BY id ASC LIMIT 1").get();
                if (targetMedia) {
                    db.prepare("UPDATE rules SET media_id = ? WHERE media_id IS NOT NULL AND media_id NOT IN (SELECT id FROM media)").run(targetMedia.id);
                }
            }
        } catch(e) {}

        const { media_id } = req.query;
        let query = `
            SELECT r.*, r.trigger_keyword as trigger_word, m.ig_media_id, m.thumbnail_url 
            FROM rules r 
            LEFT JOIN media m ON r.media_id = m.id
        `;
        const params = [];

        if (media_id === 'global') {
            query += ' WHERE r.media_id IS NULL';
        } else if (media_id) {
            query += ' WHERE r.media_id = ?';
            params.push(media_id);
        }

        query += ' ORDER BY r.created_at DESC';
        
        const rules = db.prepare(query).all(...params);
        res.json(rules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/rules', auth, (req, res) => {
    try {
        const db = getDb();
        const { media_id, trigger_keyword, trigger_word, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json } = req.body;
        const keyword = trigger_keyword || trigger_word;

        if (!keyword || !action_type) {
            return res.status(400).json({ error: 'trigger_keyword and action_type are required' });
        }

        let resolvedMediaId = null;
        if (media_id && media_id !== 'global') {
            const mRow = db.prepare("SELECT id FROM media WHERE id = ? OR ig_media_id = ?").get(media_id, media_id);
            if (mRow) {
                resolvedMediaId = mRow.id;
            } else if (typeof media_id === 'string' && media_id.length > 5) {
                try {
                    db.prepare("INSERT INTO media (ig_media_id, caption, synced_at) VALUES (?, 'Instagram Content', ?) ON CONFLICT(ig_media_id) DO NOTHING").run(media_id, new Date().toISOString());
                    const mNew = db.prepare("SELECT id FROM media WHERE ig_media_id = ?").get(media_id);
                    resolvedMediaId = mNew ? mNew.id : null;
                } catch(e) {
                    resolvedMediaId = null;
                }
            }
        }

        const result = db.prepare(`
            INSERT INTO rules (media_id, trigger_keyword, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            resolvedMediaId, 
            keyword, 
            action_type, 
            response_text || null, 
            link_url || null, 
            follow_prompt || null, 
            public_reply || null,
            parseInt(delay_seconds || 0),
            variations_json || null,
            new Date().toISOString(), 
            new Date().toISOString()
        );

        res.json({ id: result.lastInsertRowid, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/rules/:id', auth, (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const { trigger_keyword, trigger_word, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json } = req.body;
        const keyword = trigger_keyword || trigger_word;

        db.prepare(`
            UPDATE rules SET 
                trigger_keyword = ?, 
                action_type = ?, 
                response_text = ?, 
                link_url = ?, 
                follow_prompt = ?, 
                public_reply = ?,
                delay_seconds = ?,
                variations_json = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            keyword, 
            action_type, 
            response_text || null, 
            link_url || null, 
            follow_prompt || null, 
            public_reply || null, 
            parseInt(delay_seconds || 0),
            variations_json || null,
            new Date().toISOString(), 
            id
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/rules/test', auth, (req, res) => {
    try {
        const db = getDb();
        const { comment_text, media_id } = req.body;
        if (!comment_text) return res.status(400).json({ error: 'comment_text is required' });

        const textLower = comment_text.toLowerCase();
        const rules = db.prepare(`
            SELECT r.*, m.ig_media_id 
            FROM rules r 
            LEFT JOIN media m ON r.media_id = m.id 
            WHERE r.is_active = 1
        `).all();

        let matchedRule = null;
        for (const rule of rules) {
            if (rule.trigger_keyword) {
                const keywords = rule.trigger_keyword.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                const hasMatch = keywords.some(kw => textLower.match(new RegExp(`\\b${kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'i')));
                if (hasMatch) {
                    if (media_id && rule.media_id == media_id) {
                        matchedRule = rule;
                        break;
                    }
                    if (!rule.media_id && !matchedRule) {
                        matchedRule = rule;
                    }
                }
            }
        }

        if (!matchedRule) {
            return res.json({ matched: false, message: 'No active rule matched this comment text.' });
        }

        res.json({
            matched: true,
            rule: {
                id: matchedRule.id,
                trigger_keyword: matchedRule.trigger_keyword,
                action_type: matchedRule.action_type,
                response_text: matchedRule.response_text,
                link_url: matchedRule.link_url,
                follow_prompt: matchedRule.follow_prompt,
                public_reply: matchedRule.public_reply,
                delay_seconds: matchedRule.delay_seconds || 0,
                variations_json: matchedRule.variations_json
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/rules/:id/toggle', auth, (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;
        
        const rule = db.prepare('SELECT is_active FROM rules WHERE id = ?').get(id);
        if (!rule) return res.status(404).json({ error: 'Not found' });

        const newStatus = rule.is_active === 1 ? 0 : 1;
        db.prepare('UPDATE rules SET is_active = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), id);

        res.json({ success: true, is_active: newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/rules/:id', auth, (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;
        db.prepare('DELETE FROM rules WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
