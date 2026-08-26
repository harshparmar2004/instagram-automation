# 🚀 InstaAuto Production Deployment Guide

This guide covers deploying **InstaAuto** either as a **Single Web Service on Render** or as a **Split Vercel (Frontend) + Render (Backend)** platform.

---

### ✅ 1. Option A: Split Deployment — Vercel (Frontend) + Render (Backend)

If you want to host the frontend on **Vercel** (`https://instaauto.vercel.app`) and the backend on **Render** (`https://instaauto-backend.onrender.com`):

1. **Deploy Backend on Render**:
   - Push your code to GitHub.
   - Create a Web Service on Render pointing to your GitHub repository.
   - Build Command: `npm install` | Start Command: `node server.js`
   - Note down your backend Render URL (e.g. `https://instaauto-backend.onrender.com`).

2. **Configure `vercel.json`**:
   - Open `vercel.json` in your repository and update the destination URL with your Render backend URL:
   ```json
   {
     "version": 2,
     "public": true,
     "cleanUrls": true,
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://instaauto-backend.onrender.com/api/$1" },
       { "source": "/auth/(.*)", "destination": "https://instaauto-backend.onrender.com/auth/$1" },
       { "source": "/webhook", "destination": "https://instaauto-backend.onrender.com/webhook" },
       { "source": "/r/(.*)", "destination": "https://instaauto-backend.onrender.com/r/$1" }
     ]
   }
   ```

3. **Deploy Frontend on Vercel**:
   - Import your GitHub repository into Vercel.
   - Deploy as a static website. Vercel will automatically read `vercel.json` and proxy all `/api/*`, `/webhook`, and `/r/*` calls to Render!

---

### 🌐 2. Option B: Unified Single Deploy on Render (Recommended ⭐⭐⭐⭐⭐)

Deploying both frontend and backend on Render is the simplest approach:
1. Render hosts the Node.js server (`server.js`) on port 3000.
2. Serves the static frontend UI (`public/index.html`) and backend API on a single URL (`https://your-app-name.onrender.com`).
3. Single Webhook Callback URL: `https://your-app-name.onrender.com/api/webhook`.

---

### 📱 3. Meta Developer App Live Activation Checklist

1. Go to [developers.facebook.com](https://developers.facebook.com/apps) → Select your **Business App**.
2. Go to **Webhooks → Instagram**.
3. Set **Callback URL**: `https://your-render-url.onrender.com/api/webhook` (or your domain).
4. Set **Verify Token**: Matching your `WEBHOOK_VERIFY_TOKEN`.
5. Click **Verify & Save**, then subscribe to `comments` and `messages`.
6. Add target Instagram handle under **App Roles → Instagram Testers**.

---

### 🛡️ 4. Post-Deployment Verification
- Open your live app URL.
- Verify **Connected Status**: `🟢 Connected: Instagram Business Account (@creator.studio)`.
- Click **`🔄 Force Manual Token Refresh`** in Settings & Setup to test 60-day token telemetry.
- Post a comment (`"PLAYBOOK"`) on an Instagram Reel to test real-time DM dispatches!
