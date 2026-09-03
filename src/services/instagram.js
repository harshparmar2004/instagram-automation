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
    if (!token) throw new Error('No access token provided');

    // Strategy 1: Instagram Basic / User Token (starts with IG...)
    if (token.startsWith('IG')) {
        try {
            const res = await axios.get(`${IG_API_BASE}/me`, {
                params: {
                    fields: 'id,username,profile_picture_url,name',
                    access_token: token
                }
            });
            return res.data;
        } catch (e) {
            console.log('[Instagram] IG endpoint lookup notice:', e.response?.data?.error?.message || e.message);
        }
    }

    // Strategy 2: Meta / Facebook Token (starts with EAA...)
    // A: Look for connected Facebook Pages that have an Instagram Business Account
    try {
        const accountsRes = await axios.get(`${FB_API_BASE}/me/accounts`, {
            params: {
                fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url,name}',
                access_token: token
            }
        });
        const pages = accountsRes.data?.data || [];
        for (const page of pages) {
            if (page.instagram_business_account && page.instagram_business_account.id) {
                const ig = page.instagram_business_account;
                console.log(`[Instagram] Discovered Instagram Business Account @${ig.username} (ID: ${ig.id}) linked to Page "${page.name}"`);
                return {
                    id: ig.id,
                    username: ig.username,
                    name: ig.name || page.name,
                    profile_picture_url: ig.profile_picture_url || '',
                    page_token: page.access_token
                };
            }
        }
    } catch (e) {
        console.log('[Instagram] /me/accounts lookup notice:', e.response?.data?.error?.message || e.message);
    }

    // B: Check /me directly for instagram_business_account
    try {
        const meRes = await axios.get(`${FB_API_BASE}/me`, {
            params: {
                fields: 'id,name,instagram_business_account{id,username,profile_picture_url,name}',
                access_token: token
            }
        });
        if (meRes.data?.instagram_business_account?.id) {
            const ig = meRes.data.instagram_business_account;
            return {
                id: ig.id,
                username: ig.username,
                name: ig.name || meRes.data.name,
                profile_picture_url: ig.profile_picture_url || ''
            };
        }
    } catch (e) {
        console.log('[Instagram] /me instagram_business_account lookup notice:', e.response?.data?.error?.message || e.message);
    }

    // C: Check /me basic fields (id, name)
    try {
        const basicRes = await axios.get(`${FB_API_BASE}/me`, {
            params: {
                fields: 'id,name',
                access_token: token
            }
        });
        if (basicRes.data?.id) {
            return {
                id: basicRes.data.id,
                name: basicRes.data.name,
                username: basicRes.data.name ? basicRes.data.name.toLowerCase().replace(/\s+/g, '.') : 'creator'
            };
        }
    } catch (e) {
        console.log('[Instagram] /me basic lookup notice:', e.response?.data?.error?.message || e.message);
    }

    // Strategy 3: Try graph.instagram.com/me
    try {
        const igRes = await axios.get(`${IG_API_BASE}/me`, {
            params: {
                fields: 'id,username',
                access_token: token
            }
        });
        return igRes.data;
    } catch (e) {
        const metaError = e.response?.data?.error?.message || e.message;
        throw new Error(`Meta API error: ${metaError}`);
    }
}

async function getMedia(token, after = null, limit = 50) {
    const isFbToken = token && token.startsWith('EAA');
    const base = isFbToken ? FB_API_BASE : IG_API_BASE;
    let igUserId = getConfig('ig_user_id');

    // Auto-resolve IG user ID if missing or default placeholder
    if (isFbToken && (!igUserId || igUserId === '17841400000000000')) {
        try {
            const profile = await getUserProfile(token);
            if (profile?.id) {
                igUserId = profile.id;
                setConfig('ig_user_id', profile.id);
                if (profile.username) setConfig('ig_username', profile.username);
                if (profile.profile_picture_url) setConfig('ig_profile_pic', profile.profile_picture_url);
            }
        } catch(e) {
            console.log('[Instagram] Could not auto-resolve IG User ID for getMedia:', e.message);
        }
    }

    const endpoint = (isFbToken && igUserId && igUserId !== '17841400000000000')
        ? `${base}/${igUserId}/media`
        : `${base}/me/media`;

    const fullFields = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    const fallbackFields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

    const params = {
        fields: fullFields,
        access_token: token,
        limit: limit
    };
    if (after) {
        params.after = after;
    }

    try {
        const res = await axios.get(endpoint, { params });
        return res.data;
    } catch (err) {
        // If error was about an unsupported field, retry with core fields
        if (err.response?.data?.error?.message?.includes('nonexisting field')) {
            console.log('[Instagram] Retrying getMedia with core fields fallback...');
            params.fields = fallbackFields;
            const retryRes = await axios.get(endpoint, { params });
            return retryRes.data;
        }
        throw err;
    }
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

async function sendPrivateReply(token, commentId, commenterId, messageText) {
    const isFbToken = token && token.startsWith('EAA');
    const base = isFbToken ? FB_API_BASE : IG_API_BASE;
    const igUserId = getConfig('ig_user_id');
    const endpoint = isFbToken && igUserId && igUserId !== '17841400000000000'
        ? `${base}/${igUserId}/messages`
        : `${base}/me/messages`;

    // Strategy 1: Official Instagram Private Reply using recipient: { comment_id }
    try {
        console.log(`[Instagram] Dispatching Private Reply DM for comment ${commentId} to ${endpoint}...`);
        const res = await axios.post(endpoint, {
            recipient: { comment_id: commentId },
            message: { text: messageText }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[Instagram] ✅ Private Reply DM delivered successfully!`, res.data);
        return res.data;
    } catch (err) {
        const errorMsg = err.response?.data?.error?.message || err.message;
        console.warn(`[Instagram] Strategy 1 (comment_id) notice: ${errorMsg}`);

        // Strategy 2: If commenterId is provided, fallback to direct message by recipient: { id }
        if (commenterId) {
            try {
                console.log(`[Instagram] Strategy 2: Fallback DM to recipient id ${commenterId}...`);
                const res2 = await axios.post(endpoint, {
                    recipient: { id: commenterId },
                    message: { text: messageText }
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log(`[Instagram] ✅ DM delivered via user ID!`, res2.data);
                return res2.data;
            } catch (err2) {
                console.warn(`[Instagram] Strategy 2 notice:`, err2.response?.data?.error?.message || err2.message);
            }
        }

        throw new Error(`Meta API Error: ${errorMsg}`);
    }
}

async function replyToComment(token, commentId, messageText) {
    if (!messageText) return null;
    const isFbToken = token && token.startsWith('EAA');
    const base = isFbToken ? FB_API_BASE : IG_API_BASE;
    try {
        console.log(`[Instagram] Posting public comment reply on comment ${commentId}...`);
        const res = await axios.post(`${base}/${commentId}/replies`, {
            message: messageText
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[Instagram] ✅ Public comment reply published:`, res.data);
        return res.data;
    } catch (err) {
        console.warn(`[Instagram] Public comment reply notice:`, err.response?.data?.error?.message || err.message);
        return null;
    }
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
    let appSub = null;

    // 1. Subscribe App to Instagram webhooks
    try {
        const res = await axios.post(`${FB_API_BASE}/${appId}/subscriptions`, null, {
            params: {
                object: 'instagram',
                callback_url: callbackUrl,
                fields: 'comments,messages',
                verify_token: verifyToken,
                access_token: appAccessToken
            }
        });
        appSub = res.data;
        console.log('[Instagram] App webhook subscribed:', appSub);
    } catch (e) {
        console.warn('[Instagram] App subscriptions notice:', e.response?.data?.error?.message || e.message);
    }

    // 2. Also install app on connected Facebook Page so comment webhooks deliver
    const token = getConfig('access_token');
    if (token && token.startsWith('EAA')) {
        try {
            const pagesRes = await axios.get(`${FB_API_BASE}/me/accounts`, {
                params: { access_token: token }
            });
            for (const page of pagesRes.data?.data || []) {
                try {
                    await axios.post(`${FB_API_BASE}/${page.id}/subscribed_apps`, null, {
                        params: {
                            subscribed_fields: 'feed,comments,messages',
                            access_token: page.access_token || token
                        }
                    });
                    console.log(`[Instagram] ✅ Subscribed page ${page.name} (${page.id}) to webhooks!`);
                } catch(pe) {
                    console.warn(`[Instagram] Page subscription notice for ${page.id}:`, pe.response?.data?.error?.message || pe.message);
                }
            }
        } catch(e) {}
    }

    return appSub || { success: true };
}

module.exports = {
    exchangeCodeForToken,
    exchangeLongLivedToken,
    refreshToken,
    getUserProfile,
    getMedia,
    getSingleMedia,
    sendPrivateReply,
    replyToComment,
    sendDirectMessage,
    subscribeWebhook
};
