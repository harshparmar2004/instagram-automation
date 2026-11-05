const crypto = require('crypto');
const { getMedia, getMediaComments, getMediaInsights, getStories } = require('./instagram');
const { getDb, getConfig, getUserInstagramAccount, backupRules, restoreRules, backupEvents, restoreEvents, backupMedia } = require('../database');

async function syncMedia(userId = null) {
    let token = null;
    let acct = null;
    if (userId) {
        acct = getUserInstagramAccount(userId);
        token = acct ? acct.access_token : null;
    }
    if (!token) {
        token = getConfig('access_token');
    }

    if (!token) {
        console.log('[MediaSync] No access token, skipping sync');
        return { synced: 0, error: 'No access token configured' };
    }

    try {
        console.log(`[MediaSync] Fetching media from Instagram with cursor pagination (userId: ${userId || 'default'})...`);
        
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

        // Fetch active stories from Instagram
        let activeStories = [];
        try {
            const storiesRes = await getStories(token);
            activeStories = (storiesRes && storiesRes.data) || [];
            console.log(`[MediaSync] Fetched ${activeStories.length} active stories from Instagram.`);
        } catch (storyErr) {
            console.log('[MediaSync] Stories fetch notice:', storyErr.message);
        }

        // Fetch live Instagram Insights (views & reach) for each media item
        for (const item of allItems) {
            try {
                const insights = await getMediaInsights(token, item.id);
                item.views_count = insights.views || 0;
            } catch (e) {
                item.views_count = 0;
            }
        }
        
        const db = getDb();
        const upsert = db.prepare(`
            INSERT INTO media (
                ig_media_id, media_type, media_product_type, caption, 
                thumbnail_url, media_url, permalink, timestamp, 
                comments_count, like_count, views_count, status, synced_at, user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            ON CONFLICT(ig_media_id) DO UPDATE SET 
                media_type = excluded.media_type,
                media_product_type = excluded.media_product_type,
                caption = excluded.caption,
                thumbnail_url = excluded.thumbnail_url,
                media_url = excluded.media_url,
                permalink = excluded.permalink,
                comments_count = excluded.comments_count,
                like_count = excluded.like_count,
                views_count = CASE WHEN excluded.views_count > 0 THEN excluded.views_count ELSE media.views_count END,
                status = 'active',
                synced_at = excluded.synced_at,
                user_id = COALESCE(media.user_id, excluded.user_id)
        `);

        db.transaction((feedItems, stories) => {
            for (const item of feedItems) {
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
                    item.views_count || 0,
                    new Date().toISOString(),
                    userId
                );
            }

            for (const story of stories) {
                upsert.run(
                    story.id,
                    story.media_type || 'IMAGE',
                    'STORY',
                    story.caption || 'Active Instagram Story',
                    story.thumbnail_url || story.media_url || '',
                    story.media_url || story.thumbnail_url || '',
                    story.permalink || '',
                    story.timestamp || new Date().toISOString(),
                    0,
                    0,
                    0,
                    new Date().toISOString(),
                    userId
                );
            }
        })(allItems, activeStories);

        // Mark any feed media that was deleted from Instagram as 'deleted' (excluding stories)
        const liveIgIds = allItems.map(item => String(item.id));
        if (liveIgIds.length > 0) {
            const placeholders = liveIgIds.map(() => '?').join(',');
            let deleteQuery = `UPDATE media SET status = 'deleted' WHERE media_product_type != 'STORY' AND ig_media_id NOT IN (${placeholders})`;
            const deleteParams = [...liveIgIds];
            if (userId) {
                deleteQuery += ` AND (user_id = ? OR user_id IS NULL)`;
                deleteParams.push(userId);
            }
            db.prepare(deleteQuery).run(...deleteParams);

            try {
                const { asyncSync } = require('./turso');
                asyncSync(deleteQuery, deleteParams);
            } catch(e) {}
        }

        // Expire any stories older than 24h
        try {
            db.prepare("UPDATE media SET status = 'deleted' WHERE media_product_type = 'STORY' AND timestamp < datetime('now', '-24 hours')").run();
        } catch(e) {}

        // Persist all synced media to data/media.json for restart persistence
        try {
            backupMedia(db);
        } catch (backupErr) {
            console.warn('[MediaSync] Notice backing up media:', backupErr.message);
        }

        console.log(`[MediaSync] Successfully synced ${allItems.length} media items across ${page + 1} page(s)`);

        // === 1. SMART AUTO-RELINK: Resolve reel IDs cleanly without forcing unrelated rules ===
        try {
            const realMediaRows = db.prepare("SELECT * FROM media WHERE status != 'deleted' AND ig_media_id NOT LIKE '179001122%' ORDER BY timestamp DESC").all();
            const allRules = db.prepare("SELECT * FROM rules WHERE is_deleted = 0").all();

            if (realMediaRows.length > 0 && allRules.length > 0) {
                for (const rule of allRules) {
                    if (rule.media_id === 'global' || rule.media_id === null) continue;
                    if (rule.source_type === 'story' || rule.source_type === 'story_mention') continue;

                    // Check if current media_id exists in media table
                    const existingMedia = db.prepare("SELECT id, ig_media_id, status FROM media WHERE id = ? OR ig_media_id = ?").get(rule.media_id, rule.media_id);
                    
                    if (!existingMedia || existingMedia.status === 'deleted') {
                        // Find matching active media by caption or latest active media
                        const matchingActive = realMediaRows.find(m => (m.caption || '').toLowerCase().includes('link')) || realMediaRows[0];
                        if (matchingActive) {
                            db.prepare("UPDATE rules SET media_id = ? WHERE id = ?").run(matchingActive.id, rule.id);
                            rule.media_id = matchingActive.id;
                        }
                    } else if (rule.media_id !== existingMedia.id) {
                        // Ensure rule.media_id is integer primary key for clean relations
                        db.prepare("UPDATE rules SET media_id = ? WHERE id = ?").run(existingMedia.id, rule.id);
                    }
                }
            }
        } catch (linkErr) {
            console.warn('[MediaSync] Notice during rule auto-linking:', linkErr.message);
        }

        // === 2. REAL HISTORY SYNC: Fetch real comments from Instagram and process automation ===
        let totalCommentsFetched = 0;
        try {
            const mediaToFetch = allItems.length > 0 ? allItems : db.prepare("SELECT * FROM media WHERE status != 'deleted'").all();
            const myUsername = (acct?.ig_username || getConfig('ig_username') || '').toLowerCase().replace('@', '').trim();
            const myIgUserId = String(acct?.ig_user_id || getConfig('ig_user_id') || '').trim();
            const { processCommentEvent } = require('./automation');
            
            for (const m of mediaToFetch) {
                const igMediaId = m.ig_media_id || m.id;
                if (!igMediaId) continue;

                const mediaRow = db.prepare("SELECT id, views_count, comments_count FROM media WHERE ig_media_id = ?").get(String(igMediaId));
                const mediaLocalId = mediaRow ? mediaRow.id : null;
                if (mediaRow && m.id) {
                    // Always keep the monthly analytics snapshot fresh, even with zero comments
                    try {
                        const currentMonth = new Date().toISOString().slice(0, 7);
                        const dmsNow = db.prepare("SELECT COUNT(*) as c FROM events WHERE media_ig_id = ? AND dm_status IN ('sent', 'delivered')").get(String(igMediaId))?.c || 0;
                        const clicksNow = db.prepare("SELECT COUNT(*) as c FROM clicks c JOIN events e ON c.event_id = e.id WHERE e.media_ig_id = ?").get(String(igMediaId))?.c || 0;
                        const statsArgs = [mediaRow.id, currentMonth, m.views_count || mediaRow.views_count || 0, m.comments_count || mediaRow.comments_count || 0, dmsNow, clicksNow, new Date().toISOString()];
                        db.prepare(`
                            INSERT INTO reel_stats_history (media_id, month_year, views_count, comments_count, dms_sent_count, clicks_count, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(media_id, month_year) DO UPDATE SET 
                                comments_count = excluded.comments_count,
                                views_count = excluded.views_count,
                                dms_sent_count = excluded.dms_sent_count,
                                clicks_count = excluded.clicks_count,
                                updated_at = excluded.updated_at
                        `).run(...statsArgs);
                        try {
                            const { asyncSync } = require('./turso');
                            asyncSync(`
                                INSERT INTO reel_stats_history (media_id, month_year, views_count, comments_count, dms_sent_count, clicks_count, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(media_id, month_year) DO UPDATE SET 
                                    comments_count = excluded.comments_count, views_count = excluded.views_count,
                                    dms_sent_count = excluded.dms_sent_count, clicks_count = excluded.clicks_count,
                                    updated_at = excluded.updated_at
                            `, statsArgs);
                        } catch (se) {}
                    } catch (e) {
                        console.warn('[MediaSync] Stats snapshot notice:', e.message);
                    }
                }

                // Fetch real comments on this reel via Meta Graph API
                const comments = await getMediaComments(token, igMediaId, 100);
                if (comments && comments.length > 0) {
                    totalCommentsFetched += comments.length;

                    for (const comment of comments) {
                        if (!comment.id) continue;

                        const alreadyHandled = db.prepare("SELECT id FROM events WHERE comment_id = ? AND dm_status = 'delivered'").get(comment.id);
                        if (alreadyHandled) continue;

                        const commentText = (comment.text || '').trim();
                        const fromUsername = (comment.from?.username || comment.username || 'instagram_user').toLowerCase().replace('@', '').trim();
                        const fromId = String(comment.from?.id || 'ig_user').trim();
                        const commentTime = comment.timestamp || new Date().toISOString();

                        // 🛑 Ignore comments made by the creator / bot itself
                        if ((myUsername && fromUsername === myUsername) || (myIgUserId && fromId === myIgUserId)) {
                            continue;
                        }

                        // Feed unhandled comments through the automation engine
                        const simulatedPayload = {
                            object: 'instagram',
                            entry: [{
                                id: myIgUserId || '28689630687300805',
                                time: Math.floor(new Date(commentTime).getTime() / 1000),
                                changes: [{
                                    field: 'comments',
                                    value: {
                                        from: { id: fromId, username: fromUsername },
                                        media: { id: igMediaId },
                                        id: comment.id,
                                        text: commentText,
                                        created_time: commentTime
                                    }
                                }]
                            }]
                        };

                        try {
                            await processCommentEvent(simulatedPayload);
                        } catch (pe) {
                            console.warn('[MediaSync] Comment automation notice:', pe.message);
                        }
                    }

                    // Update monthly stats history for this reel
                    if (mediaLocalId) {
                        try {
                            const currentMonth = new Date().toISOString().slice(0, 7);
                            const dmsCount = db.prepare("SELECT COUNT(*) as c FROM events WHERE media_ig_id = ? AND dm_status IN ('sent', 'delivered')").get(igMediaId)?.c || comments.length;
                            const clicksCount = db.prepare("SELECT COUNT(*) as c FROM clicks c JOIN events e ON c.event_id = e.id WHERE e.media_ig_id = ?").get(igMediaId)?.c || 0;
                            const itemViews = m.views_count || mediaRow?.views_count || 0;

                            db.prepare(`
                                INSERT INTO reel_stats_history (media_id, month_year, views_count, comments_count, dms_sent_count, clicks_count, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(media_id, month_year) DO UPDATE SET 
                                    comments_count = excluded.comments_count,
                                    views_count = excluded.views_count,
                                    dms_sent_count = excluded.dms_sent_count,
                                    clicks_count = excluded.clicks_count,
                                    updated_at = excluded.updated_at
                            `).run(
                                mediaLocalId,
                                currentMonth,
                                itemViews,
                                comments.length,
                                dmsCount,
                                clicksCount,
                                new Date().toISOString()
                            );
                        } catch(e) {}
                    }
                }
            }

            // Dual persistence: Save real events to data/events.json
            backupEvents(db);
            console.log(`[MediaSync] Real history sync complete. Total comments processed: ${totalCommentsFetched}`);
        } catch (commErr) {
            console.warn('[MediaSync] Notice during real comments sync:', commErr.message);
        }

        return { synced: allItems.length, pages: page + 1, commentsSynced: totalCommentsFetched };
    } catch (err) {
        console.error('[MediaSync] Failed to sync media:', err.response?.data || err.message);
        throw err;
    }
}

module.exports = {
    syncMedia
};
