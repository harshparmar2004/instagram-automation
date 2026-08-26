# 🚀 InstaAuto Production Deployment Guide

This guide covers everything required to deploy **InstaAuto** to production and connect it live with your Meta Developer App and Instagram Account.

---

### ✅ 1. Pre-Deployment Verification
- **Runtime Environment**: Node.js v18+ & SQLite 3
- **Local Server Test**: `node server.js` running on `http://localhost:3000`
- **Database Initialized**: `automation.db` with `rules`, `events`, `conversations`, `clicks`, and `config` tables.

---

### 🌐 2. Cloud Deployment Options

#### Option A: Deploy on Render / Railway (Recommended PaaS)
1. **Repository Setup**: Push your codebase to GitHub/GitLab.
2. **Create New Web Service**:
   - Connect your repository.
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
3. **Set Environment Variables**:
   ```env
   PORT=3000
   BASE_URL=https://your-app-name.onrender.com
   DASHBOARD_PASSWORD=your_secure_admin_password
   META_APP_ID=9876543210123
   META_APP_SECRET=your_meta_app_secret
   WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
   ```
4. **Deploy**: Click **Deploy Web Service**. Note down your live HTTPS URL (`https://your-app-name.onrender.com`).

---

#### Option B: Deploy on VPS / DigitalOcean / AWS (PM2 + Nginx + SSL)
1. **Server Setup**:
   ```bash
   sudo apt update && sudo apt install -g nodejs npm nginx certbot python3-certbot-nginx
   sudo npm install -g pm2
   ```
2. **Clone & Install**:
   ```bash
   git clone https://github.com/your-username/instagram-automation.git
   cd instagram-automation
   npm install
   ```
3. **Start Process with PM2**:
   ```bash
   pm2 start server.js --name "instaauto"
   pm2 save
   pm2 startup
   ```
4. **Nginx Reverse Proxy Configuration** (`/etc/nginx/sites-available/instaauto`):
   ```nginx
   server {
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
5. **Enable Site & Obtain SSL**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/instaauto /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

### 📱 3. Meta Developer App Live Activation Checklist

1. **Log in to Meta Developers Console**:
   - Go to [developers.facebook.com](https://developers.facebook.com/apps).
   - Open your **Business App**.

2. **Configure Webhook Endpoint**:
   - Navigate to **Webhooks** → **Instagram**.
   - Set **Callback URL**: `https://your-domain.com/api/webhook`
   - Set **Verify Token**: Matching your `WEBHOOK_VERIFY_TOKEN`.
   - Click **Verify and Save**.

3. **Subscribe to Webhook Fields**:
   - Under Instagram Webhook Subscriptions, enable:
     - `comments`
     - `messages`

4. **Add Instagram Account / Go Live**:
   - **For Single Account Setup**: Add your Instagram handle under **App Roles → Instagram Testers**. Accept tester invitation in Instagram Settings → Apps and Websites.
   - **For Public Launch**: Submit App Review for `instagram_basic`, `instagram_manage_comments`, and `pages_messaging` permissions, then switch App Mode to **Live**.

---

### 🛡️ 4. Post-Deployment Verification
- Open `https://your-domain.com/#setup`.
- Verify **Connected Status**: `🟢 Connected: Instagram Business Account (@creator.studio)`.
- Click **`🔄 Test & Refresh Token Now`** to verify 60-day token extension telemetry.
- Post a test comment (`"PLAYBOOK"`) on a Reel to test live end-to-end DM dispatch!
