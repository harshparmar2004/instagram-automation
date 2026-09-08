const express = require('express');
const { getConfig, setConfig } = require('../database');
const { exchangeCodeForToken, exchangeLongLivedToken, getUserProfile } = require('../services/instagram');
const { syncMedia } = require('../services/mediaSync');
const config = require('../config');

const router = express.Router();

router.get('/instagram', (req, res) => {
    let appId = process.env.META_APP_ID || getConfig('meta_app_id');
    if (appId) {
        appId = String(appId).replace(/['"\s]/g, '').trim();
    }

    // Ignore placeholder dummy seed and fallback to user's real App ID
    if (!appId || appId === '9876543210123') {
        appId = '28028411953483811';
    }

    if (!appId) {
        return res.status(400).send('Meta App ID not configured. Please save your Meta App ID in Settings first.');
    }

    let redirectUri = req.query.redirect_uri;
    if (!redirectUri) {
        if (config.BASE_URL && !config.BASE_URL.includes('localhost')) {
            redirectUri = `${config.BASE_URL.replace(/\/$/, '')}/auth/instagram/callback`;
        } else {
            const protoHeader = req.headers['x-forwarded-proto'];
            const protocol = (protoHeader ? protoHeader.split(',')[0].trim() : null) || (req.secure ? 'https' : req.protocol) || 'https';
            const host = req.headers['x-forwarded-host'] || req.get('host');
            redirectUri = `${protocol}://${host}/auth/instagram/callback`;
        }
    }

    // Force https on Render and production domains to strictly match Meta's Enforce HTTPS setting
    if (redirectUri.includes('onrender.com') || (!redirectUri.includes('localhost') && !redirectUri.includes('127.0.0.1'))) {
        redirectUri = redirectUri.replace(/^http:\/\//i, 'https://');
    }

    setConfig('redirect_uri', redirectUri);

    const scope = req.query.scope || 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments';
    
    // Using display=popup tells Meta Facebook dialog to format for a popup modal window
    const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&display=popup`;
    console.log(`[OAuth] Launching Meta OAuth with client_id: "${appId}", redirect_uri: "${redirectUri}", scope: "${scope}"`);
    res.redirect(authUrl);
});

router.get('/instagram/callback', async (req, res) => {
    const { code, error, error_description } = req.query;

    const renderPopupResult = (success, title, message, extraData = {}) => {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #FAF8F5;
            color: #2D3748;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
        }
        .card {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 2.5rem 2rem;
            max-width: 420px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.06);
            border: 1px solid #E2E8F0;
        }
        .icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        h2 {
            margin: 0 0 0.5rem 0;
            font-size: 1.4rem;
            color: ${success ? '#2E7D32' : '#C62828'};
        }
        p {
            font-size: 0.95rem;
            color: #718096;
            line-height: 1.5;
            margin: 0 0 1.5rem 0;
        }
        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #CBD5E0;
            border-top-color: #D97757;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">${success ? '🎉' : '⚠️'}</div>
        <h2>${title}</h2>
        <p>${message}</p>
        <div>
            ${success 
                ? '<div class="spinner"></div><div style="font-size:0.82rem;color:#718096;margin-top:0.65rem;">Auto-closing and refreshing dashboard...</div>' 
                : '<button onclick="window.close()" style="padding:0.65rem 1.4rem;border-radius:8px;background:#C62828;color:#fff;border:none;font-weight:700;cursor:pointer;">Close Window</button>'}
        </div>
    </div>
    <script>
        try {
            if (window.opener) {
                window.opener.postMessage({
                    type: '${success ? 'meta_oauth_success' : 'meta_oauth_error'}',
                    data: ${JSON.stringify(extraData)}
                }, '*');
            }
        } catch(e) {
            console.error('postMessage error', e);
        }
        ${success ? 'setTimeout(() => { window.close(); }, 1800);' : ''}
    </script>
</body>
</html>`;
    };

    if (error) {
        return res.status(400).send(renderPopupResult(false, 'Connection Cancelled', error_description || error));
    }

    if (!code) {
        return res.status(400).send(renderPopupResult(false, 'Missing Authorization Code', 'No code received from Meta.'));
    }

    try {
        let expectedRedirectUri = getConfig('redirect_uri');
        if (!expectedRedirectUri) {
            const protoHeader = req.headers['x-forwarded-proto'];
            const protocol = (protoHeader ? protoHeader.split(',')[0].trim() : null) || (req.secure ? 'https' : req.protocol) || 'https';
            const host = req.headers['x-forwarded-host'] || req.get('host');
            expectedRedirectUri = `${protocol}://${host}/auth/instagram/callback`;
            if (expectedRedirectUri.includes('onrender.com') || (!expectedRedirectUri.includes('localhost') && !expectedRedirectUri.includes('127.0.0.1'))) {
                expectedRedirectUri = expectedRedirectUri.replace(/^http:\/\//i, 'https://');
            }
        }

        console.log('[OAuth] Exchanging code for token with redirectUri:', expectedRedirectUri);
        const shortTokenData = await exchangeCodeForToken(code, expectedRedirectUri);
        
        console.log('[OAuth] Exchanging for long-lived token');
        const longTokenData = await exchangeLongLivedToken(shortTokenData.access_token);
        
        const token = longTokenData.access_token;
        const expiresAt = new Date(Date.now() + (longTokenData.expires_in || 5184000) * 1000).toISOString();
        
        console.log('[OAuth] Fetching user profile');
        const profile = await getUserProfile(token);
        
        setConfig('access_token', token);
        setConfig('token_expires_at', expiresAt);
        if (profile.id) setConfig('ig_user_id', profile.id);
        if (profile.username) setConfig('ig_username', profile.username);
        if (profile.profile_picture_url) setConfig('ig_profile_pic', profile.profile_picture_url);

        // Auto-sync media right after connecting!
        try {
            await syncMedia();
            console.log('[OAuth] ✅ Reels & posts automatically synced after OAuth connection!');
        } catch (syncErr) {
            console.warn('[OAuth] Media auto-sync notice:', syncErr.message);
        }

        res.send(renderPopupResult(true, 'Instagram Connected!', `Successfully connected @${profile.username || 'creator'}! Your Reels and automations are now active.`, {
            username: profile.username,
            userId: profile.id
        }));
    } catch (err) {
        const errDetails = err.response?.data?.error?.message || err.message;
        console.error('[OAuth] Error:', errDetails);
        res.status(500).send(renderPopupResult(false, 'Authentication Failed', `Meta returned: ${errDetails}`));
    }
});

module.exports = router;
