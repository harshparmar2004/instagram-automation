const { getConfig } = require('../database');
const { verifySignature } = require('../utils/crypto');

function webhookVerify(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        console.error('[Webhook] Missing signature header');
        return res.status(401).send('Missing signature');
    }

    const appSecret = getConfig('meta_app_secret');
    if (!appSecret) {
        console.error('[Webhook] App secret not configured');
        return res.status(500).send('Server not configured');
    }

    // req.body must be the raw buffer, provided by express.raw()
    if (!verifySignature(req.body, signature, appSecret)) {
        console.error('[Webhook] Invalid signature');
        return res.status(401).send('Invalid signature');
    }

    next();
}

module.exports = webhookVerify;
