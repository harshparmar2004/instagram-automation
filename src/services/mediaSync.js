const { getMedia } = require('./instagram');
const { getDb, getConfig } = require('../database');

async function syncMedia() {
    const token = getConfig('access_token');
    if (!token) {
        console.log('[MediaSync] No access token, skipping sync');
        return;
    }

    try {
        console.log('[MediaSync] Fetching media from Instagram...');
        const data = await getMedia(token);
        
        const db = getDb();
        const upsert = db.prepare(`
            INSERT INTO media (ig_media_id, media_type, caption, thumbnail_url, media_url, permalink, timestamp, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ig_media_id) DO UPDATE SET 
                caption = excluded.caption,
                thumbnail_url = excluded.thumbnail_url,
                media_url = excluded.media_url,
                permalink = excluded.permalink,
                synced_at = excluded.synced_at
        `);

        db.transaction((items) => {
            for (const item of items) {
                upsert.run(
                    item.id,
                    item.media_type || '',
                    item.caption || '',
                    item.thumbnail_url || '',
                    item.media_url || '',
                    item.permalink || '',
                    item.timestamp || '',
                    new Date().toISOString()
                );
            }
        })(data.data || []);

        console.log(`[MediaSync] Successfully synced ${(data.data || []).length} media items`);
    } catch (err) {
        console.error('[MediaSync] Failed to sync media:', err.response?.data || err.message);
    }
}

module.exports = {
    syncMedia
};
