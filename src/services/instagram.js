const axios = require('axios');
const { getConfig } = require('../database');

const GRAPH_VERSION = 'v22.0';
const IG_API_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;
const FB_API_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function exchangeCodeForToken(code) {
    const appId = getConfig('meta_app_id');
    const appSecret = getConfig('meta_app_secret');
    const redirectUri = getConfig('redirect_uri') || require('../config').BASE_URL + '/auth/instagram/callback';

    const form = new URLSearchParams();
    form.append('client_id', appId);
    form.append('client_secret', appSecret);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', redirectUri);
    form.append('code', code);

    const res = await axios.post('https://api.instagram.com/oauth/access_token', form);
    return res.data; // { access_token, user_id }
}

async function exchangeLongLivedToken(shortToken) {
    const appSecret = getConfig('meta_app_secret');
    
    const res = await axios.get(`${IG_API_BASE}/access_token`, {
        params: {
            grant_type: 'ig_exchange_token',
            client_secret: appSecret,
            access_token: shortToken
        }
    });
    return res.data; // { access_token, token_type, expires_in }
}

async function refreshToken(token) {
    const res = await axios.get(`${IG_API_BASE}/refresh_access_token`, {
        params: {
            grant_type: 'ig_refresh_token',
            access_token: token
        }
    });
    return res.data; // { access_token, token_type, expires_in }
}

async function getUserProfile(token) {
    const isFbToken = token && token.startsWith('EAA');
    const base = isFbToken ? FB_API_BASE : IG_API_BASE;
    const res = await axios.get(`${base}/me`, {
        params: {
            fields: 'id,username,profile_picture_url,name',
            access_token: token
        }
    });
    return res.data;
}

async function getMedia(token, after = null, limit = 50) {
    const isFbToken = token && token.startsWith('EAA');
    const base = isFbToken ? FB_API_BASE : IG_API_BASE;
    const igUserId = getConfig('ig_user_id');
    const endpoint = isFbToken && igUserId && igUserId !== '17841400000000000'
        ? `${base}/${igUserId}/media`
        : `${base}/me/media`;

    const params = {
        fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        access_token: token,
        limit: limit
    };
    if (after) {
        params.after = after;
    }

    const res = await axios.get(endpoint, { params });
    return res.data;
}

async function getSingleMedia(token, mediaId) {
    const isFbToken = token && token.startsWith('EAA');
    const base = isFbToken ? FB_API_BASE : IG_API_BASE;
    const res = await axios.get(`${base}/${mediaId}`, {
        params: {
            fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
            access_token: token
        }
    });
    return res.data;
}

async function sendPrivateReply(token, commentId, messageText) {
    const isFbToken = token && token.startsWith('EAA');
    const base = isFbToken ? FB_API_BASE : IG_API_BASE;
    const res = await axios.post(`${base}/${commentId}/replies`, {
        message: messageText
    }, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    return res.data;
}

async function sendDirectMessage(token, recipientId, messageText) {
    const isFbToken = token && token.startsWith('EAA');
    const base = isFbToken ? FB_API_BASE : IG_API_BASE;
    const igUserId = getConfig('ig_user_id');
    const endpoint = isFbToken && igUserId && igUserId !== '17841400000000000'
        ? `${base}/${igUserId}/messages`
        : `${base}/me/messages`;

    const res = await axios.post(endpoint, {
        recipient: { id: recipientId },
        message: { text: messageText }
    }, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    return res.data;
}

async function subscribeWebhook(appId, appSecret, callbackUrl, verifyToken) {
    const appAccessToken = `${appId}|${appSecret}`;
    
    // Attempting to subscribe to Instagram messaging and comments
    const res = await axios.post(`${FB_API_BASE}/${appId}/subscriptions`, null, {
        params: {
            object: 'instagram',
            callback_url: callbackUrl,
            fields: 'comments,messages',
            verify_token: verifyToken,
            access_token: appAccessToken
        }
    });
    return res.data;
}

module.exports = {
    exchangeCodeForToken,
    exchangeLongLivedToken,
    refreshToken,
    getUserProfile,
    getMedia,
    getSingleMedia,
    sendPrivateReply,
    sendDirectMessage,
    subscribeWebhook
};
