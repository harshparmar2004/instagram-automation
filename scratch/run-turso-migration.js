require('dotenv').config();
const { getDb } = require('../src/database');
const { initSchema, syncLocalToTurso, execute } = require('../src/services/turso');

async function run() {
    console.log('=== STARTING TURSO CLOUD MIGRATION ===\n');

    // 1. Initialize schema
    await initSchema();

    // 2. Synchronize current local database to Turso
    const localDb = getDb();
    await syncLocalToTurso(localDb);

    // 3. Verify data in Turso
    console.log('\n--- VERIFYING TURSO CLOUD DATA ---');
    const users = await execute('SELECT id, name, email, role, status FROM users');
    console.log(`Turso Users Count: ${users.rows.length}`);
    console.log('Users:', users.rows);

    const media = await execute('SELECT id, ig_media_id, caption, status FROM media');
    console.log(`\nTurso Media Count: ${media.rows.length}`);
    console.log('Media:', media.rows);

    const rules = await execute('SELECT id, trigger_keyword, is_active, is_deleted FROM rules');
    console.log(`\nTurso Rules Count: ${rules.rows.length}`);
    console.log(`Active rules: ${rules.rows.filter(r => r.is_active && !r.is_deleted).length}, Soft-deleted rules: ${rules.rows.filter(r => r.is_deleted).length}`);

    const accts = await execute('SELECT id, ig_username, ig_user_id, access_token FROM instagram_accounts');
    console.log(`\nTurso Instagram Accounts Count: ${accts.rows.length}`);
    if (accts.rows.length > 0) {
        console.log(`Sample account token encrypted format: ${accts.rows[0].access_token.slice(0, 30)}...`);
    }

    console.log('\n=== TURSO CLOUD MIGRATION COMPLETED SUCCESSFULLY! ===');
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
