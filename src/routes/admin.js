const express = require('express');
const auth = require('../middleware/auth');
const {
    getAllUsers,
    updateUserStatus,
    deleteUser,
    getAdminMetrics,
    getUserById,
    getUserInstagramAccount,
    getDb
} = require('../database');

const router = express.Router();

// Enforce auth & superAdminOnly on all admin endpoints
router.use(auth);
router.use(auth.superAdminOnly);

// GET /api/admin/metrics
router.get('/metrics', (req, res) => {
    try {
        const metrics = getAdminMetrics();
        res.json({ success: true, metrics });
    } catch (err) {
        console.error('[Admin Metrics Error]:', err);
        res.status(500).json({ error: 'Failed to load system metrics' });
    }
});

// GET /api/admin/users
router.get('/users', (req, res) => {
    try {
        const search = req.query.search || '';
        const users = getAllUsers(search);
        res.json({ success: true, users, count: users.length });
    } catch (err) {
        console.error('[Admin Users Error]:', err);
        res.status(500).json({ error: 'Failed to load user directory' });
    }
});

// POST /api/admin/users/:id/status
router.post('/users/:id/status', (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { status } = req.body || {};

        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Status must be active or suspended' });
        }

        const user = getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'super_admin') {
            return res.status(400).json({ error: 'Cannot change status of a Super Admin' });
        }

        updateUserStatus(userId, status);
        res.json({ success: true, message: `User status changed to ${status}` });
    } catch (err) {
        console.error('[Admin Status Error]:', err);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// POST /api/admin/users/:id/role
router.post('/users/:id/role', (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { role } = req.body || {};
        if (!['super_admin', 'admin', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Role must be super_admin, admin, or user' });
        }
        const db = getDb();
        db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(role, new Date().toISOString(), userId);
        res.json({ success: true, message: `User role updated to ${role}` });
    } catch (err) {
        console.error('[Admin Role Error]:', err);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
    try {
        const userId = Number(req.params.id);
        const user = getUserById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.role === 'super_admin') {
            return res.status(400).json({ error: 'Cannot delete a Super Admin' });
        }

        deleteUser(userId);
        res.json({ success: true, message: `User ${user.email} and all associated data deleted` });
    } catch (err) {
        console.error('[Admin Delete Error]:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// GET /api/admin/token-alerts
router.get('/token-alerts', (req, res) => {
    try {
        const db = getDb();
        const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
        const alerts = db.prepare(`
            SELECT a.id, a.user_id, a.ig_username, a.token_expires_at, u.name, u.email
            FROM instagram_accounts a
            JOIN users u ON a.user_id = u.id
            WHERE a.is_active = 1 AND a.token_expires_at <= ?
            ORDER BY a.token_expires_at ASC
        `).all(tenDaysFromNow);

        res.json({ success: true, alerts });
    } catch (err) {
        console.error('[Admin Token Alerts Error]:', err);
        res.status(500).json({ error: 'Failed to fetch token alerts' });
    }
});

// POST /api/admin/users/:id/token
// Allows Super Admin to assign or update a creator's Instagram Access Token directly
router.post('/users/:id/token', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { accessToken } = req.body || {};

        if (!accessToken || !accessToken.trim()) {
            return res.status(400).json({ error: 'Instagram Access Token is required' });
        }

        const cleanToken = accessToken.trim();
        const user = getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { getUserProfile } = require('../services/instagram');
        const { saveUserInstagramAccount } = require('../database');
        const { syncMedia } = require('../services/mediaSync');

        // Verify token with Meta and auto-detect profile
        let profile = null;
        try {
            profile = await getUserProfile(cleanToken);
        } catch (metaErr) {
            const msg = metaErr.response?.data?.error?.message || metaErr.message;
            return res.status(400).json({ error: `Meta rejected token: ${msg}` });
        }

        const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
        const saved = saveUserInstagramAccount(userId, {
            igUserId: profile?.id || null,
            igUsername: profile?.username || 'creator',
            igName: profile?.name || null,
            profilePic: profile?.profile_picture_url || null,
            accessToken: cleanToken,
            tokenExpiresAt: expiresAt
        });

        // Trigger background media sync for this creator
        syncMedia(userId).catch(e => console.warn(`[Admin] Initial media sync notice for user ${userId}:`, e.message));

        res.json({
            success: true,
            message: `Instagram account @${saved.ig_username} successfully linked to ${user.email}`,
            account: {
                id: saved.id,
                igUserId: saved.ig_user_id,
                igUsername: saved.ig_username,
                tokenExpiresAt: saved.token_expires_at,
                isActive: saved.is_active === 1
            }
        });
    } catch (err) {
        console.error('[Admin Assign Token Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
