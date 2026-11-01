const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getMasterKey() {
    let keyStr = process.env.ENCRYPTION_KEY;
    if (!keyStr) {
        try {
            const db = require('../database');
            if (db && typeof db.getConfig === 'function') {
                keyStr = db.getConfig('encryption_key');
            }
        } catch(e) {}
    }
    if (!keyStr) {
        keyStr = 'instaauto_vault_key_2026_super_secure';
        try {
            const db = require('../database');
            if (db && typeof db.setConfig === 'function') {
                db.setConfig('encryption_key', keyStr);
            }
        } catch(e) {}
    }
    return crypto.createHash('sha256').update(String(keyStr)).digest();
}

/**
 * Encrypt a sensitive token using AES-256-GCM
 * @param {string} text - Plain text token
 * @returns {string} Encrypted string in format "enc:iv:tag:ciphertext"
 */
function encryptToken(text) {
    if (!text || typeof text !== 'string') return text;
    if (text.startsWith('enc:')) return text; // already encrypted

    const iv = crypto.randomBytes(16);
    const key = getMasterKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a token encrypted with AES-256-GCM
 * @param {string} cipherText - Encrypted token string or plain token
 * @returns {string} Decrypted plain text token
 */
function decryptToken(cipherText) {
    if (!cipherText || typeof cipherText !== 'string') return cipherText;
    if (!cipherText.startsWith('enc:')) {
        // Plain text legacy token (starts with IG or EAA) - return as-is
        return cipherText;
    }

    try {
        const parts = cipherText.split(':');
        if (parts.length !== 4) return cipherText;

        const iv = Buffer.from(parts[1], 'hex');
        const authTag = Buffer.from(parts[2], 'hex');
        const encryptedData = parts[3];

        const key = getMasterKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.warn('[Crypto] Decryption error (returning raw):', err.message);
        return cipherText;
    }
}

module.exports = {
    encryptToken,
    decryptToken
};
