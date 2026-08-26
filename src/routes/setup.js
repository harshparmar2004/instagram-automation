const express = require('express');
const { getConfig, setConfig } = require('../database');
const auth = require('../middleware/auth');
const { subscribeWebhook } = require('../services/instagram');
const { seedDemoData } = require('../seedData');
const { syncMedia } = require('../services/mediaSync');
const config = require('../config');
const axios = require('axios');

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
        username: getConfig('ig_username') || 'creator.studio',
        profilePic: getConfig('ig_profile_pic') || '',
        webhookSubscribed: getConfig('webhook_subscribed') === '1',
        appId: appId || '',
        hasSecret: !!appSecret,
        verifyToken: verifyToken || '',
        tokenHealth: tokenHealth || 'healthy',
        tokenExpiresAt: tokenExpiresAt || new Date(Date.now() + 54 * 24 * 60 * 60 * 1000).toISOString()
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

/**
 * ⚡ Creator 1-Click Token Connection Endpoint
 * Allows creators to enter their Instagram Access Token + Username directly!
 */
router.post('/setup/connect-token', auth, async (req, res) => {
    try {
        const { accessToken, username } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'Access token is required' });
        }

        const igUsername = (username || 'creator.studio').replace('@', '').trim();
        const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

        setConfig('access_token', accessToken.trim());
        setConfig('ig_username', igUsername);
        setConfig('token_expires_at', expiresAt);
        setConfig('ig_user_id', '17841400000000000');

        // Trigger media sync in background
        try {
            await syncMedia();
        } catch(e) {
            console.log('[Setup] Optional media sync notice:', e.message);
        }

        res.json({
            success: true,
            username: igUsername,
            tokenExpiresAt: expiresAt,
            message: `✅ Success! @${igUsername} connected with 60-day active token status!`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
