<p align="center">
  <img src="public/images/logo.png" alt="InstaAuto Logo" width="220" style="border-radius: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);" />
</p>

<h1 align="center">⚡ InstaAuto — Instagram Comment-to-DM Automation Platform</h1>

<p align="center">
  <b>High-performance Meta Graph API automation platform for creators, agencies, and businesses.</b><br />
  Instantly convert Instagram Reel viewers into leads, enforce Follow-First verification gates, and dispatch automated DMs safely with rate-limit protection.
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v18%2B-green.svg?style=flat-square&logo=node.js" alt="Node.js" /></a>
  <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-v4.19-blue.svg?style=flat-square&logo=express" alt="Express" /></a>
  <a href="https://developers.facebook.com/docs/instagram-api/"><img src="https://img.shields.io/badge/Meta_Graph_API-v19.0-0081FB.svg?style=flat-square&logo=meta" alt="Meta Graph API" /></a>
  <a href="https://sqlite.org/"><img src="https://img.shields.io/badge/Database-SQLite3-003B57.svg?style=flat-square&logo=sqlite" alt="SQLite" /></a>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Frontend-Vercel-black.svg?style=flat-square&logo=vercel" alt="Vercel" /></a>
  <a href="https://render.com/"><img src="https://img.shields.io/badge/Backend-Render-46E3B7.svg?style=flat-square&logo=render" alt="Render" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-orange.svg?style=flat-square" alt="License" /></a>
</p>

---

## 📸 Dashboard Interface Overview

<p align="center">
  <img src="public/images/dashboard_preview.png" alt="InstaAuto Dashboard Interface Preview" width="100%" style="border-radius: 16px; border: 1px solid #E6E1D8; box-shadow: 0 10px 40px rgba(0,0,0,0.1);" />
</p>

---

## ✨ Key Features & Capabilities

### 🔐 1. Follow-First Verification Gate
Require followers to follow `@creator.studio` before unlocking deliverable PDF resource links.
- When a viewer comments a trigger keyword, InstaAuto dispatches a polite Follow prompt DM.
- Registers session state (`awaiting_reply`).
- Automatically verifies DM reply confirmation (*"I FOLLOWED"*, *"DONE"*, *"FOLLOWING YOU"*) and releases the resource link!

<p align="center">
  <img src="public/images/workflow_preview.png" alt="Follow-First Workflow Diagram" width="90%" style="border-radius: 14px; margin: 1.5rem 0;" />
</p>

### 🎯 2. Keyword Trigger Engine & Deduplication
- Support for comma-separated trigger keywords (e.g., `PLAYBOOK, PDF, GUIDE, LINK`).
- Case-insensitive regex matching with exact word boundary detection (`\bkeyword\b`).
- Comment-level and user-level deduplication to prevent duplicate DM spam per Reel post.

### ⏱️ 3. Anti-Spam Queue Worker & Pacing (250 DMs/hr Cap Protection)
- Enforces natural delay pacing (`delay_seconds`) before dispatching private replies and direct DMs.
- Rate-limit backoff engine protects account health against Meta spam flags.

### 🎯 4. Deliverable Link Click Telemetry
- Generates unique UUID tracking redirect links (`/r/:trackingId`).
- Logs timestamps, IP address, and user agents in the SQLite database.
- Marks activity log rows with **`🎯 Deliverable Link Clicked ✓`**.

### 🛡️ 5. Automated 60-Day Token Auto-Refresh Cron Engine
- Runs silently every 6 hours (`cron.schedule('0 */6 * * *')`).
- Calls Meta's `refresh_access_token` endpoint to extend long-lived access tokens for 60 days continuously.

### 📊 6. Reel Analytics & Monthly History Archival
- Filter by media item, sort by rank/conversion rate, and view top-performing Reels.
- Month-over-month archival ledger providing historical performance metrics across past campaign cycles.

### 📘 7. About & Meta Developer Handbook
- Built-in developer portal guide with 1-click links to Meta App Dashboard, Graph API Explorer, Access Token Debugger, copyable JSON webhook payloads, and interactive FAQ accordions.

---

## 🏗️ System Architecture & Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Follower as 👤 Follower (@sarah_creator)
    participant IG as 📱 Meta / Instagram Webhook API
    participant Server as ⚡ Webhook Controller (/api/webhook)
    participant Engine as ⚙️ Automation Matcher (automation.js)
    participant DB as 💾 SQLite Database (rules, events, conversations)
    participant Queue as ⏱️ Delay Queue Worker (queue.js)
    participant Redirect as 🔗 Link Tracker (/r/:id)

    Follower->>IG: Comments "PLAYBOOK" on Reel
    IG->>Server: Dispatches Real-Time Webhook (comments field)
    Server->>IG: Responds 200 OK Immediately (Prevents Meta Timeout)
    Server->>Engine: Evaluates Active Rules & Checks Deduplication
    Engine->>DB: Inserts Event Record (status = "pending")
    alt Rule Action: Follow-First Gate
        Engine->>DB: Inserts Conversation (state = 'awaiting_reply')
        Engine->>Queue: Enqueues Gate Prompt DM: "Please follow @creator.studio first!"
        Queue->>IG: Dispatches Gate DM
        Follower->>IG: Follows Account & Replies "I FOLLOWED" in DM
        IG->>Server: Dispatches Message Webhook (messages field)
        Server->>Engine: Matches Sender ID & Verifies State = 'completed'
        Engine->>Queue: Enqueues Deliverable PDF Link DM
    else Rule Action: Link DM
        Engine->>Queue: Enqueues Deliverable Link DM with Delay Pacing
    end
    Queue->>IG: Dispatches Final Resource DM with Tracking Link
    Queue->>DB: Updates Status to "🟢 Delivered"
    Follower->>Redirect: Clicks Deliverable Link in DM
    Redirect->>DB: Logs Click Event in `clicks` table
    Redirect->>Follower: Redirects to PDF Deliverable URL
```

---

## 🛠️ Local Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Step 1: Clone Repository
```bash
git clone https://github.com/harshparmar2004/instagram-automation.git
cd instagram-automation
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` with your settings:
```env
PORT=3000
BASE_URL=http://localhost:3000
DASHBOARD_PASSWORD=your_secure_password
META_APP_ID=9876543210123
META_APP_SECRET=your_meta_app_secret
WEBHOOK_VERIFY_TOKEN=creator_verify_token_2026
```

### Step 4: Start the Application
```bash
# Production mode
npm start

# Development mode with auto-reload
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🚀 Production Deployment Options

InstaAuto supports both **Split Vercel + Render Deployment** and **Unified Render Web Service Deployment**.

### Option A: Split Deployment — Vercel (Frontend) + Render (Backend)

1. **Deploy Backend on Render**:
   - Create a Web Service on [Render](https://render.com) pointing to `harshparmar2004/instagram-automation`.
   - Build Command: `npm install` | Start Command: `node server.js`.
   - Note down your backend Render URL (`https://instaauto-backend.onrender.com`).

2. **Configure `vercel.json`**:
   - Update `vercel.json` rewrites with your Render URL:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://instaauto-backend.onrender.com/api/$1" },
       { "source": "/webhook", "destination": "https://instaauto-backend.onrender.com/webhook" },
       { "source": "/r/(.*)", "destination": "https://instaauto-backend.onrender.com/r/$1" }
     ]
   }
   ```

3. **Deploy Frontend on Vercel**:
   - Import your repository on [Vercel](https://vercel.com) and deploy! Vercel automatically proxies `/api/*` and `/webhook` calls to Render.

---

### Option B: Unified Deployment on Render (Recommended ⭐)

1. Create a single Web Service on Render.
2. Render hosts `server.js`, serving both the static dashboard UI and real-time backend webhooks under a single HTTPS URL (`https://instaauto-engine.onrender.com`).

---

## 📱 Meta Developer App Go-Live Checklist

1. Log in to [developers.facebook.com](https://developers.facebook.com/apps) → Select your **Business App**.
2. Navigate to **Webhooks → Instagram**.
3. Set **Callback URL**: `https://your-backend-domain.com/api/webhook`.
4. Set **Verify Token**: Matching your `WEBHOOK_VERIFY_TOKEN`.
5. Click **Verify and Save**, then subscribe to `comments` and `messages`.
6. Under **App Roles → Instagram Testers**, add your Instagram handle to enable live comment webhooks!

---

## 👨‍💻 Author & License

Developed with ❤️ by **Harsh Parmar** ([@harshparmar2004](https://github.com/harshparmar2004)).

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
