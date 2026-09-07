const express = require('express');
const { getConfig, setConfig, getDb } = require('../database');
const auth = require('../middleware/auth');
const { testSheetConnection, bulkSyncPastLeads } = require('../services/googleSheets');

const router = express.Router();

router.get('/integrations/sheets', auth, (req, res) => {
    try {
        const db = getDb();
        const webhookUrl = getConfig('google_sheet_webhook_url') || '';
        const isEnabled = getConfig('google_sheet_sync_enabled') !== '0';
        const lastSync = getConfig('google_sheet_last_sync') || '';
        
        let totalLeads = 0;
        let syncedCount = 0;
        try {
            totalLeads = db.prepare('SELECT COUNT(*) as count FROM events').get().count;
            syncedCount = db.prepare('SELECT COUNT(*) as count FROM events WHERE synced_to_sheet = 1').get().count;
        } catch (e) {}

        res.json({
            configured: !!webhookUrl,
            webhook_url: webhookUrl,
            enabled: isEnabled,
            last_sync: lastSync,
            total_leads: totalLeads,
            synced_leads: syncedCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/integrations/sheets/save', auth, (req, res) => {
    try {
        const { webhook_url, enabled } = req.body;
        
        if (webhook_url !== undefined) {
            setConfig('google_sheet_webhook_url', (webhook_url || '').trim());
        }
        if (enabled !== undefined) {
            setConfig('google_sheet_sync_enabled', enabled ? '1' : '0');
        }

        res.json({
            success: true,
            message: 'Google Sheets settings saved successfully!'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/integrations/sheets/test', auth, async (req, res) => {
    try {
        const { webhook_url } = req.body;
        const targetUrl = (webhook_url || getConfig('google_sheet_webhook_url') || '').trim();

        if (!targetUrl) {
            return res.status(400).json({ error: 'Please provide or save a Google Sheet Webhook URL first' });
        }

        const result = await testSheetConnection(targetUrl);
        setConfig('google_sheet_last_sync', new Date().toISOString());
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/integrations/sheets/bulk-sync', auth, async (req, res) => {
    try {
        const result = await bulkSyncPastLeads();
        setConfig('google_sheet_last_sync', new Date().toISOString());
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
