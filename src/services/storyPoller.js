const axios = require('axios');
const { getDb, getConfig } = require('../database');

const IG_API = 'https://graph.instagram.com/v22.0';
const MAX_AGE_MS = 23 * 60 * 60 * 1000; // stay inside Meta's 24h messaging window
const lastSeen = new Map();

/**
 * Safety net for story replies & keyword DMs: Meta does not always deliver `messages` webhooks
 * (e.g. app in Development mode / tester roles). This polls the Conversations API
 * every 10 seconds and feeds any unhandled story reply or keyword DM through the automation engine.
 * De-duplication is done by message id (stored as events.comment_id).
 */
async function pollStoryReplies() {
    const token = getConfig('access_token');
    if (!token || token.length < 30) return { processed: 0 };

    const myUsername = (getConfig('ig_username') || '').toLowerCase().replace('@', '').trim();
    const myIgUserId = String(getConfig('ig_user_id') || '').trim();
    if (!myIgUserId) return { processed: 0 };

    const { processMessageEvent } = require('./automation');
    const db = getDb();
    let processed = 0;

    let convs;
    try {
        const res = await axios.get(`${IG_API}/me/conversations`, {
            params: { platform: 'instagram', fields: 'id,updated_time', limit: 25, access_token: token },
            timeout: 15000
        });
        convs = res.data?.data || [];
    } catch (err) {
        console.warn('[StoryPoller] Conversations fetch notice:', err.response?.data?.error?.message || err.message);
        return { processed: 0 };
    }

    const cutoff = Date.now() - MAX_AGE_MS;

    for (const conv of convs) {
        if (conv.updated_time && new Date(conv.updated_time).getTime() < cutoff) continue;
        if (conv.updated_time && lastSeen.get(conv.id) === conv.updated_time) continue;

        let messages = [];
        try {
            const res = await axios.get(`${IG_API}/${conv.id}`, {
                params: {
                    fields: 'messages.limit(10){id,created_time,from,message,story}',
                    access_token: token
                },
                timeout: 15000
            });
            messages = res.data?.messages?.data || [];
            if (conv.updated_time) lastSeen.set(conv.id, conv.updated_time);
        } catch (err) {
            continue;
        }

        // oldest first so replies are handled in chronological order
        messages.sort((a, b) => new Date(a.created_time) - new Date(b.created_time));

        for (const m of messages) {
            const storyReplyId = m.story?.reply_to?.id;
            const isMention = !!m.story?.mention;
            const rawText = (m.message || '').trim();

            // Must be a story reply, mention, or a message containing text
            if (!storyReplyId && !isMention && !rawText) continue;

            // If it's a regular DM (not story reply/mention), only process if it matches an active rule keyword
            if (!storyReplyId && !isMention) {
                const activeRules = db.prepare("SELECT trigger_keyword FROM rules WHERE is_active = 1 AND (is_deleted = 0 OR is_deleted IS NULL)").all();
                const matchesAny = activeRules.some(r => {
                    const kw = (r.trigger_keyword || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
                    const t = rawText.toLowerCase();
                    return kw.some(k => k === '*' || k === 'any' || t.includes(k));
                });
                if (!matchesAny) continue;
            }

            const fromUsername = (m.from?.username || '').toLowerCase();
            if (!m.from?.id || (myUsername && fromUsername === myUsername)) continue;
            if (new Date(m.created_time).getTime() < cutoff) continue;

            const already = db.prepare('SELECT id FROM events WHERE comment_id = ?').get(m.id);
            if (already) continue;

            const payload = {
                object: 'instagram',
                entry: [{
                    id: myIgUserId,
                    time: Math.floor(new Date(m.created_time).getTime() / 1000),
                    messaging: [{
                        sender: { id: String(m.from.id), username: m.from.username },
                        recipient: { id: myIgUserId },
                        timestamp: new Date(m.created_time).getTime(),
                        message: {
                            mid: m.id,
                            text: rawText,
                            ...(storyReplyId
                                ? { reply_to: { story: { id: String(storyReplyId) } } }
                                : (isMention ? { attachments: [{ type: 'story_mention', payload: {} }] } : {}))
                        }
                    }]
                }]
            };

            try {
                console.log(`[StoryPoller] ⚡ Processing message from @${m.from.username}: "${rawText}" (story: ${storyReplyId || 'none'})`);
                await processMessageEvent(payload);
                processed++;
            } catch (err) {
                console.warn('[StoryPoller] Processing notice:', err.message);
            }
        }
    }

    return { processed };
}

module.exports = { pollStoryReplies };
