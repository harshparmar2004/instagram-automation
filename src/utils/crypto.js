const crypto = require('crypto');

function verifySignature(rawBody, signatureHeader, secret) {
    if (!rawBody || !signatureHeader || !secret) return false;

    try {
        const signature = signatureHeader.replace('sha256=', '');
        
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(rawBody).digest('hex');

        // Prevent timing attacks using crypto.timingSafeEqual
        const signatureBuffer = Buffer.from(signature, 'hex');
        const digestBuffer = Buffer.from(digest, 'hex');

        if (signatureBuffer.length !== digestBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
    } catch (err) {
        console.error('[Crypto] verifySignature error:', err.message);
        return false;
    }
}

module.exports = {
    verifySignature
};
