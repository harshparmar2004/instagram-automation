const { getMedia } = require('./instagram');
const { getDb, getConfig } = require('../database');

async function syncMedia() {
    const token = getConfig('access_token');
    if (!token) {
        console.log('[MediaSync] No access token, skipping sync');
        return { synced: 0, error: 'No access token configured' };
    }

    try {
        console.log('[MediaSync] Fetching media from Instagram with cursor pagination...');
        
        let allItems = [];
        let afterCursor = null;
        let page = 0;
        const maxPages = 10; // Supports up to 500 media items

        while (page < maxPages) {
            const res = await getMedia(token, afterCursor, 50);
            const items = res.data || [];
            if (items.length === 0) break;

            allItems = allItems.concat(items);

            if (res.paging && res.paging.cursors && res.paging.cursors.after && res.paging.next) {
                afterCursor = res.paging.cursors.after;
                page++;
            } else {
                break;
            }
        }
        
        const db = getDb();
        const upsert = db.prepare(`
            INSERT INTO media (
                ig_media_id, media_type, media_product_type, caption, 
                thumbnail_url, media_url, permalink, timestamp, 
                comments_count, like_count, synced_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ig_media_id) DO UPDATE SET 
                media_type = excluded.media_type,
                media_product_type = excluded.media_product_type,
                caption = excluded.caption,
                thumbnail_url = excluded.thumbnail_url,
                media_url = excluded.media_url,
                permalink = excluded.permalink,
                comments_count = excluded.comments_count,
                like_count = excluded.like_count,
                synced_at = excluded.synced_at
        `);

        db.transaction((items) => {
            for (const item of items) {
                const productType = item.media_product_type 
                    || (item.media_type === 'VIDEO' ? 'REELS' : 'FEED');

                upsert.run(
                    item.id,
                    item.media_type || '',
                    productType,
                    item.caption || '',
                    item.thumbnail_url || item.media_url || '',
                    item.media_url || item.thumbnail_url || '',
                    item.permalink || '',
                    item.timestamp || '',
                    item.comments_count || 0,
                    item.like_count || 0,
                    new Date().toISOString()
                );
            }
        })(allItems);

        console.log(`[MediaSync] Successfully synced ${allItems.length} media items across ${page + 1} page(s)`);
        return { synced: allItems.length, pages: page + 1 };
    } catch (err) {
        console.error('[MediaSync] Failed to sync media:', err.response?.data || err.message);
        throw err;
    }
}

module.exports = {
    syncMedia
};
