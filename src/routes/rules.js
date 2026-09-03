const express = require('express');
const { getDb, getConfig } = require('../database');
const auth = require('../middleware/auth');
const { getMediaComments } = require('../services/instagram');
const { enqueue } = require('../services/queue');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

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

router.post('/rules/:id/backfill', auth, async (req, res) => {
    try {
        const db = getDb();
        const rule = db.prepare(`
            SELECT r.*, 
                   COALESCE(m.ig_media_id, (SELECT ig_media_id FROM media WHERE id = r.media_id OR ig_media_id = r.media_id LIMIT 1)) as ig_media_id
            FROM rules r 
            LEFT JOIN media m ON (r.media_id = m.id OR r.media_id = m.ig_media_id)
            WHERE r.id = ?
        `).get(req.params.id);

        if (!rule) {
            return res.status(404).json({ error: 'Automation rule not found' });
        }

        const token = getConfig('access_token');
        if (!token) {
            return res.status(400).json({ error: 'Instagram access token is not connected in Settings' });
        }

        const targetMediaId = rule.ig_media_id;
        if (!targetMediaId) {
            return res.status(400).json({ error: 'This rule is not linked to a specific Reel ID' });
        }

        console.log(`[Backfill] Fetching existing comments for Reel ${targetMediaId}...`);
        const comments = await getMediaComments(token, targetMediaId, 100);
        console.log(`[Backfill] Found ${comments.length} existing comments on Instagram`);

        let matchedCount = 0;
        let queuedCount = 0;

        // Process from oldest to newest (first user to last user)
        const sortedComments = [...comments].reverse();

        for (let i = 0; i < sortedComments.length; i++) {
            const comment = sortedComments[i];
            const commentId = comment.id;
            const text = (comment.text || '').trim();
            const from = comment.from;

            if (!from) continue;

            // Skip if already processed in events
            const alreadyProcessed = db.prepare("SELECT id FROM events WHERE comment_id = ?").get(commentId);
            if (alreadyProcessed) continue;

            // Check keyword match
            const textClean = text.toLowerCase();
            const keywords = (rule.trigger_keyword || '').split(',').map(k => k.replace(/['"]/g, '').trim().toLowerCase()).filter(Boolean);
            const isMatch = keywords.length === 0 || keywords.some(kw => kw === '*' || kw === 'any' || textClean.includes(kw));

            if (isMatch) {
                matchedCount++;

                // Space out by 1.5 seconds per message so Meta anti-spam won't throttle
                const delayMs = queuedCount * 1500;
                const processAt = Date.now() + delayMs;

                let messageToSend = rule.response_text || 'Here is your resource link!';
                let trackingId = null;

                if (rule.action_type === 'link_dm') {
                    trackingId = uuidv4();
                    messageToSend = `${messageToSend}\n${config.BASE_URL}/r/${trackingId}`;
                } else if (rule.action_type === 'follow_first') {
                    messageToSend = rule.follow_prompt || `Hey @${from.username || 'friend'}! Please follow us first, then reply "DONE" to unlock your link!`;
                }

                const eventRes = db.prepare(`
                    INSERT INTO events (rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, tracking_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(rule.id, commentId, text, from.id, from.username || 'user', targetMediaId, trackingId, new Date().toISOString());

                const eventId = eventRes.lastInsertRowid;

                if (rule.action_type === 'follow_first') {
                    db.prepare(`
                        INSERT INTO conversations (commenter_ig_id, rule_id, event_id, state, created_at)
                        VALUES (?, ?, ?, 'awaiting_reply', ?)
                    `).run(from.id, rule.id, eventId, new Date().toISOString());
                }

                enqueue({
                    type: 'private_reply',
                    commentId: commentId,
                    commenterId: from.id,
                    messageText: messageToSend,
                    publicReply: rule.public_reply || null,
                    eventId: eventId,
                    processAt
                });

                queuedCount++;
            }
        }

        res.json({
            success: true,
            totalComments: comments.length,
            matched: matchedCount,
            queued: queuedCount,
            message: `Found ${comments.length} existing comments. Successfully queued DMs for ${queuedCount} commenters (paced safely over ${(queuedCount * 1.5).toFixed(0)} seconds)!`
        });
    } catch (err) {
        console.error('[Backfill] Error processing past comments:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
