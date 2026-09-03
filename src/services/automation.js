const { getDb, getConfig } = require('../database');
const { getSingleMedia } = require('./instagram');
const { enqueue } = require('./queue');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

async function ensureMediaExists(mediaIgId) {
    if (!mediaIgId) return null;
    const db = getDb();
    const existing = db.prepare("SELECT id FROM media WHERE ig_media_id = ?").get(mediaIgId);
    if (existing) return existing.id;

    const token = getConfig('access_token');
    if (!token) return null;

    try {
        const item = await getSingleMedia(token, mediaIgId);
        if (item && item.id) {
            const productType = item.media_product_type || (item.media_type === 'VIDEO' ? 'REELS' : 'FEED');
            const res = db.prepare(`
                INSERT INTO media (
                    ig_media_id, media_type, media_product_type, caption, 
                    thumbnail_url, media_url, permalink, timestamp, 
                    comments_count, like_count, synced_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(ig_media_id) DO NOTHING
            `).run(
                item.id,
                item.media_type || '',
                productType,
                item.caption || '',
                item.thumbnail_url || item.media_url || '',
                item.media_url || item.thumbnail_url || '',
                item.permalink || '',
                item.timestamp || '',
                item.comments_count || 0,
                item.like_count || 0,
                new Date().toISOString()
            );
            console.log(`[Automation] Auto-synced new media item ${mediaIgId} on comment event`);
            return res.lastInsertRowid;
        }
    } catch(err) {
        console.log(`[Automation] Notice: Could not auto-fetch media ${mediaIgId}:`, err.message);
    }
    return null;
}

function checkDedupComment(commentId) {
    const row = getDb().prepare("SELECT id FROM events WHERE comment_id = ?").get(commentId);
    return !!row;
}

function checkDedupUserForMedia(commenterIgId, mediaIgId) {
    const row = getDb().prepare("SELECT id FROM events WHERE commenter_ig_id = ? AND media_ig_id = ?").get(commenterIgId, mediaIgId);
    return !!row;
}

function matchKeyword(ruleTrigger, text) {
    if (!ruleTrigger || ruleTrigger.trim() === '' || ruleTrigger.trim() === '*' || ruleTrigger.trim().toLowerCase() === 'any') {
        return true; // Matches ANY comment on this Reel!
    }
    const textClean = (text || '').toLowerCase().trim();
    // Split by comma and strip quotes and extra whitespace
    const keywords = ruleTrigger.split(',').map(k => k.replace(/['"]/g, '').trim().toLowerCase()).filter(Boolean);
    if (keywords.length === 0) return true;
    for (const kw of keywords) {
        if (kw === '*' || kw === 'any') return true;
        if (textClean.includes(kw)) return true;
        const escaped = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        if (textClean.match(new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i'))) {
            return true;
        }
    }
    return false;
}

function getRandomResponseText(rule) {
    const mainText = rule.response_text || '';
    let variations = [];
    if (rule.variations_json) {
        try {
            const parsed = JSON.parse(rule.variations_json);
            if (Array.isArray(parsed) && parsed.length > 0) {
                variations = parsed.filter(Boolean);
            }
        } catch (e) {}
    }
    const pool = [mainText, ...variations].filter(Boolean);
    if (pool.length === 0) return mainText;
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
}

function findMatchingRule(mediaIgId, commentText) {
    const db = getDb();
    const rules = db.prepare(`
        SELECT r.*, m.ig_media_id 
        FROM rules r 
        LEFT JOIN media m ON r.media_id = m.id 
        WHERE r.is_active = 1
    `).all();

    // 1. Try matching rule attached to this specific media ID
    for (const rule of rules) {
        if (rule.ig_media_id && mediaIgId && String(rule.ig_media_id) === String(mediaIgId)) {
            if (matchKeyword(rule.trigger_keyword, commentText)) {
                return rule;
            }
        }
    }

    // 2. Try global rules (media_id is null / applies to all reels)
    for (const rule of rules) {
        if (!rule.media_id) {
            if (matchKeyword(rule.trigger_keyword, commentText)) {
                return rule;
            }
        }
    }

    return null;
}

async function processCommentEvent(payload) {
    const db = getDb();

    for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
            if (change.field === 'comments') {
                const comment = change.value;
                const commentId = comment.id || comment.comment_id;
                const text = comment.text || '';
                const from = comment.from;
                const mediaId = comment.media_id || (comment.media && comment.media.id);

                console.log(`[Automation] 📩 Incoming comment: "${text}" from @${from?.username || from?.id || 'unknown'} on media ${mediaId}`);

                if (!from) {
                    console.log('[Automation] Skipping comment with no sender info');
                    continue;
                }

                // Check self-comment: Meta API doesn't allow private reply to self, but log clearly
                if (from.id === entry.id) {
                    console.log(`[Automation] Notice: Comment is from own account (@${from.username || from.id}). Meta prevents sending DMs to self.`);
                    // We allow public reply testing even for own comments!
                }

                if (checkDedupComment(commentId)) {
                    console.log(`[Automation] Skipping duplicate comment: ${commentId}`);
                    continue;
                }

                if (from.id !== entry.id && checkDedupUserForMedia(from.id, mediaId)) {
                    console.log(`[Automation] Skipping duplicate user ${from.id} for media ${mediaId}`);
                    continue;
                }

                if (comment.created_time) {
                    const commentAge = Date.now() - new Date(comment.created_time).getTime();
                    if (commentAge > 7 * 24 * 60 * 60 * 1000) {
                        console.log(`[Automation] Skipping old comment: ${commentId}`);
                        continue;
                    }
                }

                // Auto-fetch media record if freshly posted and not yet in local DB
                if (mediaId) {
                    await ensureMediaExists(mediaId);
                }

                const rule = findMatchingRule(mediaId, text);
                if (!rule) {
                    console.log(`[Automation] No active rule matched keyword for text: "${text}" on media ${mediaId}`);
                    continue;
                }

                console.log(`[Automation] 🎯 Rule #${rule.id} ("${rule.trigger_keyword}") matched for comment ${commentId}! Action: ${rule.action_type}`);

                let trackingId = null;
                let messageToSend = '';
                const baseResponse = getRandomResponseText(rule);

                if (rule.action_type === 'direct_dm') {
                    messageToSend = baseResponse;
                } else if (rule.action_type === 'link_dm') {
                    trackingId = uuidv4();
                    const trackedUrl = `${config.BASE_URL}/r/${trackingId}`;
                    messageToSend = `${baseResponse}\n${trackedUrl}`;
                } else if (rule.action_type === 'follow_first') {
                    messageToSend = rule.follow_prompt || `Hey @${from.username || 'friend'}! 🚀 Thanks for commenting! Please follow us first, then reply "DONE" in this DM to unlock your link!`;
                }

                const insertEvent = db.prepare(`
                    INSERT INTO events (rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, tracking_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                const eventResult = insertEvent.run(
                    rule.id, commentId, text, from.id, from.username || 'user', mediaId, trackingId, new Date().toISOString()
                );
                
                const eventId = eventResult.lastInsertRowid;

                if (rule.action_type === 'follow_first') {
                    db.prepare(`
                        INSERT INTO conversations (commenter_ig_id, rule_id, event_id, state, created_at)
                        VALUES (?, ?, ?, 'awaiting_reply', ?)
                    `).run(from.id, rule.id, eventId, new Date().toISOString());
                }

                const delayMs = (rule.delay_seconds || 0) * 1000;
                const processAt = Date.now() + delayMs;

                enqueue({
                    type: 'private_reply',
                    commentId: commentId,
                    commenterId: from.id,
                    messageText: messageToSend,
                    publicReply: rule.public_reply || null,
                    eventId: eventId,
                    processAt
                });
                console.log(`[Automation] 🚀 Queued DM & public reply for event #${eventId} (scheduled in ${delayMs}ms)`);
            }
        }
    }
}

async function processMessageEvent(payload) {
    const db = getDb();

    for (const entry of payload.entry || []) {
        for (const msgEvent of entry.messaging || []) {
            const senderId = msgEvent.sender.id;
            const text = msgEvent.message?.text;

            if (msgEvent.message && msgEvent.message.attachments) {
                const storyShare = msgEvent.message.attachments.find(a => a.type === 'story_mention' || a.type === 'ig_story');
                if (storyShare) {
                    console.log(`[Automation] Story mention received from sender ${senderId}`);
                    const storyRule = db.prepare("SELECT * FROM rules WHERE trigger_keyword LIKE '%story%' AND is_active = 1 LIMIT 1").get();
                    if (storyRule) {
                        const messageToSend = getRandomResponseText(storyRule);
                        enqueue({
                            type: 'direct_message',
                            recipientId: senderId,
                            messageText: messageToSend,
                            processAt: Date.now()
                        });
                    }
                }
            }

            if (!text) continue;

            // FOLLOW-FIRST GATE REPLY VERIFICATION STATE MACHINE
            const conv = db.prepare("SELECT * FROM conversations WHERE commenter_ig_id = ? AND state = 'awaiting_reply' ORDER BY id DESC LIMIT 1").get(senderId);
            if (!conv) continue;

            const tLower = text.toLowerCase().trim();
            // Accept any confirmation string: "i followed", "followed", "following", "done", "i'm following", "following you"
            const isFollowConfirmation = ['done', 'followed', 'following', 'i followed', "i'm following", 'following you', 'ok', 'yes'].some(kw => tLower.includes(kw));

            if (isFollowConfirmation) {
                console.log(`[Automation] Follower ${senderId} confirmed follow status! Delivering resource link...`);

                const rule = db.prepare("SELECT * FROM rules WHERE id = ?").get(conv.rule_id);
                if (!rule) continue;

                const trackingId = uuidv4();
                const trackedUrl = `${config.BASE_URL}/r/${trackingId}`;
                const baseResponse = getRandomResponseText(rule);
                const messageToSend = `🎉 Thank you for following @creator.studio! Here is your requested resource link:\n${trackedUrl}`;

                const prevEvent = db.prepare("SELECT media_ig_id, commenter_username FROM events WHERE id = ?").get(conv.event_id);
                const mediaIgId = prevEvent ? prevEvent.media_ig_id : null;
                const username = prevEvent ? prevEvent.commenter_username : 'follower';

                const insertEvent = db.prepare(`
                    INSERT INTO events (rule_id, commenter_ig_id, commenter_username, media_ig_id, tracking_id, created_at, dm_status)
                    VALUES (?, ?, ?, ?, ?, ?, 'pending')
                `);

                const eventResult = insertEvent.run(
                    rule.id, senderId, username, mediaIgId, trackingId, new Date().toISOString()
                );

                db.prepare("UPDATE conversations SET state = 'completed', completed_at = ? WHERE id = ?").run(new Date().toISOString(), conv.id);

                enqueue({
                    type: 'direct_message',
                    recipientId: senderId,
                    messageText: messageToSend,
                    eventId: eventResult.lastInsertRowid,
                    processAt: Date.now()
                });
            }
        }
    }
}

module.exports = {
    processCommentEvent,
    processMessageEvent
};
