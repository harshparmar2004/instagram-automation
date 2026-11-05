/**
 * Turso (libSQL) Cloud Integration Service
 * Connects to Turso cloud database over ultra-fast HTTPS Pipeline API.
 * Provides schema initialization, bidirectional replication, and real-time cloud sync.
 */

function getTursoConfig() {
    if (!process.env.TURSO_DATABASE_URL) {
        try { require('dotenv').config(); } catch(e) {}
    }
    let url = process.env.TURSO_DATABASE_URL || '';
    const token = process.env.TURSO_AUTH_TOKEN || '';

    if (!url) return null;

    // Convert libsql:// to https:// for HTTP pipeline
    if (url.startsWith('libsql://')) {
        url = url.replace('libsql://', 'https://');
    }
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = `https://${url}`;
    }

    const endpoint = `${url.replace(/\/$/, '')}/v2/pipeline`;
    return { url, token, endpoint };
}

function formatArgs(params = []) {
    return params.map(val => {
        if (val === null || val === undefined) return { type: 'null' };
        if (typeof val === 'number') {
            return Number.isInteger(val)
                ? { type: 'integer', value: String(val) }
                : { type: 'float', value: val };
        }
        if (typeof val === 'boolean') {
            return { type: 'integer', value: val ? '1' : '0' };
        }
        return { type: 'text', value: String(val) };
    });
}

function parseRows(cols = [], rows = []) {
    return rows.map(row => {
        const obj = {};
        cols.forEach((col, idx) => {
            const cell = row[idx];
            if (!cell || cell.type === 'null') {
                obj[col.name] = null;
            } else if (cell.type === 'integer') {
                const num = Number(cell.value);
                obj[col.name] = Number.isSafeInteger(num) ? num : cell.value;
            } else if (cell.type === 'float') {
                obj[col.name] = parseFloat(cell.value);
            } else {
                obj[col.name] = cell.value;
            }
        });
        return obj;
    });
}

/**
 * Execute a single SQL statement on Turso
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<{ rows: Array, affectedRows: number, lastInsertRowid: string|null }>}
 */
async function execute(sql, params = []) {
    const cfg = getTursoConfig();
    if (!cfg || !cfg.token) {
        throw new Error('Turso credentials (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN) not configured.');
    }

    const payload = {
        requests: [
            {
                type: 'execute',
                stmt: {
                    sql,
                    args: formatArgs(params)
                }
            }
        ]
    };

    const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${cfg.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Turso HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const resultItem = data.results && data.results[0];

    if (!resultItem || resultItem.type !== 'ok') {
        const err = resultItem?.error?.message || 'Turso execution error';
        throw new Error(`Turso Error: ${err}`);
    }

    const resObj = resultItem.response?.result;
    const rows = parseRows(resObj?.cols, resObj?.rows);

    return {
        rows,
        affectedRows: resObj?.affected_row_count || 0,
        lastInsertRowid: resObj?.last_insert_rowid || null
    };
}

/**
 * Execute a batch of SQL statements in a single transaction on Turso
 * @param {Array<{ sql: string, params?: Array }>} statements
 */
async function batch(statements = []) {
    const cfg = getTursoConfig();
    if (!cfg || !cfg.token) return [];
    if (!Array.isArray(statements) || statements.length === 0) return [];

    const requests = statements.map(st => ({
        type: 'execute',
        stmt: {
            sql: typeof st === 'string' ? st : st.sql,
            args: formatArgs(st.params || [])
        }
    }));

    const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${cfg.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Turso Batch HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.results || [];
}

/**
 * Initialize all database tables on Turso cloud
 */
async function initSchema() {
    console.log('[Turso] Initializing database schema on Turso Cloud...');

    const tables = [
        `CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT
        );`,

        `CREATE TABLE IF NOT EXISTS media (
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
            status TEXT DEFAULT 'active',
            user_id INTEGER
        );`,

        `CREATE TABLE IF NOT EXISTS reel_stats_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER,
            month_year TEXT,
            views_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            dms_sent_count INTEGER DEFAULT 0,
            clicks_count INTEGER DEFAULT 0,
            updated_at TEXT,
            user_id INTEGER,
            UNIQUE(media_id, month_year)
        );`,

        `CREATE TABLE IF NOT EXISTS rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER NULLABLE,
            trigger_keyword TEXT,
            action_type TEXT,
            response_text TEXT,
            link_url TEXT,
            follow_prompt TEXT,
            public_reply TEXT,
            delay_seconds INTEGER DEFAULT 0,
            variations_json TEXT,
            buttons_config_json TEXT,
            is_active INTEGER DEFAULT 1,
            is_deleted INTEGER DEFAULT 0,
            source_type TEXT DEFAULT 'reel',
            created_at TEXT,
            updated_at TEXT,
            user_id INTEGER
        );`,

        `CREATE TABLE IF NOT EXISTS events (
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
            synced_to_sheet INTEGER DEFAULT 0,
            user_id INTEGER,
            created_at TEXT
        );`,

        `CREATE TABLE IF NOT EXISTS clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER,
            tracking_id TEXT,
            clicked_at TEXT,
            user_agent TEXT
        );`,

        `CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commenter_ig_id TEXT,
            rule_id INTEGER,
            event_id INTEGER,
            user_id INTEGER,
            state TEXT DEFAULT 'awaiting_reply',
            created_at TEXT,
            completed_at TEXT
        );`,

        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            status TEXT DEFAULT 'active',
            email_verified INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
        );`,

        `CREATE TABLE IF NOT EXISTS user_sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );`,

        `CREATE TABLE IF NOT EXISTS instagram_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
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
        );`,

        `CREATE TABLE IF NOT EXISTS email_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL COLLATE NOCASE,
            otp_hash TEXT NOT NULL,
            type TEXT DEFAULT 'registration',
            attempts_count INTEGER DEFAULT 0,
            expires_at TEXT NOT NULL,
            is_consumed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );`
    ];

    for (const ddl of tables) {
        try {
            await execute(ddl);
        } catch (e) {
            console.warn('[Turso] Table creation warning:', e.message);
        }
    }

    try {
        await execute("ALTER TABLE rules ADD COLUMN source_type TEXT DEFAULT 'reel';");
    } catch (e) {}

    console.log('✅ [Turso] All database tables successfully initialized on Turso Cloud!');
}

/**
 * Synchronize all current local SQLite data into Turso Cloud
 * @param {object} localDb - local database instance
 */
async function syncLocalToTurso(localDb) {
    if (!localDb) return;
    const cfg = getTursoConfig();
    if (!cfg || !cfg.token) return;

    console.log('[Turso] Synchronizing local database to Turso Cloud...');

    try {
        // 1. Config
        const configs = localDb.prepare('SELECT key, value, updated_at FROM config').all();
        if (configs.length > 0) {
            const stmts = configs.map(c => ({
                sql: 'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
                params: [c.key, c.value, c.updated_at]
            }));
            await batch(stmts);
        }

        // 2. Users
        const users = localDb.prepare('SELECT id, name, email, password_hash, role, status, email_verified, created_at, updated_at FROM users').all();
        if (users.length > 0) {
            const stmts = users.map(u => ({
                sql: `INSERT INTO users (id, name, email, password_hash, role, status, email_verified, created_at, updated_at) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
                      ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, password_hash = excluded.password_hash, role = excluded.role, status = excluded.status, email_verified = excluded.email_verified, updated_at = excluded.updated_at`,
                params: [u.id, u.name, u.email, u.password_hash, u.role, u.status, u.email_verified || 0, u.created_at, u.updated_at]
            }));
            await batch(stmts);
        }

        // 3. Instagram Accounts
        const igAccounts = localDb.prepare('SELECT id, user_id, ig_user_id, ig_username, ig_name, profile_pic, access_token, token_type, token_expires_at, is_active, created_at, updated_at FROM instagram_accounts').all();
        if (igAccounts.length > 0) {
            const stmts = igAccounts.map(a => ({
                sql: `INSERT INTO instagram_accounts (id, user_id, ig_user_id, ig_username, ig_name, profile_pic, access_token, token_type, token_expires_at, is_active, created_at, updated_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, ig_user_id = excluded.ig_user_id, ig_username = excluded.ig_username, access_token = excluded.access_token, token_expires_at = excluded.token_expires_at, is_active = excluded.is_active, updated_at = excluded.updated_at`,
                params: [a.id, a.user_id, a.ig_user_id, a.ig_username, a.ig_name, a.profile_pic, a.access_token, a.token_type || 'long_lived', a.token_expires_at, a.is_active, a.created_at, a.updated_at]
            }));
            await batch(stmts);
        }

        // 4. Media
        const media = localDb.prepare('SELECT id, ig_media_id, media_type, media_product_type, caption, thumbnail_url, media_url, permalink, timestamp, synced_at, views_count, comments_count, like_count, status, user_id FROM media').all();
        if (media.length > 0) {
            const stmts = media.map(m => ({
                sql: `INSERT INTO media (id, ig_media_id, media_type, media_product_type, caption, thumbnail_url, media_url, permalink, timestamp, synced_at, views_count, comments_count, like_count, status, user_id)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(ig_media_id) DO UPDATE SET caption = excluded.caption, comments_count = excluded.comments_count, like_count = excluded.like_count, views_count = excluded.views_count, status = excluded.status, synced_at = excluded.synced_at`,
                params: [m.id, m.ig_media_id, m.media_type, m.media_product_type, m.caption, m.thumbnail_url, m.media_url, m.permalink, m.timestamp, m.synced_at, m.views_count, m.comments_count, m.like_count, m.status, m.user_id]
            }));
            await batch(stmts);
        }

        // 5. Rules
        const rules = localDb.prepare('SELECT id, media_id, trigger_keyword, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, buttons_config_json, is_active, is_deleted, created_at, updated_at, user_id, source_type FROM rules').all();
        if (rules.length > 0) {
            const stmts = rules.map(r => ({
                sql: `INSERT INTO rules (id, media_id, trigger_keyword, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, buttons_config_json, is_active, is_deleted, created_at, updated_at, user_id, source_type)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET trigger_keyword = excluded.trigger_keyword, response_text = excluded.response_text, link_url = excluded.link_url, public_reply = excluded.public_reply, is_active = excluded.is_active, is_deleted = excluded.is_deleted, updated_at = excluded.updated_at, source_type = excluded.source_type`,
                params: [r.id, r.media_id, r.trigger_keyword, r.action_type, r.response_text, r.link_url, r.follow_prompt, r.public_reply, r.delay_seconds, r.variations_json, r.buttons_config_json, r.is_active, r.is_deleted, r.created_at, r.updated_at, r.user_id, r.source_type || 'reel']
            }));
            await batch(stmts);
        }

        console.log(`✅ [Turso] Cloud sync complete (${users.length} users, ${media.length} media, ${rules.length} automations).`);
    } catch (err) {
        console.error('[Turso] Cloud sync error:', err.message);
    }
}

/**
 * Hydrate local database from Turso Cloud on container start/reboot
 * @param {object} localDb
 */
async function hydrateLocalFromTurso(localDb) {
    if (!localDb) return;
    const cfg = getTursoConfig();
    if (!cfg || !cfg.token) return;

    try {
        console.log('[Turso] Checking Turso Cloud for state hydration...');

        // 1. Restore Users
        const usersRes = await execute('SELECT * FROM users');
        if (usersRes.rows.length > 0) {
            const upsertUser = localDb.prepare(`
                INSERT INTO users (id, name, email, password_hash, role, status, email_verified, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, password_hash = excluded.password_hash, role = excluded.role, status = excluded.status, email_verified = excluded.email_verified, updated_at = excluded.updated_at
            `);
            for (const u of usersRes.rows) {
                try {
                    upsertUser.run(u.id, u.name, u.email, u.password_hash, u.role, u.status, u.email_verified || 0, u.created_at, u.updated_at);
                } catch(e) {}
            }
        }

        // 2. Restore Instagram Accounts
        const acctsRes = await execute('SELECT * FROM instagram_accounts WHERE is_active = 1');
        if (acctsRes.rows.length > 0) {
            const upsertAcct = localDb.prepare(`
                INSERT INTO instagram_accounts (id, user_id, ig_user_id, ig_username, ig_name, profile_pic, access_token, token_type, token_expires_at, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, ig_user_id = excluded.ig_user_id, ig_username = excluded.ig_username, access_token = excluded.access_token, token_expires_at = excluded.token_expires_at, is_active = excluded.is_active, updated_at = excluded.updated_at
            `);
            for (const a of acctsRes.rows) {
                try {
                    upsertAcct.run(a.id, a.user_id, a.ig_user_id, a.ig_username, a.ig_name, a.profile_pic, a.access_token, a.token_type || 'long_lived', a.token_expires_at, a.is_active, a.created_at, a.updated_at);
                } catch(e) {}
            }
        }

        // 3. Restore Media
        const mediaRes = await execute("SELECT * FROM media WHERE status != 'deleted'");
        if (mediaRes.rows.length > 0) {
            const upsertMedia = localDb.prepare(`
                INSERT INTO media (id, ig_media_id, media_type, media_product_type, caption, thumbnail_url, media_url, permalink, timestamp, synced_at, views_count, comments_count, like_count, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(ig_media_id) DO UPDATE SET caption = excluded.caption, comments_count = excluded.comments_count, like_count = excluded.like_count, views_count = excluded.views_count, status = 'active', synced_at = excluded.synced_at
            `);
            for (const m of mediaRes.rows) {
                try {
                    upsertMedia.run(m.id, m.ig_media_id, m.media_type, m.media_product_type, m.caption, m.thumbnail_url, m.media_url, m.permalink, m.timestamp, m.synced_at, m.views_count, m.comments_count, m.like_count, m.status, m.user_id);
                } catch(e) {}
            }
        }

        // 4. Restore Rules
        const rulesRes = await execute('SELECT * FROM rules');
        if (rulesRes.rows.length > 0) {
            const upsertRule = localDb.prepare(`
                INSERT INTO rules (id, media_id, trigger_keyword, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, buttons_config_json, is_active, is_deleted, created_at, updated_at, user_id, source_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET trigger_keyword = excluded.trigger_keyword, response_text = excluded.response_text, link_url = excluded.link_url, public_reply = excluded.public_reply, is_active = excluded.is_active, is_deleted = excluded.is_deleted, updated_at = excluded.updated_at, source_type = excluded.source_type
            `);
            for (const r of rulesRes.rows) {
                try {
                    upsertRule.run(r.id, r.media_id, r.trigger_keyword, r.action_type, r.response_text, r.link_url, r.follow_prompt, r.public_reply, r.delay_seconds, r.variations_json, r.buttons_config_json, r.is_active, r.is_deleted, r.created_at, r.updated_at, r.user_id, r.source_type || 'reel');
                } catch(e) {}
            }
        }

        // 5. Restore Config
        const configRes = await execute('SELECT * FROM config');
        if (configRes.rows.length > 0) {
            const upsertConfig = localDb.prepare(`
                INSERT INTO config (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            `);
            for (const c of configRes.rows) {
                try {
                    if (c.value && !c.value.includes('••••') && !c.value.includes('***')) {
                        upsertConfig.run(c.key, c.value, c.updated_at || new Date().toISOString());
                    }
                } catch(e) {}
            }
        }

        // 6. Restore Sessions (so users stay logged in across restarts/redeploys)
        try {
            const nowIso = new Date().toISOString();
            const sessRes = await execute('SELECT * FROM user_sessions WHERE expires_at > ?', [nowIso]);
            const ins = localDb.prepare('INSERT OR IGNORE INTO user_sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)');
            for (const s of sessRes.rows) {
                try { ins.run(s.token, s.user_id, s.expires_at, s.created_at); } catch (e) {}
            }
        } catch (e) { console.warn('[Turso] Session hydration notice:', e.message); }

        // 7. Restore Events / Clicks / Conversations / Monthly stats (dashboard counters + tracking)
        try {
            const evRes = await execute('SELECT * FROM events');
            const insEv = localDb.prepare(`INSERT OR IGNORE INTO events (id, rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, dm_status, dm_message_id, tracking_id, synced_to_sheet, user_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            const updEv = localDb.prepare('UPDATE events SET dm_status = ?, dm_message_id = ? WHERE id = ?');
            for (const e of evRes.rows) {
                try {
                    insEv.run(e.id, e.rule_id, e.comment_id, e.comment_text, e.commenter_ig_id, e.commenter_username, e.media_ig_id, e.dm_status, e.dm_message_id, e.tracking_id, e.synced_to_sheet || 0, e.user_id, e.created_at);
                    updEv.run(e.dm_status, e.dm_message_id, e.id);
                } catch (er) {}
            }

            const clRes = await execute('SELECT * FROM clicks');
            const insCl = localDb.prepare('INSERT OR IGNORE INTO clicks (id, event_id, tracking_id, clicked_at, user_agent) VALUES (?, ?, ?, ?, ?)');
            for (const c of clRes.rows) {
                try { insCl.run(c.id, c.event_id, c.tracking_id, c.clicked_at, c.user_agent); } catch (er) {}
            }

            const cvRes = await execute('SELECT * FROM conversations');
            const insCv = localDb.prepare('INSERT OR IGNORE INTO conversations (id, commenter_ig_id, rule_id, event_id, user_id, state, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            for (const c of cvRes.rows) {
                try { insCv.run(c.id, c.commenter_ig_id, c.rule_id, c.event_id, c.user_id, c.state, c.created_at, c.completed_at); } catch (er) {}
            }

            const stRes = await execute('SELECT * FROM reel_stats_history');
            const insSt = localDb.prepare(`INSERT OR IGNORE INTO reel_stats_history (id, media_id, month_year, views_count, comments_count, dms_sent_count, clicks_count, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const s of stRes.rows) {
                try { insSt.run(s.id, s.media_id, s.month_year, s.views_count, s.comments_count, s.dms_sent_count, s.clicks_count, s.updated_at); } catch (er) {}
            }
        } catch (e) { console.warn('[Turso] Tracking hydration notice:', e.message); }

        try {
            const { backupInstagramAccounts, backupSettings, backupRules } = require('../database');
            backupInstagramAccounts(localDb);
            backupSettings(localDb);
            backupRules(localDb);
        } catch(be) {}

        console.log(`✅ [Turso] Local state successfully hydrated from Turso Cloud!`);
    } catch (err) {
        console.warn('[Turso] State hydration notice:', err.message);
    }
}

/**
 * Real-time background sync hook: Call after important write operations
 * @param {string} sql
 * @param {Array} params
 */
function asyncSync(sql, params = []) {
    execute(sql, params).catch(err => {
        console.warn('[Turso] Async background sync notice:', err.message);
    });
}

module.exports = {
    getTursoConfig,
    execute,
    batch,
    initSchema,
    syncLocalToTurso,
    hydrateLocalFromTurso,
    asyncSync
};
