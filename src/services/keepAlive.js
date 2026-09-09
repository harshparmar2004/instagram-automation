const axios = require('axios');
const { getConfig } = require('../database');

let nextTimeout = null;
let lastPingTime = null;
let lastPingStatus = null;
let nextPingTime = null;

function getTargetUrl() {
    let url = process.env.RENDER_EXTERNAL_URL || 
              process.env.APP_URL || 
              getConfig('render_external_url') || 
              getConfig('app_url') || 
              process.env.BASE_URL;

    if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
        return null;
    }
    return url.replace(/\/+$/, '');
}

function getRandomDelayMs() {
    // Random interval between 9 and 12 minutes (in milliseconds)
    // Prevents fixed-pattern bot detection and ensures Render never hits the 15-min idle cutoff
    const minSeconds = 9 * 60;   // 540s (9 minutes)
    const maxSeconds = 12 * 60;  // 720s (12 minutes)
    const randomSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    return randomSeconds * 1000;
}

async function pingSelf() {
    const targetUrl = getTargetUrl();
    if (!targetUrl) {
        return;
    }

    const healthUrl = `${targetUrl}/health`;
    try {
        const start = Date.now();
        const res = await axios.get(healthUrl, { timeout: 25000 });
        const duration = Date.now() - start;
        lastPingTime = new Date().toISOString();
        lastPingStatus = `HTTP ${res.status} (${duration}ms)`;
        console.log(`[KeepAlive] 💓 Sent keep-alive ping to ${healthUrl} - ${lastPingStatus}. Prevented Render spin-down!`);
    } catch (err) {
        lastPingTime = new Date().toISOString();
        lastPingStatus = `Error: ${err.message}`;
        console.warn(`[KeepAlive] ⚠️ Keep-alive ping to ${healthUrl} notice: ${err.message}`);
    }
}

function scheduleNextPing() {
    if (nextTimeout) {
        clearTimeout(nextTimeout);
        nextTimeout = null;
    }

    const targetUrl = getTargetUrl();
    if (!targetUrl) {
        // Poll every 5 minutes in case a public URL is added dynamically
        nextTimeout = setTimeout(scheduleNextPing, 5 * 60 * 1000);
        return;
    }

    const delayMs = getRandomDelayMs();
    const minutes = Math.round(delayMs / 60000);
    nextPingTime = new Date(Date.now() + delayMs).toISOString();
    console.log(`[KeepAlive] ⏰ Next anti-sleep ping scheduled in ${minutes}m (${new Date(Date.now() + delayMs).toLocaleTimeString()}) for ${targetUrl}`);

    nextTimeout = setTimeout(async () => {
        await pingSelf();
        scheduleNextPing();
    }, delayMs);
}

function startKeepAlive() {
    const targetUrl = getTargetUrl();
    if (targetUrl) {
        console.log(`[KeepAlive] 🚀 Render Keep-Alive service active for ${targetUrl} (Randomized 9-12 min cycles)`);
        // Trigger initial warm-up ping after 45 seconds of startup
        setTimeout(async () => {
            await pingSelf();
            scheduleNextPing();
        }, 45 * 1000);
    } else {
        console.log('[KeepAlive] Running in local mode. Keep-alive will automatically start when deployed to Render (RENDER_EXTERNAL_URL detected).');
        scheduleNextPing();
    }
}

function getKeepAliveStatus() {
    const targetUrl = getTargetUrl();
    return {
        enabled: !!targetUrl,
        targetUrl: targetUrl || 'Local / Not configured',
        lastPingTime,
        lastPingStatus,
        nextPingTime
    };
}

module.exports = {
    startKeepAlive,
    pingSelf,
    getKeepAliveStatus
};
