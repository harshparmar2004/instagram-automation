const config = require('../config');

function authMiddleware(req, res, next) {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token || token !== config.DASHBOARD_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

module.exports = authMiddleware;
