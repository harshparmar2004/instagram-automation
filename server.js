require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { getDb } = require('./src/database');
const { checkAndRefreshToken } = require('./src/services/tokenRefresh');
const { syncMedia } = require('./src/services/mediaSync');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
getDb();

// Enable CORS for Vercel / cross-origin deployments
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Routes
const webhookRoutes = require('./src/routes/webhook');
const setupRoutes = require('./src/routes/setup');
const oauthRoutes = require('./src/routes/oauth');
const mediaRoutes = require('./src/routes/media');
const rulesRoutes = require('./src/routes/rules');
const eventsRoutes = require('./src/routes/events');
const redirectRoutes = require('./src/routes/redirect');

// Mount routes
// Webhook needs raw body for HMAC signature verification
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

// Other routes need JSON parser
app.use(express.json());

app.use('/api', setupRoutes);
app.use('/api', mediaRoutes);
app.use('/api', rulesRoutes);
app.use('/api', eventsRoutes);
app.use('/auth', oauthRoutes);
app.use('/', redirectRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
