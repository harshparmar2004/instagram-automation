require('dotenv').config();

function resolveBaseUrl() {
    // 1. Explicit PUBLIC_URL env var (if not localhost and not the stale instaauto domain)
    if (process.env.PUBLIC_URL && !process.env.PUBLIC_URL.includes('localhost') && !process.env.PUBLIC_URL.includes('instaauto.onrender.com')) {
        return process.env.PUBLIC_URL.replace(/\/+$/, '');
    }
    // 2. Render-provided URL (guaranteed active and real for this web service)
    if (process.env.RENDER_EXTERNAL_URL && !process.env.RENDER_EXTERNAL_URL.includes('localhost')) {
        return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
    }
    // 3. BASE_URL env var (guarding against stale/dead domain instaauto.onrender.com)
    if (process.env.BASE_URL && !process.env.BASE_URL.includes('localhost')) {
        if (process.env.BASE_URL.includes('instaauto.onrender.com')) {
            return 'https://instaauto-wzvc.onrender.com';
        }
        return process.env.BASE_URL.replace(/\/+$/, '');
    }
    // 4. If running in Render environment or production
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
        return 'https://instaauto-wzvc.onrender.com';
    }
    // 5. Config table in DB
    try {
        const { getConfig } = require('./database');
        const dbPublicUrl = getConfig('public_url') || getConfig('base_url');
        if (dbPublicUrl && !dbPublicUrl.includes('localhost') && !dbPublicUrl.includes('instaauto.onrender.com')) {
            return dbPublicUrl.replace(/\/+$/, '');
        }
    } catch(e) {}

    // Default to the live Render production URL so links in Instagram DMs always work on real devices
    return 'https://instaauto-wzvc.onrender.com';
}

module.exports = {
    PORT: process.env.PORT || 3000,
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'changeme',
    BASE_URL: resolveBaseUrl(),
    resolveBaseUrl
};
