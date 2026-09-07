const axios = require('axios');
const { getDb, getConfig } = require('../database');

/**
 * Sends a single lead record to the configured Google Sheet Webhook.
 * Non-blocking: Errors are logged but never interrupt the core automation engine.
 */
async function syncLeadToSheet(leadData) {
    const webhookUrl = getConfig('google_sheet_webhook_url');
    const isEnabled = getConfig('google_sheet_sync_enabled');

    if (!webhookUrl || isEnabled === '0' || isEnabled === 'false') {
        return { skipped: true, reason: 'Google Sheets sync is not configured or disabled' };
    }

    try {
        const payload = {
            action: leadData.action || 'new_lead',
            event_id: leadData.eventId || null,
            date: leadData.date || new Date().toLocaleString(),
            username: leadData.username ? `@${leadData.username.replace(/^@/, '')}` : 'unknown',
            comment: leadData.comment || '',
            keyword: leadData.keyword || '',
            action_type: leadData.action_type || 'Direct Message',
            delivery_status: leadData.status || 'delivered',
            reel_id: leadData.mediaIgId || '',
            reel_url: leadData.mediaIgId ? `https://www.instagram.com/p/${leadData.mediaIgId}/` : '',
            link_clicked: leadData.linkClicked ? 'YES' : 'NO'
        };

        const res = await axios.post(webhookUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000
        });

        // Mark as synced in local DB if eventId is provided
        if (leadData.eventId) {
            try {
                const db = getDb();
                db.prepare('UPDATE events SET synced_to_sheet = 1 WHERE id = ?').run(leadData.eventId);
            } catch (e) {}
        }

        console.log(`[GoogleSheets] ✅ Synced lead @${leadData.username} to Google Sheet!`);
        return { success: true, data: res.data };
    } catch (err) {
        console.warn(`[GoogleSheets] ⚠️ Sync notice:`, err.response?.data || err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Updates link clicked status in the Google Sheet when user clicks /r/:tracking_id
 */
async function syncClickToSheet(trackingId) {
    const webhookUrl = getConfig('google_sheet_webhook_url');
    const isEnabled = getConfig('google_sheet_sync_enabled');

    if (!webhookUrl || isEnabled === '0' || isEnabled === 'false') return;

    try {
        const db = getDb();
        const ev = db.prepare('SELECT * FROM events WHERE tracking_id = ?').get(trackingId);
        if (!ev) return;

        const payload = {
            action: 'link_clicked',
            event_id: ev.id,
            username: `@${(ev.commenter_username || 'user').replace(/^@/, '')}`,
            clicked_at: new Date().toLocaleString(),
            link_clicked: 'YES'
        };

        await axios.post(webhookUrl, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000
        });

        console.log(`[GoogleSheets] ✅ Updated link click for @${ev.commenter_username} in Google Sheet!`);
    } catch (e) {
        console.warn(`[GoogleSheets] Link click sync notice:`, e.message);
    }
}

/**
 * Sends a test row to verify Google Sheet webhook URL connectivity.
 */
async function testSheetConnection(webhookUrl) {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
        throw new Error('Please provide a valid Google Sheet Web App URL starting with https://');
    }

    const testPayload = {
        action: 'test_connection',
        date: new Date().toLocaleString(),
        username: '@harshparmar007__',
        comment: 'Testing Google Sheets Live Sync 🚀',
        keyword: 'GOOGLE',
        action_type: 'Test Sync',
        delivery_status: 'verified',
        reel_url: 'https://www.instagram.com/p/Dc1Bs-HszUv/',
        link_clicked: 'YES'
    };

    const res = await axios.post(webhookUrl, testPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
    });

    return {
        success: true,
        message: 'Successfully connected and sent sample test row to your Google Sheet!',
        response: res.data
    };
}

/**
 * Backfills past captured leads to the Google Sheet.
 */
async function bulkSyncPastLeads() {
    const webhookUrl = getConfig('google_sheet_webhook_url');
    if (!webhookUrl) throw new Error('Google Sheet Webhook URL is not configured');

    const db = getDb();
    const unsynced = db.prepare(`
        SELECT e.*, r.trigger_keyword, r.action_type
        FROM events e
        LEFT JOIN rules r ON e.rule_id = r.id
        ORDER BY e.created_at ASC
    `).all();

    if (unsynced.length === 0) {
        return { total: 0, synced: 0, message: 'No leads found to sync' };
    }

    const clickStmt = db.prepare('SELECT COUNT(*) as count FROM clicks WHERE tracking_id = ?');
    let synced = 0;

    for (const ev of unsynced) {
        const hasClicks = ev.tracking_id ? clickStmt.get(ev.tracking_id).count > 0 : false;
        await syncLeadToSheet({
            eventId: ev.id,
            date: new Date(ev.created_at).toLocaleString(),
            username: ev.commenter_username,
            comment: ev.comment_text,
            keyword: ev.trigger_keyword || '',
            action_type: ev.action_type || 'Direct Message',
            status: ev.dm_status || 'delivered',
            mediaIgId: ev.media_ig_id,
            linkClicked: hasClicks
        });
        synced++;
        await new Promise(r => setTimeout(r, 200));
    }

    return {
        total: unsynced.length,
        synced,
        message: `Successfully synced ${synced} leads to your Google Sheet!`
    };
}

module.exports = {
    syncLeadToSheet,
    syncClickToSheet,
    testSheetConnection,
    bulkSyncPastLeads
};
