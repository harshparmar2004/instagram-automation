const express = require('express');
const { getConfig, setConfig } = require('../database');
const auth = require('../middleware/auth');
const webhookVerify = require('../middleware/webhookVerify');
const { processCommentEvent, processMessageEvent } = require('../services/automation');
const router = express.Router();

router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const dbToken = getConfig('webhook_verify_token');
    const validTokens = [
        dbToken,
        'creator_verify_token_2026',
        process.env.WEBHOOK_VERIFY_TOKEN
    ].filter(Boolean);

    console.log('[Webhook] Verification request:', { mode, token, validTokens });

    if (mode === 'subscribe' && (validTokens.includes(token) || !dbToken)) {
        if (token && token !== dbToken) {
            setConfig('webhook_verify_token', token);
        }
        console.log('[Webhook] Verified challenge successfully');
        return res.status(200).send(challenge);
    } else {
        console.warn('[Webhook] Verification rejected. Received:', token, 'Expected:', validTokens);
        return res.sendStatus(403);
    }
});

router.post('/', webhookVerify, async (req, res) => {
    // Always respond 200 immediately to avoid timeouts
    res.sendStatus(200);

    try {
        const payload = JSON.parse(req.body.toString());
        if (payload.object === 'instagram' || payload.object === 'page') {
            await processCommentEvent(payload);
            await processMessageEvent(payload);
        }
    } catch (err) {
        console.error('[Webhook] Error processing payload:', err);
    }
});

router.post('/simulate', auth, async (req, res) => {
    try {
        let bodyData = {};
        if (Buffer.isBuffer(req.body)) {
            try { bodyData = JSON.parse(req.body.toString()); } catch(e) {}
        } else if (typeof req.body === 'object') {
            bodyData = req.body || {};
        }

        const { media_id, comment_text, username } = bodyData;
        const fakeCommentId = 'sim_' + Date.now();
        const payload = {
            object: 'instagram',
            entry: [{
                id: getConfig('ig_user_id') || '17841400000000000',
                time: Math.floor(Date.now() / 1000),
                changes: [{
                    field: 'comments',
                    value: {
                        from: {
                            id: 'tester_' + Math.floor(Math.random() * 100000),
                            username: username || 'test_fan'
                        },
                        media: {
                            id: media_id || '18622844845054711'
                        },
                        id: fakeCommentId,
                        text: comment_text || 'GOOGLE'
                    }
                }]
            }]
        };

        await processCommentEvent(payload);
        res.json({
            success: true,
            message: `Test comment "${comment_text || 'GOOGLE'}" processed through automation engine!`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
