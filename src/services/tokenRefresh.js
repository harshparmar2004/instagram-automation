const { refreshToken } = require('./instagram');
const { getConfig, setConfig } = require('../database');

async function checkAndRefreshToken() {
    const token = getConfig('access_token');
    const expiresAtStr = getConfig('token_expires_at');

    if (!token || !expiresAtStr) return;

    const expiresAt = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const tenDays = 10 * 24 * 60 * 60 * 1000;

    // Refresh if expiring in less than 10 days
    if (expiresAt - now < tenDays) {
        console.log('[TokenRefresh] Token expires soon, refreshing...');
        try {
            const data = await refreshToken(token);
            setConfig('access_token', data.access_token);
            
            const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
            setConfig('token_expires_at', newExpiry);
            console.log(`[TokenRefresh] Token refreshed successfully. New expiry: ${newExpiry}`);
        } catch (err) {
            console.error('[TokenRefresh] Failed to refresh token:', err.response?.data || err.message);
        }
    } else {
        console.log('[TokenRefresh] Token is healthy. Expires at:', new Date(expiresAt).toISOString());
    }
}

module.exports = {
    checkAndRefreshToken
};
