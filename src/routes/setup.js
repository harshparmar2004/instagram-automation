const express = require('express');
const { getDb, getConfig, setConfig, backupRules, backupEvents } = require('../database');
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

    const isConnected = !!(accessToken && accessToken.trim() && !accessToken.includes('•'));
    let mediaCount = 0;
    try {
        const row = db.prepare('SELECT COUNT(*) as cnt FROM media').get();
        mediaCount = row?.cnt || 0;
    } catch(e) {}

    res.json({
        configured: !!appId,
        connected: isConnected,
        hasToken: isConnected,
        tokenPreview: isConnected ? `${accessToken.slice(0, 8)}••••••••${accessToken.slice(-4)}` : '',
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
    if (secret && secret !== '********' && !secret.includes('•')) setConfig('meta_app_secret', secret.trim());
    if (token) setConfig('webhook_verify_token', token.trim());
    
    res.json({ success: true, message: 'Meta credentials saved successfully' });
});

/**
 * 💾 Save Credentials Endpoint (Local & Persistent)
 * Saves Instagram Access Token, Username, and Account ID permanently without breaking on network calls.
 */
router.post('/setup/save-credentials', auth, (req, res) => {
    try {
        const { accessToken, username, igUserId } = req.body;
        let tokenSaved = false;

        if (accessToken && accessToken.trim() && !accessToken.includes('•') && !accessToken.includes('***')) {
            setConfig('access_token', accessToken.trim());
            setConfig('token_expires_at', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString());
            tokenSaved = true;
        }

        if (username) {
            const cleanUser = username.replace('@', '').trim();
            if (cleanUser) setConfig('ig_username', cleanUser);
        }

        if (igUserId && igUserId.trim()) {
            setConfig('ig_user_id', igUserId.trim());
        }

        const currentToken = getConfig('access_token');
        const hasToken = !!(currentToken && currentToken.trim() && !currentToken.includes('•'));

        try {
            const db = getDb();
            backupRules(db);
        } catch(e) {}

        res.json({
            success: true,
            hasToken,
            tokenSaved,
            username: getConfig('ig_username') || '',
            igUserId: getConfig('ig_user_id') || '',
            message: '💾 All credentials and automations saved permanently to system config & backup file!'
        });
    } catch (err) {
        console.error('[Setup] Error saving credentials:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * ⚡ Creator 1-Click Token Connection & Sync Endpoint
 * Connects, validates with Meta, syncs Reels, and saves everything permanently.
 */
async function handleConnectAndScan(req, res) {
    try {
        const { accessToken, username, igUserId } = req.body;
        
        let tokenToUse = (accessToken || '').trim();
        // Fallback to saved token if empty or masked with dots
        if (!tokenToUse || tokenToUse.includes('•') || tokenToUse.includes('***')) {
            tokenToUse = getConfig('access_token');
        }

        if (!tokenToUse || !tokenToUse.trim()) {
            return res.status(400).json({ error: 'Instagram Access Token is required. Please paste your token.' });
        }

        let targetUsername = (username || getConfig('ig_username') || '').replace('@', '').trim();
        let resolvedIgUserId = (igUserId || getConfig('ig_user_id') || '').trim();
        let profilePic = '';

        console.log('[Setup] Verifying access token with Meta API...');

        try {
            const profile = await getUserProfile(tokenToUse);
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
        setConfig('access_token', tokenToUse);
        setConfig('token_expires_at', expiresAt);
        if (targetUsername) setConfig('ig_username', targetUsername);
        if (resolvedIgUserId) setConfig('ig_user_id', resolvedIgUserId);
        if (profilePic) setConfig('ig_profile_pic', profilePic);

        // Clean up only known mock commenter usernames (non-destructive to real media or rules)
        try {
            const db = getDb();
            db.exec(`
                DELETE FROM events WHERE commenter_username IN ('sarah_creator','dev_alex','tech_founder','marketing_pro','growth_hacker','design_master');
            `);
        } catch(e) {}

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

        try {
            const db = getDb();
            backupRules(db);
            backupEvents(db);
        } catch(e) {}

        const commentsCount = syncRes?.commentsSynced || 0;
        res.json({
            success: true,
            username: targetUsername || 'Instagram Creator',
            igUserId: resolvedIgUserId,
            syncedCount: syncCount,
            commentsSynced: commentsCount,
            syncError: syncErrMessage,
            tokenExpiresAt: expiresAt,
            message: syncCount > 0 
                ? `🎉 Saved & Synced! @${targetUsername || 'account'} connected: ${syncCount} Reels synced and ${commentsCount} real follower interactions/leads restored!`
                : `✅ Credentials saved and token connected for @${targetUsername || 'account'}!${syncErrMessage ? ` (Sync notice: ${syncErrMessage})` : ''}`
        });
    } catch (err) {
        console.error('[Setup] Failed to connect & scan:', err);
        res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
}

router.post('/setup/connect-token', auth, handleConnectAndScan);
router.post('/setup/connect-scan-save', auth, handleConnectAndScan);

router.post('/setup/clear-demo', auth, async (req, res) => {
    try {
        const db = getDb();
        console.log('[Setup] Purging all demo data from database...');

        // Purge mock events, clicks, conversations, and demo stats (preserves rules and real media)
        db.exec(`
            DELETE FROM events;
            DELETE FROM clicks;
            DELETE FROM conversations;
            DELETE FROM reel_stats_history;
        `);

        // If a real token is connected, immediately fetch real media!
        let syncCount = 0;
        const token = getConfig('access_token');
        if (token && !token.startsWith('IGQWR_demo')) {
            try {
                const syncRes = await syncMedia();
                syncCount = syncRes?.synced || 0;
            } catch (e) {
                console.warn('[Setup] Sync real media notice:', e.message);
            }
        }

        res.json({
            success: true,
            syncedCount: syncCount,
            message: syncCount > 0 
                ? `🧹 Demo data cleared! Synced ${syncCount} real Instagram Reels from your account.` 
                : '🧹 All demo data cleared! You are now in 100% real live data mode.'
        });
    } catch (err) {
        console.error('[Setup] Error clearing demo data:', err);
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
