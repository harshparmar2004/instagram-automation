const Database = require('better-sqlite3');
const path = require('path');

let db;

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
      like_count INTEGER DEFAULT 0
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
  `);

  // Safe migrations
  try { db.exec(`ALTER TABLE rules ADD COLUMN public_reply TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE rules ADD COLUMN delay_seconds INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE rules ADD COLUMN variations_json TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN views_count INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN comments_count INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN media_product_type TEXT DEFAULT 'FEED';`); } catch (e) {}
  try { db.exec(`ALTER TABLE media ADD COLUMN like_count INTEGER DEFAULT 0;`); } catch (e) {}
  try { db.exec(`ALTER TABLE events ADD COLUMN synced_to_sheet INTEGER DEFAULT 0;`); } catch (e) {}

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

module.exports = {
  getDb,
  getConfig,
  setConfig,
  backupRules,
  restoreRules,
  backupEvents,
  restoreEvents
};
