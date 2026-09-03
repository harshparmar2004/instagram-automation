const express = require('express');
const { getConfig, setConfig } = require('../database');
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

module.exports = router;
