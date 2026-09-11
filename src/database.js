const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

let db;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

function getDb() {
  if (db) return db;

  const fs = require('fs');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'automation.db');
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ig_media_id TEXT UNIQUE,
      media_type TEXT,
      media_product_type TEXT DEFAULT 'FEED',
      caption TEXT,
      thumbnail_url TEXT,
      media_url TEXT,
      permalink TEXT,
      timestamp TEXT,
      synced_at TEXT,
      views_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS reel_stats_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER REFERENCES media(id),
      month_year TEXT,
      views_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      dms_sent_count INTEGER DEFAULT 0,
      clicks_count INTEGER DEFAULT 0,
      updated_at TEXT,
      UNIQUE(media_id, month_year)
    );

    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER NULLABLE REFERENCES media(id),
      trigger_keyword TEXT,
      action_type TEXT CHECK(action_type IN ('direct_dm','link_dm','follow_first')),
      response_text TEXT,
      link_url TEXT,
      follow_prompt TEXT,
      public_reply TEXT,
      delay_seconds INTEGER DEFAULT 0,
      variations_json TEXT,
      buttons_config_json TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER,
      comment_id TEXT UNIQUE,
      comment_text TEXT,
      commenter_ig_id TEXT,
      commenter_username TEXT,
      media_ig_id TEXT,
      dm_status TEXT DEFAULT 'pending',
      dm_message_id TEXT,
      tracking_id TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      tracking_id TEXT,
      clicked_at TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commenter_ig_id TEXT,
      rule_id INTEGER,
      event_id INTEGER,
      state TEXT DEFAULT 'awaiting_reply',
      created_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS instagram_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ig_user_id TEXT UNIQUE,
      ig_username TEXT,
      ig_name TEXT,
      profile_pic TEXT,
      access_token TEXT NOT NULL,
      token_type TEXT DEFAULT 'long_lived',
      token_expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // Safe migrations
  try { db.exec(`ALTER TABLE rules ADD COLUMN public_reply TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE rules ADD COLUMN delay_seconds INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE rules ADD COLUMN variations_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE rules ADD COLUMN buttons_config_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN views_count INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN comments_count INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN media_product_type TEXT DEFAULT 'FEED';`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN like_count INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN status TEXT DEFAULT 'active';`); } catch (e) {}
  try { db.exec(`ALTER TABLE events ADD COLUMN synced_to_sheet INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE rules ADD COLUMN user_id INTEGER REFERENCES users(id);`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN user_id INTEGER REFERENCES users(id);`); } catch (e) {}
  try { db.exec(`ALTER TABLE events ADD COLUMN user_id INTEGER REFERENCES users(id);`); } catch (e) {}
  try { db.exec(`ALTER TABLE conversations ADD COLUMN user_id INTEGER REFERENCES users(id);`); } catch (e) {}
  try { db.exec(`ALTER TABLE reel_stats_history ADD COLUMN user_id INTEGER REFERENCES users(id);`); } catch (e) {}

  // Startup sync: If database config table is empty for any credentials, sync from .env/process.env
  try {
    const checkStmt = db.prepare('SELECT value FROM config WHERE key = ?');
    const insertStmt = db.prepare('INSERT OR IGNORE INTO config (key, value, updated_at) VALUES (?, ?, ?)');
    for (const [cfgKey, envKey] of Object.entries(ENV_MAP)) {
      const existing = checkStmt.get(cfgKey);
      if (!existing || !existing.value) {
        const val = process.env[envKey];
        if (val && !val.includes('••••')) {
          insertStmt.run(cfgKey, val, new Date().toISOString());
        }
      }
    }
  } catch (err) {}

  // Startup sync: Restore automations & events from JSON backup if needed
  try {
    restoreRules(db);
    restoreEvents(db);
  } catch (e) {}

  // Startup sync: Initialize Super Admin & migrate single-user data
  try {
    initSuperAdminAndMigrate(db);
  } catch (e) {
    console.warn('[Database] Super admin migration notice:', e.message);
  }

  return db;
}

const ENV_MAP = {
  'meta_app_id': 'META_APP_ID',
  'meta_app_secret': 'META_APP_SECRET',
  'webhook_verify_token': 'WEBHOOK_VERIFY_TOKEN',
  'access_token': 'INSTAGRAM_ACCESS_TOKEN',
  'ig_user_id': 'INSTAGRAM_USER_ID',
  'ig_username': 'INSTAGRAM_USERNAME',
  'google_sheet_webhook_url': 'GOOGLE_SHEET_WEBHOOK_URL',
  'google_sheet_sync_enabled': 'GOOGLE_SHEET_SYNC_ENABLED'
};

function updateEnvFile(key, value) {
  const envKey = ENV_MAP[key];
  if (!envKey) return;

  process.env[envKey] = value;

  try {
    const fs = require('fs');
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    const regex = new RegExp(`^${envKey}=.*$`, 'm');
    const line = `${envKey}=${value}`;
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, line);
    } else {
      envContent = envContent.trimEnd() + (envContent.length ? '\n' : '') + line + '\n';
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch (e) {
    console.warn('[Database] Failed to write to .env:', e.message);
  }
}

// Config helpers with process.env and file persistence fallback
function getConfig(key) {
  try {
    const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key);
    if (row && row.value && !row.value.includes('••••')) return row.value;
  } catch (e) {}

  if (ENV_MAP[key] && process.env[ENV_MAP[key]]) {
    const val = process.env[ENV_MAP[key]];
    if (val && !val.includes('••••')) return val;
  }

  // File fallback
  try {
    const fs = require('fs');
    const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (data[key] && !String(data[key]).includes('••••')) return data[key];
    }
  } catch(e) {}

  return null;
}

function setConfig(key, value) {
  if (value === undefined || value === null) return;
  const strVal = String(value).trim();

  // Guard: Never overwrite real tokens or secrets with dots or bullets
  if ((key === 'access_token' || key === 'meta_app_secret') && (strVal.includes('•') || strVal.includes('***'))) {
    console.warn(`[Database] Ignored attempt to overwrite ${key} with masked string.`);
    return;
  }

  try {
    getDb().prepare(`
      INSERT INTO config (key, value, updated_at) 
      VALUES (?, ?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, strVal, new Date().toISOString());
  } catch (e) {}

  // Persist to settings.json
  try {
    const fs = require('fs');
    const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
    let current = {};
    if (fs.existsSync(settingsPath)) {
      try { current = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch(e) {}
    }
    current[key] = strVal;
    fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2), 'utf8');
  } catch(e) {}

  // Also persist directly into .env and process.env
  updateEnvFile(key, strVal);
}

function backupRules(dbInstance) {
  try {
    const database = dbInstance || getDb();
    const rules = database.prepare('SELECT * FROM rules ORDER BY id ASC').all();
    const fs = require('fs');
    const rulesPath = path.join(__dirname, '..', 'data', 'rules.json');
    fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2), 'utf8');
    return rules;
  } catch (e) {
    console.warn('[Database] Failed to backup rules:', e.message);
    return [];
  }
}

function restoreRules(dbInstance) {
  try {
    const fs = require('fs');
    const rulesPath = path.join(__dirname, '..', 'data', 'rules.json');
    if (!fs.existsSync(rulesPath)) return;

    const database = dbInstance || getDb();
    const data = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    if (!Array.isArray(data) || data.length === 0) return 0;

    let restoredCount = 0;
    const checkStmt = database.prepare('SELECT id FROM rules WHERE id = ? OR (trigger_keyword = ? AND response_text = ?)');
    const insertStmtWithId = database.prepare(`
      INSERT INTO rules (id, media_id, trigger_keyword, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of data) {
      const existing = checkStmt.get(r.id, r.trigger_keyword, r.response_text);
      if (!existing) {
        // Safely verify if media_id exists in media table to avoid foreign key errors on fresh deploys
        let resolvedMediaId = null;
        if (r.media_id) {
          try {
            const m = database.prepare('SELECT id FROM media WHERE id = ? OR ig_media_id = ?').get(r.media_id, r.media_id);
            if (m) resolvedMediaId = m.id;
          } catch(e) {}
        }

        try {
          insertStmtWithId.run(
            r.id,
            resolvedMediaId,
            r.trigger_keyword,
            r.action_type || 'link_dm',
            r.response_text || null,
            r.link_url || null,
            r.follow_prompt || null,
            r.public_reply || null,
            r.delay_seconds || 0,
            r.variations_json || null,
            r.is_active !== undefined ? r.is_active : 1,
            r.created_at || new Date().toISOString(),
            r.updated_at || new Date().toISOString()
          );
          restoredCount++;
        } catch (insertErr) {
          try {
            database.prepare(`
              INSERT INTO rules (media_id, trigger_keyword, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              resolvedMediaId,
              r.trigger_keyword,
              r.action_type || 'link_dm',
              r.response_text || null,
              r.link_url || null,
              r.follow_prompt || null,
              r.public_reply || null,
              r.delay_seconds || 0,
              r.variations_json || null,
              r.is_active !== undefined ? r.is_active : 1,
              r.created_at || new Date().toISOString(),
              r.updated_at || new Date().toISOString()
            );
            restoredCount++;
          } catch (e2) {}
        }
      }
    }
    return restoredCount;
  } catch (e) {
    console.warn('[Database] Failed to restore rules from rules.json:', e.message);
    return 0;
  }
}

function backupEvents(dbInstance) {
  try {
    const fs = require('fs');
    const database = dbInstance || getDb();
    const events = database.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const eventsPath = path.join(dataDir, 'events.json');
    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2), 'utf8');
    return events;
  } catch (e) {
    console.warn('[Database] Failed to backup events:', e.message);
    return [];
  }
}

function restoreEvents(dbInstance) {
  try {
    const fs = require('fs');
    const eventsPath = path.join(__dirname, '..', 'data', 'events.json');
    if (!fs.existsSync(eventsPath)) return 0;

    const database = dbInstance || getDb();
    const data = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
    if (!Array.isArray(data) || data.length === 0) return 0;

    let restoredCount = 0;
    const checkStmt = database.prepare('SELECT id FROM events WHERE comment_id = ?');
    const insertStmt = database.prepare(`
      INSERT INTO events (id, rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, dm_status, dm_message_id, tracking_id, created_at, synced_to_sheet)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const ev of data) {
      if (!ev.comment_id) continue;
      const existing = checkStmt.get(ev.comment_id);
      if (!existing) {
        try {
          insertStmt.run(
            ev.id,
            ev.rule_id || null,
            ev.comment_id,
            ev.comment_text || '',
            ev.commenter_ig_id || '',
            ev.commenter_username || '',
            ev.media_ig_id || '',
            ev.dm_status || 'delivered',
            ev.dm_message_id || null,
            ev.tracking_id || null,
            ev.created_at || new Date().toISOString(),
            ev.synced_to_sheet || 0
          );
          restoredCount++;
        } catch (insertErr) {
          database.prepare(`
            INSERT INTO events (rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, dm_status, dm_message_id, tracking_id, created_at, synced_to_sheet)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            ev.rule_id || null,
            ev.comment_id,
            ev.comment_text || '',
            ev.commenter_ig_id || '',
            ev.commenter_username || '',
            ev.media_ig_id || '',
            ev.dm_status || 'delivered',
            ev.dm_message_id || null,
            ev.tracking_id || null,
            ev.created_at || new Date().toISOString(),
            ev.synced_to_sheet || 0
          );
          restoredCount++;
        }
      }
    }
    return restoredCount;
  } catch (e) {
    console.warn('[Database] Failed to restore events from events.json:', e.message);
    return 0;
  }
}

function initSuperAdminAndMigrate(database) {
  const adminEmail = (process.env.ADMIN_EMAIL || 'harshparmar686630@gmail.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Harsh@2004';
  const newHash = hashPassword(adminPassword);

  // Check if harshparmar686630@gmail.com exists
  let admin = database.prepare("SELECT id, email, role FROM users WHERE email = ?").get(adminEmail);
  if (!admin) {
    // Check if there was an existing super admin (e.g. admin@instaauto.app)
    const oldSuperAdmin = database.prepare("SELECT id FROM users WHERE role = 'super_admin'").get();
    if (oldSuperAdmin) {
      database.prepare(`
        UPDATE users 
        SET email = ?, name = 'Harsh Parmar', password_hash = ?, role = 'super_admin', status = 'active', updated_at = ?
        WHERE id = ?
      `).run(adminEmail, newHash, new Date().toISOString(), oldSuperAdmin.id);
      admin = database.prepare("SELECT id, email, role FROM users WHERE id = ?").get(oldSuperAdmin.id);
      console.log(`[Database] Updated existing Super Admin to ${adminEmail}`);
    } else {
      const res = database.prepare(`
        INSERT INTO users (name, email, password_hash, role, status, created_at, updated_at)
        VALUES ('Harsh Parmar', ?, ?, 'super_admin', 'active', ?, ?)
      `).run(adminEmail, newHash, new Date().toISOString(), new Date().toISOString());
      admin = { id: res.lastInsertRowid, email: adminEmail, role: 'super_admin' };
      console.log(`[Database] Initialized Super Admin user: ${adminEmail}`);
    }
  } else {
    // Always keep credentials synced with configured admin password
    database.prepare(`
      UPDATE users 
      SET name = 'Harsh Parmar', password_hash = ?, role = 'super_admin', status = 'active', updated_at = ?
      WHERE id = ?
    `).run(newHash, new Date().toISOString(), admin.id);
  }

  if (admin && admin.id) {
    // Assign legacy orphaned records to super admin
    database.prepare('UPDATE rules SET user_id = ? WHERE user_id IS NULL').run(admin.id);
    database.prepare('UPDATE media SET user_id = ? WHERE user_id IS NULL').run(admin.id);
    database.prepare('UPDATE events SET user_id = ? WHERE user_id IS NULL').run(admin.id);
    database.prepare('UPDATE conversations SET user_id = ? WHERE user_id IS NULL').run(admin.id);
    database.prepare('UPDATE reel_stats_history SET user_id = ? WHERE user_id IS NULL').run(admin.id);

    // Sync legacy access token to instagram_accounts if present
    const legacyToken = getConfig('access_token');
    const legacyIgUser = getConfig('ig_username');
    const legacyIgId = getConfig('ig_user_id');
    if (legacyToken && !legacyToken.includes('••••')) {
      const existing = database.prepare('SELECT id FROM instagram_accounts WHERE user_id = ?').get(admin.id);
      if (!existing) {
        database.prepare(`
          INSERT INTO instagram_accounts (user_id, ig_user_id, ig_username, access_token, token_expires_at, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `).run(
          admin.id,
          legacyIgId || '17841400000000000',
          legacyIgUser || 'connected.creator',
          legacyToken,
          getConfig('token_expires_at') || new Date(Date.now() + 60 * 86400000).toISOString(),
          new Date().toISOString(),
          new Date().toISOString()
        );
        console.log('[Database] Migrated active Instagram credentials to Super Admin account.');
      }
    }
  }
}

function createUser({ name, email, password, role = 'user' }) {
  const db = getDb();
  const cleanEmail = email.trim().toLowerCase();
  const hash = hashPassword(password);
  const now = new Date().toISOString();

  const res = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', ?, ?)
  `).run(name.trim(), cleanEmail, hash, role, now, now);

  return getUserById(res.lastInsertRowid);
}

function getUserById(id) {
  return getDb().prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?').get(id);
}

function getUserByEmail(email) {
  if (!email) return null;
  return getDb().prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email.trim().toLowerCase());
}

function createSession(userId, daysValid = 30) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + daysValid * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO user_sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, expiresAt, now.toISOString());

  return { token, expiresAt };
}

function validateSession(token) {
  if (!token) return null;
  const db = getDb();
  const session = db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.name, u.email, u.role, u.status
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token);

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    deleteSession(token);
    return null;
  }
  if (session.status === 'suspended') return null;
  return session;
}

function deleteSession(token) {
  if (!token) return;
  getDb().prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
}

function getUserInstagramAccount(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM instagram_accounts 
    WHERE user_id = ? AND is_active = 1 
    ORDER BY id DESC LIMIT 1
  `).get(userId);
}

function saveUserInstagramAccount(userId, { igUserId, igUsername, igName, profilePic, accessToken, tokenExpiresAt }) {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM instagram_accounts WHERE user_id = ?').get(userId);
  if (existing) {
    db.prepare(`
      UPDATE instagram_accounts 
      SET ig_user_id = COALESCE(?, ig_user_id),
          ig_username = COALESCE(?, ig_username),
          ig_name = COALESCE(?, ig_name),
          profile_pic = COALESCE(?, profile_pic),
          access_token = COALESCE(?, access_token),
          token_expires_at = COALESCE(?, token_expires_at),
          is_active = 1,
          updated_at = ?
      WHERE id = ?
    `).run(igUserId, igUsername, igName, profilePic, accessToken, tokenExpiresAt, now, existing.id);
    return getUserInstagramAccount(userId);
  } else {
    const res = db.prepare(`
      INSERT INTO instagram_accounts (user_id, ig_user_id, ig_username, ig_name, profile_pic, access_token, token_expires_at, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(userId, igUserId || null, igUsername || 'creator', igName || null, profilePic || null, accessToken, tokenExpiresAt || null, now, now);
    return db.prepare('SELECT * FROM instagram_accounts WHERE id = ?').get(res.lastInsertRowid);
  }
}

function getInstagramAccountByIgId(igUserId) {
  if (!igUserId) return null;
  return getDb().prepare(`
    SELECT a.*, u.id as owner_id, u.name as owner_name, u.email as owner_email, u.status as owner_status
    FROM instagram_accounts a
    JOIN users u ON a.user_id = u.id
    WHERE a.ig_user_id = ? AND a.is_active = 1 AND u.status = 'active'
    LIMIT 1
  `).get(igUserId);
}

function getAllUsers(search = '') {
  const db = getDb();
  let query = `
    SELECT 
      u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at,
      a.ig_username, a.ig_user_id, a.token_expires_at, a.is_active as ig_active,
      (SELECT COUNT(*) FROM rules WHERE user_id = u.id) as rules_count,
      (SELECT COUNT(*) FROM events WHERE user_id = u.id) as leads_count,
      (SELECT COUNT(*) FROM media WHERE user_id = u.id) as media_count
    FROM users u
    LEFT JOIN instagram_accounts a ON a.user_id = u.id AND a.is_active = 1
  `;
  const params = [];
  if (search && search.trim()) {
    query += ` WHERE u.name LIKE ? OR u.email LIKE ? OR a.ig_username LIKE ?`;
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }
  query += ` ORDER BY u.id DESC`;
  return db.prepare(query).all(...params);
}

function updateUserStatus(userId, status) {
  return getDb().prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), userId);
}

function deleteUser(userId) {
  const db = getDb();
  db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM instagram_accounts WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM rules WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM media WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM events WHERE user_id = ?').run(userId);
  return db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

function getAdminMetrics() {
  const db = getDb();
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'super_admin'").get()?.count || 0;
  const totalActiveIg = db.prepare('SELECT COUNT(*) as count FROM instagram_accounts WHERE is_active = 1').get()?.count || 0;
  const totalRules = db.prepare('SELECT COUNT(*) as count FROM rules WHERE is_active = 1').get()?.count || 0;
  const totalDMs = db.prepare("SELECT COUNT(*) as count FROM events WHERE dm_status = 'delivered'").get()?.count || 0;
  const totalClicks = db.prepare('SELECT COUNT(*) as count FROM clicks').get()?.count || 0;

  return {
    totalUsers,
    totalActiveIg,
    totalRules,
    totalDMs,
    totalClicks,
    total_users: totalUsers,
    connected_accounts: totalActiveIg,
    active_rules: totalRules,
    total_leads: totalDMs,
    total_clicks: totalClicks
  };
}

module.exports = {
  getDb,
  getConfig,
  setConfig,
  backupRules,
  restoreRules,
  backupEvents,
  restoreEvents,
  hashPassword,
  verifyPassword,
  createUser,
  getUserById,
  getUserByEmail,
  createSession,
  validateSession,
  deleteSession,
  getUserInstagramAccount,
  saveUserInstagramAccount,
  getInstagramAccountByIgId,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAdminMetrics
};
