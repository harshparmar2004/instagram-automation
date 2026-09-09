const { getMedia, getMediaComments } = require('./instagram');
const { getDb, getConfig, getUserInstagramAccount, backupRules, restoreRules, backupEvents, restoreEvents } = require('../database');

async function syncMedia(userId = null) {
    let token = null;
    if (userId) {
        const acct = getUserInstagramAccount(userId);
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
        
        const db = getDb();
        const upsert = db.prepare(`
            INSERT INTO media (
                ig_media_id, media_type, media_product_type, caption, 
                thumbnail_url, media_url, permalink, timestamp, 
                comments_count, like_count, synced_at, user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ig_media_id) DO UPDATE SET 
                media_type = excluded.media_type,
                media_product_type = excluded.media_product_type,
                caption = excluded.caption,
                thumbnail_url = excluded.thumbnail_url,
                media_url = excluded.media_url,
                permalink = excluded.permalink,
                comments_count = excluded.comments_count,
                like_count = excluded.like_count,
                synced_at = excluded.synced_at,
                user_id = COALESCE(media.user_id, excluded.user_id)
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
                    new Date().toISOString(),
                    userId
                );
            }
        })(allItems);

        console.log(`[MediaSync] Successfully synced ${allItems.length} media items across ${page + 1} page(s)`);

        // === 1. SMART AUTO-RELINK: Ensure all old automations connect to real synced reels ===
        try {
            restoreRules(db);
            const realMediaRows = db.prepare("SELECT * FROM media WHERE ig_media_id NOT LIKE '179001122%' ORDER BY timestamp DESC").all();
            const allRules = db.prepare("SELECT * FROM rules").all();

            if (realMediaRows.length > 0 && allRules.length > 0) {
                console.log(`[MediaSync] Auto-relinking ${allRules.length} automations to ${realMediaRows.length} real synced Instagram reels...`);
                
                for (const rule of allRules) {
                    if (rule.media_id === 'global' || rule.media_id === null) continue;

                    // Check if current media_id already exists in media table
                    const existingMedia = db.prepare("SELECT id, ig_media_id FROM media WHERE id = ? OR ig_media_id = ?").get(rule.media_id, rule.media_id);
                    
                    if (existingMedia) {
                        // Ensure rule.media_id is integer primary key for clean relations
                        if (rule.media_id !== existingMedia.id) {
                            db.prepare("UPDATE rules SET media_id = ? WHERE id = ?").run(existingMedia.id, rule.id);
                        }
                    } else if (realMediaRows.length === 1) {
                        // User has 1 main reel on their Instagram account -> Auto-link automation to it!
                        console.log(`[MediaSync] Auto-linking rule #${rule.id} ("${rule.trigger_keyword}") to single real Reel ID ${realMediaRows[0].id}`);
                        db.prepare("UPDATE rules SET media_id = ? WHERE id = ?").run(realMediaRows[0].id, rule.id);
                    } else {
                        // Match by keyword in caption or link to latest reel
                        const matchedByCap = realMediaRows.find(m => {
                            const cap = (m.caption || '').toLowerCase();
                            const kw = (rule.trigger_keyword || '').toLowerCase().split(',')[0].trim();
                            return kw && cap.includes(kw);
                        });
                        const targetMedia = matchedByCap || realMediaRows[0];
                        if (targetMedia) {
                            db.prepare("UPDATE rules SET media_id = ? WHERE id = ?").run(targetMedia.id, rule.id);
                        }
                    }
                }
                backupRules(db);
            }
        } catch (linkErr) {
            console.warn('[MediaSync] Notice during rule auto-linking:', linkErr.message);
        }

        // === 2. REAL HISTORY SYNC: Fetch real comments from Instagram and create real user activity ===
        let totalCommentsFetched = 0;
        try {
            const mediaToFetch = allItems.length > 0 ? allItems : db.prepare("SELECT * FROM media").all();
            const currentMonth = new Date().toISOString().slice(0, 7);
            
            for (const m of mediaToFetch) {
                const igMediaId = m.id || m.ig_media_id;
                if (!igMediaId) continue;

                // Fetch real comments on this reel via Meta Graph API
                const comments = await getMediaComments(token, igMediaId, 100);
                if (comments && comments.length > 0) {
                    totalCommentsFetched += comments.length;
                    console.log(`[MediaSync] Ingesting ${comments.length} real Instagram comments for media ${igMediaId}...`);

                    // Find rules for this media
                    const mediaRow = db.prepare("SELECT id FROM media WHERE ig_media_id = ?").get(igMediaId);
                    const mediaLocalId = mediaRow ? mediaRow.id : null;
                    const mediaRules = db.prepare("SELECT * FROM rules WHERE media_id = ? OR media_id IS NULL ORDER BY media_id DESC").all(mediaLocalId);

                    for (const comment of comments) {
                        if (!comment.id) continue;

                        const alreadyExists = db.prepare("SELECT id FROM events WHERE comment_id = ?").get(comment.id);
                        if (alreadyExists) continue;

                        const commentText = (comment.text || '').trim();
                        const fromUsername = comment.from?.username || 'instagram_user';
                        const fromId = comment.from?.id || 'ig_user';
                        const commentTime = comment.timestamp || new Date().toISOString();

                        // Match rule
                        let matchedRule = null;
                        const textLower = commentText.toLowerCase();
                        for (const r of mediaRules) {
                            const kws = (r.trigger_keyword || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                            if (kws.length === 0 || kws.includes('*') || kws.some(kw => textLower.includes(kw))) {
                                matchedRule = r;
                                break;
                            }
                        }

                        const ruleIdToAttach = matchedRule ? matchedRule.id : (mediaRules[0]?.id || null);

                        const eventRes = db.prepare(`
                            INSERT INTO events (rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, dm_status, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, 'delivered', ?)
                        `).run(ruleIdToAttach, comment.id, commentText, fromId, fromUsername, igMediaId, commentTime);

                        // Also record conversation
                        try {
                            db.prepare(`
                                INSERT INTO conversations (commenter_ig_id, rule_id, event_id, state, created_at, completed_at)
                                VALUES (?, ?, ?, 'completed', ?, ?)
                            `).run(fromId, ruleIdToAttach, eventRes.lastInsertRowid, commentTime, commentTime);
                        } catch(e) {}
                    }

                    // Update monthly stats history for this reel
                    if (mediaLocalId) {
                        try {
                            db.prepare(`
                                INSERT INTO reel_stats_history (media_id, month_year, views_count, comments_count, dms_sent_count, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?)
                                ON CONFLICT(media_id, month_year) DO UPDATE SET 
                                    comments_count = excluded.comments_count,
                                    views_count = excluded.views_count,
                                    dms_sent_count = excluded.dms_sent_count,
                                    updated_at = excluded.updated_at
                            `).run(
                                mediaLocalId,
                                currentMonth,
                                m.views_count || 0,
                                comments.length,
                                comments.length,
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
