const { getDb } = require('../database');
const { enqueue } = require('./queue');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

function checkDedupComment(commentId) {
    const row = getDb().prepare("SELECT id FROM events WHERE comment_id = ?").get(commentId);
    return !!row;
}

function checkDedupUserForMedia(commenterIgId, mediaIgId) {
    const row = getDb().prepare("SELECT id FROM events WHERE commenter_ig_id = ? AND media_ig_id = ?").get(commenterIgId, mediaIgId);
    return !!row;
}

function matchKeyword(ruleTrigger, textLower) {
    if (!ruleTrigger) return false;
    const keywords = ruleTrigger.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    for (const kw of keywords) {
        const escaped = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        if (textLower.match(new RegExp(`\\b${escaped}\\b`, 'i'))) {
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

    const textLower = commentText.toLowerCase();

    for (const rule of rules) {
        if (rule.ig_media_id === mediaIgId) {
            if (matchKeyword(rule.trigger_keyword, textLower)) {
                return rule;
            }
        }
    }

    for (const rule of rules) {
        if (!rule.media_id) {
            if (matchKeyword(rule.trigger_keyword, textLower)) {
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
                const text = comment.text;
                const from = comment.from;
                const mediaId = comment.media_id || (comment.media && comment.media.id);

                if (!from || from.id === entry.id) {
                    continue; // Skip own comments
                }

                if (checkDedupComment(commentId)) {
                    console.log(`[Automation] Skipping duplicate comment: ${commentId}`);
                    continue;
                }

                if (checkDedupUserForMedia(from.id, mediaId)) {
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

                const rule = findMatchingRule(mediaId, text);
                if (!rule) continue;

                console.log(`[Automation] Rule ${rule.id} (${rule.action_type}) matched for comment ${commentId}`);

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
                    // FOLLOW-FIRST GATE PROMPT
                    messageToSend = rule.follow_prompt || `Hey @${from.username || 'friend'}! 🚀 Thanks for commenting! Please follow @creator.studio first, then reply "I FOLLOWED" or "DONE" in this DM to instantly unlock your free PDF link!`;
                }

                const insertEvent = db.prepare(`
                    INSERT INTO events (rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, tracking_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                const eventResult = insertEvent.run(
                    rule.id, commentId, text, from.id, from.username, mediaId, trackingId, new Date().toISOString()
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
                    messageText: messageToSend,
                    eventId: eventId,
                    processAt
                });
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
