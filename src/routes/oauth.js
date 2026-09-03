const express = require('express');
const { getConfig, setConfig } = require('../database');
const { exchangeCodeForToken, exchangeLongLivedToken, getUserProfile } = require('../services/instagram');
const config = require('../config');

const router = express.Router();

router.get('/instagram', (req, res) => {
    const appId = getConfig('meta_app_id');
    if (!appId) {
        return res.status(400).send('Meta App ID not configured. Please save your Meta App ID in Settings first.');
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUri = (config.BASE_URL && !config.BASE_URL.includes('localhost'))
        ? `${config.BASE_URL.replace(/\/$/, '')}/auth/instagram/callback`
        : `${protocol}://${host}/auth/instagram/callback`;

    const scope = 'instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement';
    
    const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    res.redirect(authUrl);
});

router.get('/instagram/callback', async (req, res) => {
    const { code, error, error_description } = req.query;

    if (error) {
        return res.status(400).send(`Auth failed: ${error_description}`);
    }

    if (!code) {
        return res.status(400).send('No code provided');
    }

    try {
        console.log('[OAuth] Exchanging code for token');
        const shortTokenData = await exchangeCodeForToken(code);
        
        console.log('[OAuth] Exchanging for long-lived token');
        const longTokenData = await exchangeLongLivedToken(shortTokenData.access_token);
        
        const token = longTokenData.access_token;
        const expiresAt = new Date(Date.now() + longTokenData.expires_in * 1000).toISOString();
        
        console.log('[OAuth] Fetching user profile');
        const profile = await getUserProfile(token);
        
        setConfig('access_token', token);
        setConfig('token_expires_at', expiresAt);
        setConfig('ig_user_id', profile.id);
        setConfig('ig_username', profile.username);
        if (profile.profile_picture_url) setConfig('ig_profile_pic', profile.profile_picture_url);

        res.send('Successfully connected Instagram! You can close this window.');
    } catch (err) {
        console.error('[OAuth] Error:', err.response?.data || err.message);
        res.status(500).send('Authentication failed');
    }
});

module.exports = router;
