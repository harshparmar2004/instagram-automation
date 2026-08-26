const express = require('express');
const { getConfig } = require('../database');
const webhookVerify = require('../middleware/webhookVerify');
const { processCommentEvent, processMessageEvent } = require('../services/automation');
const router = express.Router();

router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = getConfig('webhook_verify_token');

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('[Webhook] Verified challenge');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
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
