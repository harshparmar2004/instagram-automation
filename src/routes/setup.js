const express = require('express');
const { getConfig, setConfig } = require('../database');
const auth = require('../middleware/auth');
const { subscribeWebhook } = require('../services/instagram');
const { seedDemoData } = require('../seedData');
const config = require('../config');

const router = express.Router();

router.get('/status', auth, (req, res) => {
    const appId = getConfig('meta_app_id');
    const appSecret = getConfig('meta_app_secret');
    const verifyToken = getConfig('webhook_verify_token');
    const accessToken = getConfig('access_token');
    const tokenExpiresAt = getConfig('token_expires_at');
    
    let tokenHealth = null;
    if (tokenExpiresAt) {
        const daysLeft = Math.floor((new Date(tokenExpiresAt) - new Date()) / (1000 * 60 * 60 * 24));
        tokenHealth = daysLeft > 10 ? 'healthy' : daysLeft > 0 ? 'expiring' : 'expired';
    }

    res.json({
        configured: !!appId,
        connected: !!accessToken,
        username: getConfig('ig_username'),
        profilePic: getConfig('ig_profile_pic'),
        webhookSubscribed: getConfig('webhook_subscribed') === '1',
        appId: appId || '',
        hasSecret: !!appSecret,
        verifyToken: verifyToken || '',
        tokenHealth,
        tokenExpiresAt
    });
});

router.post('/setup', auth, (req, res) => {
    const { appId, appSecret, verifyToken, meta_app_id, meta_app_secret, webhook_verify_token } = req.body;
    
    const id = appId || meta_app_id;
    const secret = appSecret || meta_app_secret;
    const token = verifyToken || webhook_verify_token;

    if (id) setConfig('meta_app_id', id);
    if (secret && secret !== '********') setConfig('meta_app_secret', secret);
    if (token) setConfig('webhook_verify_token', token);
    
    res.json({ success: true });
});

router.post('/setup/seed', auth, (req, res) => {
    try {
        seedDemoData();
        res.json({ success: true, message: 'Demo creator data populated successfully!' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/setup/subscribe-webhook', auth, async (req, res) => {
    const appId = getConfig('meta_app_id');
    const appSecret = getConfig('meta_app_secret');
    const verifyToken = getConfig('webhook_verify_token');
    const callbackUrl = `${config.BASE_URL}/webhook`;

    if (!appId || !appSecret || !verifyToken) {
        return res.status(400).json({ error: 'Missing configuration' });
    }

    try {
        const data = await subscribeWebhook(appId, appSecret, callbackUrl, verifyToken);
        setConfig('webhook_subscribed', '1');
        res.json({ success: true, data });
    } catch (err) {
        console.error('[Setup] Webhook subscribe error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to subscribe webhook', details: err.response?.data });
    }
});

module.exports = router;
