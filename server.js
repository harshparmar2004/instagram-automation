require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { getDb } = require('./src/database');
const { checkAndRefreshToken } = require('./src/services/tokenRefresh');
const { syncMedia } = require('./src/services/mediaSync');
const { startKeepAlive, getKeepAliveStatus } = require('./src/services/keepAlive');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

// Initialize database
getDb();

// Enable CORS for Vercel / cross-origin deployments
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Impersonate-User-Id');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Explicit Favicon Routes with Cache-Busting Headers
app.get('/favicon.ico', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.get('/favicon.png', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'public', 'favicon.png'));
});

app.get('/favicon.svg', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

// Routes
const webhookRoutes = require('./src/routes/webhook');
const setupRoutes = require('./src/routes/setup');
const oauthRoutes = require('./src/routes/oauth');
const mediaRoutes = require('./src/routes/media');
const rulesRoutes = require('./src/routes/rules');
const eventsRoutes = require('./src/routes/events');
const integrationsRoutes = require('./src/routes/integrations');
const redirectRoutes = require('./src/routes/redirect');

const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const historyRoutes = require('./src/routes/history');

// Mount routes
// Webhook needs raw body for HMAC signature verification
// Mount on both /webhook and /api/webhook for Meta compatibility
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes);
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

// Other routes need JSON parser
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', setupRoutes);
app.use('/api', mediaRoutes);
app.use('/api', rulesRoutes);
app.use('/api', eventsRoutes);
app.use('/api', historyRoutes);
app.use('/api', integrationsRoutes);
app.use('/auth', oauthRoutes);
app.use('/', redirectRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));

// Health check & Anti-Sleep Ping Target
app.get('/health', (req, res) => res.json({ 
  status: 'ok', 
  service: 'instagram-automation', 
  uptime: Math.floor(process.uptime()), 
  timestamp: new Date().toISOString() 
}));

// Keep-Alive status monitor
app.get('/api/keep-alive', (req, res) => res.json(getKeepAliveStatus()));

// Start cron jobs
// Token refresh every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('[Cron] Checking token refresh');
  try {
    await checkAndRefreshToken();
  } catch (err) {
    console.error('[Cron] Token refresh failed:', err.message);
  }
});

// Media sync every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('[Cron] Running media sync');
  try {
    await syncMedia();
  } catch (err) {
    console.error('[Cron] Media sync failed:', err.message);
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startKeepAlive();
  });
}

module.exports = app;

