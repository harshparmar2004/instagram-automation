const express = require('express');
const { getConfig, setConfig } = require('../database');
const auth = require('../middleware/auth');
const { subscribeWebhook, getUserProfile } = require('../services/instagram');
const { seedDemoData } = require('../seedData');
const { syncMedia } = require('../services/mediaSync');
const config = require('../config');
const axios = require('axios');

const router = express.Router();

router.get('/status', auth, (req, res) => {
    const db = getDb();
    const appId = getConfig('meta_app_id');
    const appSecret = getConfig('meta_app_secret');
    const verifyToken = getConfig('webhook_verify_token');
    const accessToken = getConfig('access_token');
    const tokenExpiresAt = getConfig('token_expires_at');
    const igUsername = getConfig('ig_username');
    const igUserId = getConfig('ig_user_id');
    
    let tokenHealth = null;
    if (tokenExpiresAt) {
        const daysLeft = Math.floor((new Date(tokenExpiresAt) - new Date()) / (1000 * 60 * 60 * 24));
        tokenHealth = daysLeft > 10 ? 'healthy' : daysLeft > 0 ? 'expiring' : 'expired';
    }

    const isConnected = !!(accessToken && accessToken.trim());
    let mediaCount = 0;
    try {
        const row = db.prepare('SELECT COUNT(*) as cnt FROM media').get();
        mediaCount = row?.cnt || 0;
    } catch(e) {}

    res.json({
        configured: !!appId,
        connected: isConnected,
        username: igUsername || (isConnected ? 'connected.creator' : ''),
        igUserId: igUserId || '',
        profilePic: getConfig('ig_profile_pic') || '',
        webhookSubscribed: getConfig('webhook_subscribed') === '1',
        appId: appId || '',
        hasSecret: !!appSecret,
        verifyToken: verifyToken || '',
        tokenHealth: isConnected ? (tokenHealth || 'healthy') : 'disconnected',
        tokenExpiresAt: tokenExpiresAt || '',
        mediaCount: mediaCount
    });
});

router.post('/setup', auth, (req, res) => {
    const { appId, appSecret, verifyToken, meta_app_id, meta_app_secret, webhook_verify_token } = req.body;
    
    const id = appId || meta_app_id;
    const secret = appSecret || meta_app_secret;
    const token = verifyToken || webhook_verify_token;

    if (id) setConfig('meta_app_id', id.trim());
    if (secret && secret !== '********') setConfig('meta_app_secret', secret.trim());
    if (token) setConfig('webhook_verify_token', token.trim());
    
    res.json({ success: true, message: 'Meta credentials saved successfully' });
});

/**
 * ⚡ Creator 1-Click Token Connection Endpoint
 * Allows creators to enter their Instagram Access Token directly!
 */
router.post('/setup/connect-token', auth, async (req, res) => {
    try {
        const { accessToken, username, igUserId } = req.body;
        if (!accessToken || !accessToken.trim()) {
            return res.status(400).json({ error: 'Access token is required' });
        }

        const trimmedToken = accessToken.trim();
        let targetUsername = (username || '').replace('@', '').trim();
        let resolvedIgUserId = (igUserId || '').trim();
        let profilePic = '';

        console.log('[Setup] Verifying access token with Meta API...');

        try {
            const profile = await getUserProfile(trimmedToken);
            if (profile?.id) {
                resolvedIgUserId = profile.id;
            }
            if (profile?.username) {
                targetUsername = profile.username;
            }
            if (profile?.profile_picture_url) {
                profilePic = profile.profile_picture_url;
            }
        } catch (profileErr) {
            console.warn('[Setup] Profile auto-lookup notice:', profileErr.message);
            if (!resolvedIgUserId && !targetUsername) {
                return res.status(400).json({
                    error: `Meta rejected token: ${profileErr.message}. Ensure token is valid and has 'instagram_basic' permission.`
                });
            }
        }

        const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
        setConfig('access_token', trimmedToken);
        setConfig('token_expires_at', expiresAt);
        if (targetUsername) setConfig('ig_username', targetUsername);
        if (resolvedIgUserId) setConfig('ig_user_id', resolvedIgUserId);
        if (profilePic) setConfig('ig_profile_pic', profilePic);

        // Immediately run media sync
        let syncCount = 0;
        let syncErrMessage = null;
        try {
            const syncRes = await syncMedia();
            syncCount = syncRes?.synced || 0;
        } catch (syncErr) {
            console.warn('[Setup] Post-connection media sync notice:', syncErr.message);
            syncErrMessage = syncErr.message;
        }

        res.json({
            success: true,
            username: targetUsername || 'Instagram Creator',
            igUserId: resolvedIgUserId,
            syncedCount: syncCount,
            syncError: syncErrMessage,
            tokenExpiresAt: expiresAt,
            message: syncCount > 0 
                ? `🎉 Success! @${targetUsername || 'account'} connected and ${syncCount} live Instagram Reels synced!`
                : `✅ Token connected for @${targetUsername || 'account'}!${syncErrMessage ? ` (Sync notice: ${syncErrMessage})` : ''}`
        });
    } catch (err) {
        console.error('[Setup] Failed to connect token:', err);
        res.status(500).json({ error: err.response?.data?.error?.message || err.message });
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
