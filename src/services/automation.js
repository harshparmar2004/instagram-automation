const { getDb, getConfig, getInstagramAccountByIgId } = require('../database');
const { getSingleMedia } = require('./instagram');
const { enqueue } = require('./queue');
const { syncLeadToSheet } = require('./googleSheets');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

async function ensureMediaExists(mediaIgId, token = null, userId = null) {
    if (!mediaIgId) return null;
    const db = getDb();
    const existing = db.prepare("SELECT id FROM media WHERE ig_media_id = ?").get(mediaIgId);
    if (existing) return existing.id;

    const activeToken = token || getConfig('access_token');
    if (!activeToken) return null;

    try {
        const item = await getSingleMedia(activeToken, mediaIgId);
        if (item && item.id) {
            const productType = item.media_product_type || (item.media_type === 'VIDEO' ? 'REELS' : 'FEED');
            const res = db.prepare(`
                INSERT INTO media (
                    ig_media_id, media_type, media_product_type, caption, 
                    thumbnail_url, media_url, permalink, timestamp, 
                    comments_count, like_count, user_id, synced_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                userId,
                new Date().toISOString()
            );
            console.log(`[Automation] Auto-synced new media item ${mediaIgId} on comment event for user ${userId || 'default'}`);
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

function findMatchingRule(mediaIgId, commentText, userId = null) {
    const db = getDb();
    let query = `
        SELECT r.*, 
               COALESCE(m.ig_media_id, (SELECT ig_media_id FROM media WHERE id = r.media_id OR ig_media_id = r.media_id LIMIT 1)) as ig_media_id
        FROM rules r 
        LEFT JOIN media m ON (r.media_id = m.id OR r.media_id = m.ig_media_id)
        WHERE r.is_active = 1
    `;
    const params = [];
    if (userId) {
        query += ` AND (r.user_id = ? OR r.user_id IS NULL)`;
        params.push(userId);
    }
    const rules = db.prepare(query).all(...params);

    console.log(`[Automation] Searching rule for media: "${mediaIgId}" (user: ${userId || 'any'}), found ${rules.length} active rule(s)`);

    // 1. Try matching rule attached to this specific Instagram media ID
    for (const rule of rules) {
        if (rule.ig_media_id && mediaIgId && String(rule.ig_media_id) === String(mediaIgId)) {
            if (matchKeyword(rule.trigger_keyword, commentText)) {
                return rule;
            }
        }
    }

    // 2. Try matching by local DB media ID or raw ID
    for (const rule of rules) {
        if (rule.media_id && mediaIgId && (String(rule.media_id) === String(mediaIgId) || String(rule.ig_media_id) === String(mediaIgId))) {
            if (matchKeyword(rule.trigger_keyword, commentText)) {
                return rule;
            }
        }
    }

    // 3. Try global rules (media_id is null / 'global' / applies to all reels)
    for (const rule of rules) {
        if (!rule.media_id || rule.media_id === 'global') {
            if (matchKeyword(rule.trigger_keyword, commentText)) {
                return rule;
            }
        }
    }

    // 4. Smart Fallback: If keyword matches and rule exists on creator's account
    for (const rule of rules) {
        if (matchKeyword(rule.trigger_keyword, commentText)) {
            console.log(`[Automation] ⚡ Keyword matched rule #${rule.id} ("${rule.trigger_keyword}") via creator account fallback`);
            return rule;
        }
    }

    return null;
}

async function processCommentEvent(payload) {
    const db = getDb();

    for (const entry of payload.entry || []) {
        // Multi-tenant resolution: Resolve Instagram Business Account to workspace user
        const igAccountId = entry.id;
        const linkedAccount = getInstagramAccountByIgId(igAccountId);
        const targetUserId = linkedAccount ? linkedAccount.user_id : null;
        const activeToken = linkedAccount ? linkedAccount.access_token : getConfig('access_token');

        for (const change of entry.changes || []) {
            if (change.field === 'comments') {
                const comment = change.value;
                const commentId = comment.id || comment.comment_id;
                const text = comment.text || '';
                const from = comment.from;
                const mediaId = comment.media_id || (comment.media && comment.media.id);

                console.log(`[Automation] 📩 Incoming comment: "${text}" from @${from?.username || from?.id || 'unknown'} on media ${mediaId} (Account: ${igAccountId}, User: ${targetUserId || 'legacy'})`);

                if (!from) {
                    console.log('[Automation] Skipping comment with no sender info');
                    continue;
                }

                // Identify the commenter and creator credentials
                const commenterUsername = (from.username || '').toLowerCase().replace('@', '').trim();
                const commenterId = String(from.id || '').trim();
                const myUsername = (linkedAccount?.ig_username || getConfig('ig_username') || '').toLowerCase().replace('@', '').trim();
                const myIgUserId = String(linkedAccount?.ig_user_id || getConfig('ig_user_id') || '').trim();
                const accountEntryId = String(entry.id || '').trim();

                // 🛑 CRITICAL SHIELD: Ignore comments made by the creator or bot itself to prevent infinite DM loops!
                if (
                    (myUsername && commenterUsername === myUsername) ||
                    (myIgUserId && commenterId === myIgUserId) ||
                    commenterId === accountEntryId
                ) {
                    console.log(`[Automation] 🛑 Skipping comment from own account (@${from.username || from.id}). Account owner comments do NOT trigger DMs.`);
                    continue;
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

                // Auto-fetch media record if freshly posted and not yet in local DB
                if (mediaId) {
                    await ensureMediaExists(mediaId, activeToken, targetUserId);
                }

                const rule = findMatchingRule(mediaId, text, targetUserId);
                if (!rule) {
                    console.log(`[Automation] No active rule matched keyword for text: "${text}" on media ${mediaId}`);
                    continue;
                }

                console.log(`[Automation] 🎯 Rule #${rule.id} ("${rule.trigger_keyword}") matched for comment ${commentId}! Action: ${rule.action_type}`);

                let trackingId = null;
                let messageToSend = '';
                const baseResponse = (getRandomResponseText(rule) || '').trim();
                let finalLink = (rule.link_url || '').trim();
                if (finalLink && !/^https?:\/\//i.test(finalLink)) {
                    finalLink = 'https://' + finalLink;
                }

                let btnCfg = null;
                if (rule.buttons_config_json) {
                    try { btnCfg = JSON.parse(rule.buttons_config_json); } catch(e) {}
                }

                let messagePayload = null;

                if (rule.action_type === 'direct_dm') {
                    messageToSend = baseResponse;
                } else if (rule.action_type === 'link_dm') {
                    // Send the real, direct link URL configured by creator (no broken redirect cloaks)
                    if (finalLink) {
                        if (baseResponse.includes('{link}')) {
                            messageToSend = baseResponse.replace(/\{link\}/gi, finalLink);
                        } else if (baseResponse.includes('{url}')) {
                            messageToSend = baseResponse.replace(/\{url\}/gi, finalLink);
                        } else if (baseResponse.includes(finalLink)) {
                            messageToSend = baseResponse;
                        } else {
                            messageToSend = baseResponse ? `${baseResponse}\n${finalLink}` : finalLink;
                        }
                    } else {
                        messageToSend = baseResponse || 'Here is your requested link!';
                    }
                } else if (rule.action_type === 'follow_first') {
                    const isButtonMode = !btnCfg || btnCfg.gate_type !== 'text';
                    if (isButtonMode) {
                        const step1Text = btnCfg?.step1_text || "Hey there! Glad you're here ☺️\n\nTap below and I'll send you the access in just a moment ✨";
                        const step1Button = (btnCfg?.step1_button || "Send me the access").slice(0, 20);
                        messageToSend = step1Text;
                        messagePayload = {
                            text: step1Text,
                            quick_replies: [
                                {
                                    content_type: 'text',
                                    title: step1Button,
                                    payload: 'REQ_ACCESS'
                                }
                            ]
                        };
                    } else {
                        messageToSend = rule.follow_prompt || `Hey @${from.username || 'friend'}! 🚀 Thanks for commenting! Please follow us first, then reply "DONE" in this DM to unlock your link!`;
                    }
                }

                const insertEvent = db.prepare(`
                    INSERT INTO events (rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, tracking_id, user_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                const eventResult = insertEvent.run(
                    rule.id, commentId, text, from.id, from.username || 'user', mediaId, trackingId, targetUserId, new Date().toISOString()
                );
                
                const eventId = eventResult.lastInsertRowid;

                // Asynchronously sync lead to Google Sheet (non-blocking)
                syncLeadToSheet({
                    eventId,
                    date: new Date().toLocaleString(),
                    username: from.username || 'user',
                    comment: text,
                    keyword: rule.trigger_keyword,
                    action_type: rule.action_type,
                    status: 'delivered',
                    mediaIgId: mediaId,
                    linkClicked: false
                }).catch(() => {});

                if (rule.action_type === 'follow_first') {
                    const isButtonMode = !btnCfg || btnCfg.gate_type !== 'text';
                    const initialState = isButtonMode ? 'awaiting_access_tap' : 'awaiting_reply';
                    db.prepare(`
                        INSERT INTO conversations (commenter_ig_id, rule_id, event_id, user_id, state, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(from.id, rule.id, eventId, targetUserId, initialState, new Date().toISOString());
                }

                const delayMs = (rule.delay_seconds || 0) * 1000;
                const processAt = Date.now() + delayMs;

                enqueue({
                    type: 'private_reply',
                    commentId: commentId,
                    commenterId: from.id,
                    messagePayload: messagePayload || messageToSend,
                    messageText: messageToSend,
                    publicReply: rule.public_reply || null,
                    eventId: eventId,
                    accessToken: activeToken,
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
        const igAccountId = entry.id;
        const linkedAccount = getInstagramAccountByIgId(igAccountId);
        const targetUserId = linkedAccount ? linkedAccount.user_id : null;
        const activeToken = linkedAccount ? linkedAccount.access_token : getConfig('access_token');

        for (const msgEvent of entry.messaging || []) {
            const senderId = msgEvent.sender.id;
            const text = msgEvent.message?.text;
            const postbackPayload = msgEvent.postback?.payload || '';
            const quickReplyPayload = msgEvent.message?.quick_reply?.payload || '';
            const rawText = msgEvent.message?.text || msgEvent.postback?.title || '';
            const tLower = rawText.toLowerCase().trim();

            // Skip self-messages from account itself
            if (senderId === igAccountId || senderId === linkedAccount?.ig_user_id || senderId === getConfig('ig_user_id')) {
                continue;
            }

            if (msgEvent.message && msgEvent.message.attachments) {
                const storyShare = msgEvent.message.attachments.find(a => a.type === 'story_mention' || a.type === 'ig_story');
                if (storyShare) {
                    console.log(`[Automation] Story mention received from sender ${senderId}`);
                    let storyQuery = "SELECT * FROM rules WHERE trigger_keyword LIKE '%story%' AND is_active = 1";
                    const params = [];
                    if (targetUserId) {
                        storyQuery += " AND (user_id = ? OR user_id IS NULL)";
                        params.push(targetUserId);
                    }
                    storyQuery += " LIMIT 1";
                    const storyRule = db.prepare(storyQuery).get(...params);
                    if (storyRule) {
                        const messageToSend = getRandomResponseText(storyRule);
                        enqueue({
                            type: 'direct_message',
                            recipientId: senderId,
                            messageText: messageToSend,
                            accessToken: activeToken,
                            processAt: Date.now()
                        });
                    }
                }
            }

            if (!rawText && !postbackPayload && !quickReplyPayload) continue;

            // FOLLOW-FIRST GATE STATE MACHINE (3-Step Button Funnel & Text Fallback)
            let convQuery = "SELECT * FROM conversations WHERE commenter_ig_id = ? AND state IN ('awaiting_access_tap', 'awaiting_follow_confirm', 'awaiting_reply')";
            const convParams = [senderId];
            if (targetUserId) {
                convQuery += " AND (user_id = ? OR user_id IS NULL)";
                convParams.push(targetUserId);
            }
            convQuery += " ORDER BY id DESC LIMIT 1";
            const conv = db.prepare(convQuery).get(...convParams);
            if (!conv) continue;

            const rule = db.prepare("SELECT * FROM rules WHERE id = ?").get(conv.rule_id);
            if (!rule) continue;

            let btnCfg = null;
            if (rule.buttons_config_json) {
                try { btnCfg = JSON.parse(rule.buttons_config_json); } catch(e) {}
            }

            // STAGE 1 -> STAGE 2: Follower tapped [ Send me the access ]
            if (conv.state === 'awaiting_access_tap') {
                const isAccessTap = postbackPayload === 'REQ_ACCESS' || 
                                    quickReplyPayload === 'REQ_ACCESS' || 
                                    ['access', 'send', 'send me', 'want', 'link'].some(kw => tLower.includes(kw)) ||
                                    rawText.length > 0; // Any reply to Step 1 unlocks the 24-hr window!

                if (isAccessTap) {
                    console.log(`[Automation] Follower ${senderId} requested access! Transitioning to Follow Gate (Step 2)...`);
                    
                    db.prepare("UPDATE conversations SET state = 'awaiting_follow_confirm' WHERE id = ?").run(conv.id);

                    const step2Text = btnCfg?.step2_text || "Almost there !\nPlease visit my profile and tap follow to continue 😄";
                    const profileBtnTitle = (btnCfg?.step2_profile_button || "Visit Profile").slice(0, 20);
                    const followBtnTitle = (btnCfg?.step2_confirm_button || "I'm following ✅").slice(0, 20);

                    const myHandle = (linkedAccount?.ig_username || getConfig('ig_username') || '').replace('@', '').trim();
                    const profileUrl = myHandle ? `https://instagram.com/${myHandle}` : 'https://instagram.com';

                    const step2Payload = {
                        attachment: {
                            type: 'template',
                            payload: {
                                template_type: 'button',
                                text: step2Text,
                                buttons: [
                                    {
                                        type: 'web_url',
                                        url: profileUrl,
                                        title: profileBtnTitle
                                    },
                                    {
                                        type: 'postback',
                                        title: followBtnTitle,
                                        payload: 'CONFIRMED_FOLLOW'
                                    }
                                ]
                            }
                        }
                    };

                    enqueue({
                        type: 'direct_message',
                        recipientId: senderId,
                        messagePayload: step2Payload,
                        messageText: step2Text,
                        accessToken: activeToken,
                        processAt: Date.now()
                    });
                    continue;
                }
            }

            // STAGE 2 -> STAGE 3: Follower tapped [ I'm following ✅ ] or replied "DONE"
            if (conv.state === 'awaiting_follow_confirm' || conv.state === 'awaiting_reply') {
                const isFollowConfirmation = postbackPayload === 'CONFIRMED_FOLLOW' ||
                                             quickReplyPayload === 'CONFIRMED_FOLLOW' ||
                                             ['done', 'followed', 'following', 'i followed', "i'm following", 'following you', 'ok', 'yes', 'send', 'check'].some(kw => tLower.includes(kw));

                if (isFollowConfirmation) {
                    console.log(`[Automation] Follower ${senderId} confirmed follow status! Delivering resource link (Step 3)...`);

                    let directLink = (rule.link_url || '').trim();
                    if (directLink && !/^https?:\/\//i.test(directLink)) {
                        directLink = 'https://' + directLink;
                    }

                    const isButtonMode = !btnCfg || btnCfg.gate_type !== 'text';
                    const defaultDeliverText = 'Dost appko document bejhdiya hai bahut mehnat sa bnaya hai please follow';
                    const finalDeliverableText = btnCfg?.step3_text || (getRandomResponseText(rule) || '').trim() || defaultDeliverText;
                    const clickBtnTitle = (btnCfg?.step3_button || 'Click me').slice(0, 20);

                    let step3Payload = null;
                    let messageToSend = '';

                    if (isButtonMode && directLink) {
                        step3Payload = {
                            attachment: {
                                type: 'template',
                                payload: {
                                    template_type: 'button',
                                    text: finalDeliverableText,
                                    buttons: [
                                        {
                                            type: 'web_url',
                                            url: directLink,
                                            title: clickBtnTitle
                                        }
                                    ]
                                }
                            }
                        };
                        messageToSend = `${finalDeliverableText}\n${directLink}`;
                    } else {
                        if (directLink) {
                            if (finalDeliverableText && !finalDeliverableText.includes(directLink)) {
                                messageToSend = `${finalDeliverableText}\n${directLink}`;
                            } else {
                                messageToSend = finalDeliverableText || `🎉 Thank you for following! Here is your requested link:\n${directLink}`;
                            }
                        } else {
                            messageToSend = finalDeliverableText || '🎉 Thank you for following!';
                        }
                    }

                    const prevEvent = db.prepare("SELECT media_ig_id, commenter_username FROM events WHERE id = ?").get(conv.event_id);
                    const mediaIgId = prevEvent ? prevEvent.media_ig_id : null;
                    const username = prevEvent ? prevEvent.commenter_username : 'follower';

                    const insertEvent = db.prepare(`
                        INSERT INTO events (rule_id, commenter_ig_id, commenter_username, media_ig_id, tracking_id, user_id, created_at, dm_status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
                    `);

                    const eventResult = insertEvent.run(
                        rule.id, senderId, username, mediaIgId, null, targetUserId, new Date().toISOString()
                    );

                    db.prepare("UPDATE conversations SET state = 'completed', completed_at = ? WHERE id = ?").run(new Date().toISOString(), conv.id);

                    enqueue({
                        type: 'direct_message',
                        recipientId: senderId,
                        messagePayload: step3Payload || messageToSend,
                        messageText: messageToSend,
                        eventId: eventResult.lastInsertRowid,
                        accessToken: activeToken,
                        processAt: Date.now()
                    });
                }
            }
        }
    }
}

module.exports = {
    processCommentEvent,
    processMessageEvent
};
