const express = require('express');
const { getDb, getConfig, backupRules } = require('../database');
const auth = require('../middleware/auth');
const { getMediaComments } = require('../services/instagram');
const { enqueue } = require('../services/queue');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const router = express.Router();

router.get('/rules', auth, (req, res) => {
    try {
        const db = getDb();

        // If any rule has an IG media ID string as media_id, resolve it to local media.id if present
        try {
            const rulesWithIgId = db.prepare("SELECT r.id, m.id as real_media_id FROM rules r JOIN media m ON r.media_id = m.ig_media_id WHERE r.media_id != m.id").all();
            for (const r of rulesWithIgId) {
                db.prepare("UPDATE rules SET media_id = ? WHERE id = ?").run(r.real_media_id, r.id);
            }
        } catch(e) {}

        const { media_id, status, source_type } = req.query;
        const userId = req.user?.id;
        const userObj = userId ? db.prepare('SELECT email, role FROM users WHERE id = ?').get(userId) : null;
        const isSuperAdmin = (req.user?.role === 'super_admin' || userObj?.role === 'super_admin' || (userObj?.email && userObj.email.includes('harshparmar'))) && !req.isImpersonating;

        let query = `
            SELECT r.*, r.trigger_keyword as trigger_word, m.ig_media_id, m.thumbnail_url 
            FROM rules r 
            LEFT JOIN media m ON (r.media_id = m.id OR r.media_id = m.ig_media_id)
        `;
        const whereClauses = [];
        const params = [];

        // Status filtering: active, paused, deleted, or all_with_deleted
        if (status === 'deleted') {
            whereClauses.push('r.is_deleted = 1');
        } else if (status === 'all_with_deleted') {
            // Include everything
        } else if (status === 'active') {
            whereClauses.push('(r.is_deleted = 0 OR r.is_deleted IS NULL)');
            whereClauses.push('r.is_active = 1');
        } else if (status === 'paused') {
            whereClauses.push('(r.is_deleted = 0 OR r.is_deleted IS NULL)');
            whereClauses.push('r.is_active = 0');
        } else {
            // Default: show active and paused, exclude deleted
            whereClauses.push('(r.is_deleted = 0 OR r.is_deleted IS NULL)');
        }

        if (!isSuperAdmin && userId) {
            whereClauses.push('r.user_id = ?');
            params.push(userId);
        }

        if (source_type) {
            whereClauses.push('r.source_type = ?');
            params.push(source_type);
        }

        if (media_id === 'global') {
            whereClauses.push('(r.media_id IS NULL AND (r.source_type IS NULL OR r.source_type = "reel"))');
        } else if (media_id === 'story') {
            whereClauses.push('(r.source_type IN ("story", "story_mention") OR r.media_id = "story")');
        } else if (media_id && media_id !== 'all') {
            whereClauses.push('(r.media_id = ? OR m.ig_media_id = ?)');
            params.push(media_id, media_id);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY r.created_at DESC';
        
        const rules = db.prepare(query).all(...params);
        res.json(rules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function checkRuleOwnership(db, ruleId, user, isImpersonating = false) {
    if (!ruleId || !user) return { allowed: false, error: 'Unauthorized' };
    const rule = db.prepare('SELECT * FROM rules WHERE id = ?').get(ruleId);
    if (!rule) return { allowed: false, notFound: true, error: 'Rule not found' };

    const isSuperAdmin = (user.role === 'super_admin' || (user.email && user.email.includes('harshparmar'))) && !isImpersonating;
    if (isSuperAdmin) return { allowed: true, rule };

    if (rule.user_id && rule.user_id === user.id) return { allowed: true, rule };

    return { allowed: false, error: 'Access denied: You do not have permission to access this rule.' };
}

router.get('/rules/:id', auth, (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const check = checkRuleOwnership(db, id, req.user, req.isImpersonating);
        if (!check.allowed) {
            return res.status(check.notFound ? 404 : 403).json({ error: check.error });
        }

        const rule = db.prepare(`
            SELECT r.*, r.trigger_keyword as trigger_word, m.ig_media_id, m.thumbnail_url, m.caption, m.permalink
            FROM rules r 
            LEFT JOIN media m ON (r.media_id = m.id OR r.media_id = m.ig_media_id)
            WHERE r.id = ?
        `).get(id);

        res.json(rule);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function cleanUrl(url) {
    if (!url) return null;
    let trimmed = String(url).trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = 'https://' + trimmed;
    }
    return trimmed;
}

router.post('/rules', auth, (req, res) => {
    try {
        const db = getDb();
        const { media_id, trigger_keyword, trigger_word, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, buttons_config_json, source_type } = req.body;
        const keyword = trigger_keyword || trigger_word;

        if (!keyword || !action_type) {
            return res.status(400).json({ error: 'trigger_keyword and action_type are required' });
        }

        let resolvedSourceType = source_type || 'reel';
        let resolvedMediaId = null;

        if (media_id === 'story' || source_type === 'story') {
            resolvedSourceType = 'story';
            resolvedMediaId = null;
        } else if (media_id === 'story_mention' || source_type === 'story_mention') {
            resolvedSourceType = 'story_mention';
            resolvedMediaId = null;
        } else if (media_id && media_id !== 'global') {
            const mRow = db.prepare("SELECT id FROM media WHERE id = ? OR ig_media_id = ?").get(media_id, media_id);
            if (mRow) {
                resolvedMediaId = mRow.id;
            } else {
                resolvedMediaId = typeof media_id === 'number' ? media_id : null;
            }
        }

        const sanitizedUrl = cleanUrl(link_url);

        const userId = req.user?.id || null;

        const result = db.prepare(`
            INSERT INTO rules (media_id, trigger_keyword, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, buttons_config_json, created_at, updated_at, user_id, source_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            resolvedMediaId, 
            keyword, 
            action_type, 
            response_text || null, 
            sanitizedUrl, 
            follow_prompt || null, 
            public_reply || null,
            parseInt(delay_seconds || 0),
            variations_json || null,
            buttons_config_json || null,
            new Date().toISOString(), 
            new Date().toISOString(),
            userId,
            resolvedSourceType
        );

        try { backupRules(db); } catch(e) { console.error('Error backing up rules:', e); }

        res.json({ id: result.lastInsertRowid, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/rules/:id', auth, (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const check = checkRuleOwnership(db, id, req.user, req.isImpersonating);
        if (!check.allowed) {
            return res.status(check.notFound ? 404 : 403).json({ error: check.error });
        }

        const { media_id, trigger_keyword, trigger_word, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, buttons_config_json, source_type } = req.body;
        const keyword = trigger_keyword || trigger_word;
        const sanitizedUrl = cleanUrl(link_url);

        let resolvedSourceType = source_type;
        let resolvedMediaId = undefined; // undefined = don't update media_id
        if (media_id !== undefined) {
            if (media_id === 'story') {
                resolvedMediaId = null;
                resolvedSourceType = 'story';
            } else if (media_id === 'story_mention') {
                resolvedMediaId = null;
                resolvedSourceType = 'story_mention';
            } else if (!media_id || media_id === 'global') {
                resolvedMediaId = null;
                if (!resolvedSourceType) resolvedSourceType = 'reel';
            } else {
                const mRow = db.prepare("SELECT id FROM media WHERE id = ? OR ig_media_id = ?").get(media_id, media_id);
                if (mRow) {
                    resolvedMediaId = mRow.id;
                } else {
                    resolvedMediaId = typeof media_id === 'number' ? media_id : null;
                }
                if (!resolvedSourceType) resolvedSourceType = 'reel';
            }
        }

        const currentRule = db.prepare("SELECT source_type FROM rules WHERE id = ?").get(id);
        const finalSourceType = resolvedSourceType !== undefined ? resolvedSourceType : (currentRule?.source_type || 'reel');

        if (resolvedMediaId !== undefined) {
            db.prepare(`
                UPDATE rules SET 
                    media_id = ?,
                    trigger_keyword = ?, 
                    action_type = ?, 
                    response_text = ?, 
                    link_url = ?, 
                    follow_prompt = ?, 
                    public_reply = ?,
                    delay_seconds = ?,
                    variations_json = ?,
                    buttons_config_json = ?,
                    source_type = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                resolvedMediaId,
                keyword, 
                action_type, 
                response_text || null, 
                sanitizedUrl, 
                follow_prompt || null, 
                public_reply || null, 
                parseInt(delay_seconds || 0),
                variations_json || null,
                buttons_config_json || null,
                finalSourceType,
                new Date().toISOString(), 
                id
            );
        } else {
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
                    buttons_config_json = ?,
                    source_type = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                keyword, 
                action_type, 
                response_text || null, 
                sanitizedUrl, 
                follow_prompt || null, 
                public_reply || null, 
                parseInt(delay_seconds || 0),
                variations_json || null,
                buttons_config_json || null,
                finalSourceType,
                new Date().toISOString(), 
                id
            );
        }

        try { backupRules(db); } catch(e) { console.error('Error backing up rules:', e); }

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
        const check = checkRuleOwnership(db, id, req.user, req.isImpersonating);
        if (!check.allowed) {
            return res.status(check.notFound ? 404 : 403).json({ error: check.error });
        }
        
        const rule = check.rule;
        const newStatus = rule.is_active === 1 ? 0 : 1;
        db.prepare('UPDATE rules SET is_active = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), id);

        try { backupRules(db); } catch(e) { console.error('Error backing up rules:', e); }

        res.json({ success: true, is_active: newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/rules/:id', auth, (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const check = checkRuleOwnership(db, id, req.user, req.isImpersonating);
        if (!check.allowed) {
            return res.status(check.notFound ? 404 : 403).json({ error: check.error });
        }

        const result = db.prepare('UPDATE rules SET is_deleted = 1, is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        try { backupRules(db); } catch(e) { console.error('Error backing up rules:', e); }

        res.json({ success: true, message: 'Automation moved to Deleted Automations' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/rules/:id/restore', auth, (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const check = checkRuleOwnership(db, id, req.user, req.isImpersonating);
        if (!check.allowed) {
            return res.status(check.notFound ? 404 : 403).json({ error: check.error });
        }

        const result = db.prepare('UPDATE rules SET is_deleted = 0, is_active = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        try { backupRules(db); } catch(e) { console.error('Error backing up rules:', e); }

        res.json({ success: true, message: 'Automation restored successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/rules/:id/permanent', auth, (req, res) => {
    try {
        const db = getDb();
        const { id } = req.params;
        const check = checkRuleOwnership(db, id, req.user, req.isImpersonating);
        if (!check.allowed) {
            return res.status(check.notFound ? 404 : 403).json({ error: check.error });
        }

        db.prepare('DELETE FROM events WHERE rule_id = ?').run(id);
        db.prepare('DELETE FROM conversations WHERE rule_id = ?').run(id);
        const result = db.prepare('DELETE FROM rules WHERE id = ?').run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        try { backupRules(db); } catch(e) { console.error('Error backing up rules:', e); }

        res.json({ success: true, message: 'Automation permanently deleted' });
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

                let messageToSend = (rule.response_text || '').trim();
                const directLink = (rule.link_url || '').trim();
                let trackingId = null;
                let messagePayload = null;

                if (rule.action_type === 'link_dm') {
                    if (directLink) {
                        const crypto = require('crypto');
                        trackingId = crypto.randomBytes(4).toString('hex');
                        const config = require('../config');
                        const baseUrl = typeof config.resolveBaseUrl === 'function' ? config.resolveBaseUrl() : config.BASE_URL;
                        const trackedLink = `${baseUrl}/r/${trackingId}`;

                        let btnCfg = null;
                        if (rule.buttons_config_json) {
                            try { btnCfg = JSON.parse(rule.buttons_config_json); } catch(e) {}
                        }
                        let btnTitle = btnCfg?.step3_button || btnCfg?.step1_button || rule.button_title || 'Access Resource';
                        btnTitle = String(btnTitle).slice(0, 20);

                        let cleanText = messageToSend ? messageToSend.replace(directLink, '').trim() : '';
                        if (!cleanText) cleanText = 'Here is your resource link!';

                        messagePayload = {
                            attachment: {
                                type: 'template',
                                payload: {
                                    template_type: 'button',
                                    text: cleanText,
                                    buttons: [
                                        {
                                            type: 'web_url',
                                            url: trackedLink,
                                            title: btnTitle
                                        }
                                    ]
                                }
                            }
                        };

                        messageToSend = messageToSend ? `${messageToSend}\n${trackedLink}` : trackedLink;
                    } else if (!messageToSend) {
                        messageToSend = 'Here is your resource link!';
                    }
                } else if (rule.action_type === 'follow_first') {
                    let btnCfg = null;
                    if (rule.buttons_config_json) {
                        try { btnCfg = JSON.parse(rule.buttons_config_json); } catch(e) {}
                    }
                    const isButtonMode = !btnCfg || btnCfg.gate_type !== 'text';
                    if (isButtonMode) {
                        const step1Text = btnCfg?.step1_text || "Hey there! Glad you're here ☺️\n\nTap below and I'll send you the access in just a moment ✨";
                        const step1Button = (btnCfg?.step1_button || "Send me the access").slice(0, 20);
                        messageToSend = step1Text;
                        messagePayload = {
                            attachment: {
                                type: 'template',
                                payload: {
                                    template_type: 'button',
                                    text: step1Text,
                                    buttons: [
                                        {
                                            type: 'postback',
                                            title: step1Button,
                                            payload: 'REQ_ACCESS'
                                        }
                                    ]
                                }
                            }
                        };
                    } else {
                        messageToSend = rule.follow_prompt || `Hey @${from.username || 'friend'}! Please follow us first, then reply "DONE" to unlock your link!`;
                    }
                }

                const eventRes = db.prepare(`
                    INSERT INTO events (rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, tracking_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(rule.id, commentId, text, from.id, from.username || 'user', targetMediaId, trackingId, new Date().toISOString());

                const eventId = eventRes.lastInsertRowid;

                if (rule.action_type === 'follow_first') {
                    let btnCfg = null;
                    if (rule.buttons_config_json) {
                        try { btnCfg = JSON.parse(rule.buttons_config_json); } catch(e) {}
                    }
                    const isButtonMode = !btnCfg || btnCfg.gate_type !== 'text';
                    const initialState = isButtonMode ? 'awaiting_access_tap' : 'awaiting_reply';
                    db.prepare(`
                        INSERT INTO conversations (commenter_ig_id, rule_id, event_id, state, created_at)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(from.id, rule.id, eventId, initialState, new Date().toISOString());
                }

                enqueue({
                    type: 'private_reply',
                    commentId: commentId,
                    commenterId: from.id,
                    messagePayload: messagePayload || messageToSend,
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
