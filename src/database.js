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

  return db;
}

// Config table helpers
function getConfig(key) {
  const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setConfig(key, value) {
  getDb().prepare(`
    INSERT INTO config (key, value, updated_at) 
    VALUES (?, ?, ?) 
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, new Date().toISOString());
}

module.exports = {
  getDb,
  getConfig,
  setConfig
};
