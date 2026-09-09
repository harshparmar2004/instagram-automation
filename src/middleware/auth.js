const config = require('../config');
const { validateSession, getDb, getUserById } = require('../database');

function authMiddleware(req, res, next) {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    // 1. Check if token is a valid multi-tenant session token
    const session = validateSession(token);
    if (session) {
        req.token = token;
        req.user = {
            id: session.id,
            name: session.name,
            email: session.email,
            role: session.role,
            status: session.status
        };

        // Super Admin Impersonation support
        const impersonateId = req.headers['x-impersonate-user-id'];
        if (session.role === 'super_admin' && impersonateId) {
            const targetUser = getUserById(Number(impersonateId));
            if (targetUser) {
                req.actualAdmin = req.user;
                req.user = targetUser;
                req.isImpersonating = true;
            }
        }

        return next();
    }

    // 2. Legacy fallback for existing automated scripts & passwords
    const acceptedLegacyTokens = [
        config.DASHBOARD_PASSWORD,
        'changeme',
        'admin',
        'instaauto',
        'creator',
        'password',
        'harsh',
        'harsh2004'
    ].filter(Boolean);

    if (acceptedLegacyTokens.includes(token)) {
        try {
            const db = getDb();
            const superAdmin = db.prepare('SELECT id, name, email, role, status FROM users WHERE role = "super_admin" LIMIT 1').get();
            if (superAdmin) {
                req.user = superAdmin;
                req.token = token;
                return next();
            }
        } catch (e) {}

        // Fallback default user object if DB not yet loaded
        req.user = { id: 1, name: 'Admin', email: 'admin@instaauto.app', role: 'super_admin', status: 'active' };
        req.token = token;
        return next();
    }

    return res.status(401).json({ error: 'Unauthorized or session expired. Please log in.' });
}

function superAdminOnly(req, res, next) {
    const role = req.actualAdmin ? req.actualAdmin.role : req.user?.role;
    if (role !== 'super_admin') {
        return res.status(403).json({ error: 'Access denied. Super Admin role required.' });
    }
    next();
}

authMiddleware.superAdminOnly = superAdminOnly;
module.exports = authMiddleware;
