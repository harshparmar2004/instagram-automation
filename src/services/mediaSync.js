const crypto = require('crypto');
const { getMedia, getMediaComments, getMediaInsights } = require('./instagram');
const { getDb, getConfig, getUserInstagramAccount, backupRules, restoreRules, backupEvents, restoreEvents } = require('../database');

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
                    item.views_count || 0,
                    new Date().toISOString(),
                    userId
                );
            }
        })(allItems);

        // Mark any media in database not returned by live Instagram sync as deleted
        if (allItems.length > 0) {
            const activeIgIds = allItems.map(item => String(item.id));
            const placeholders = activeIgIds.map(() => '?').join(',');
            let markDeletedQuery = `UPDATE media SET status = 'deleted' WHERE ig_media_id NOT IN (${placeholders}) AND ig_media_id NOT LIKE '179001122%'`;
            const markParams = [...activeIgIds];
            if (userId) {
                markDeletedQuery += ' AND (user_id = ? OR user_id IS NULL)';
                markParams.push(userId);
            }
            try {
                db.prepare(markDeletedQuery).run(...markParams);
            } catch (delErr) {
                console.warn('[MediaSync] Notice updating deleted media status:', delErr.message);
            }
        }

        console.log(`[MediaSync] Successfully synced ${allItems.length} media items across ${page + 1} page(s)`);

        // === 1. SMART AUTO-RELINK: Resolve reel IDs cleanly without forcing unrelated rules ===
        try {
            const realMediaRows = db.prepare("SELECT * FROM media WHERE ig_media_id NOT LIKE '179001122%' ORDER BY timestamp DESC").all();
            const allRules = db.prepare("SELECT * FROM rules").all();

            if (realMediaRows.length > 0 && allRules.length > 0) {
                for (const rule of allRules) {
                    if (rule.media_id === 'global' || rule.media_id === null) continue;

                    // Check if current media_id exists in media table
                    const existingMedia = db.prepare("SELECT id, ig_media_id FROM media WHERE id = ? OR ig_media_id = ?").get(rule.media_id, rule.media_id);
                    
                    if (existingMedia) {
                        // Ensure rule.media_id is integer primary key for clean relations
                        if (rule.media_id !== existingMedia.id) {
                            db.prepare("UPDATE rules SET media_id = ? WHERE id = ?").run(existingMedia.id, rule.id);
                        }
                    }
                }
            }
        } catch (linkErr) {
            console.warn('[MediaSync] Notice during rule auto-linking:', linkErr.message);
        }

        // === 2. REAL HISTORY SYNC: Fetch real comments from Instagram and create real user activity ===
        let totalCommentsFetched = 0;
        try {
            const mediaToFetch = allItems.length > 0 ? allItems : db.prepare("SELECT * FROM media").all();
            const myUsername = (acct?.ig_username || getConfig('ig_username') || '').toLowerCase().replace('@', '').trim();
            const myIgUserId = String(acct?.ig_user_id || getConfig('ig_user_id') || '').trim();
            
            for (const m of mediaToFetch) {
                const igMediaId = m.id || m.ig_media_id;
                if (!igMediaId) continue;

                // Fetch real comments on this reel via Meta Graph API
                const comments = await getMediaComments(token, igMediaId, 100);
                if (comments && comments.length > 0) {
                    totalCommentsFetched += comments.length;
                    console.log(`[MediaSync] Ingesting ${comments.length} real Instagram comments for media ${igMediaId}...`);

                    // Find rules for this media or global/keyword-matched rules
                    const mediaRow = db.prepare("SELECT id, caption, views_count FROM media WHERE ig_media_id = ?").get(igMediaId);
                    const mediaLocalId = mediaRow ? mediaRow.id : null;
                    const allRules = db.prepare("SELECT * FROM rules WHERE is_active = 1").all();

                    for (const comment of comments) {
                        if (!comment.id) continue;

                        const alreadyExists = db.prepare("SELECT id FROM events WHERE comment_id = ?").get(comment.id);
                        if (alreadyExists) continue;

                        const commentText = (comment.text || '').trim();
                        const fromUsername = (comment.from?.username || 'instagram_user').toLowerCase().replace('@', '').trim();
                        const fromId = String(comment.from?.id || 'ig_user').trim();
                        const commentTime = comment.timestamp || new Date().toISOString();

                        // 🛑 Ignore comments made by the creator / bot itself
                        if ((myUsername && fromUsername === myUsername) || (myIgUserId && fromId === myIgUserId)) {
                            continue;
                        }

                        // Match rule strictly by trigger keywords
                        let matchedRule = null;
                        const textLower = commentText.toLowerCase();

                        // 1. Check rules assigned to this media
                        for (const r of allRules) {
                            if (r.media_id === mediaLocalId || String(r.media_id) === String(igMediaId)) {
                                const kws = (r.trigger_keyword || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                                if (kws.includes('*') || kws.some(kw => textLower.includes(kw))) {
                                    matchedRule = r;
                                    break;
                                }
                            }
                        }

                        // 2. Check global rules or keyword match across active rules
                        if (!matchedRule) {
                            for (const r of allRules) {
                                const kws = (r.trigger_keyword || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                                if (kws.includes('*') || kws.some(kw => textLower.includes(kw))) {
                                    matchedRule = r;
                                    // Auto-link rule to this active media if rule was pointing to an older/deleted post
                                    if (mediaLocalId && r.media_id !== mediaLocalId) {
                                        try {
                                            db.prepare("UPDATE rules SET media_id = ? WHERE id = ?").run(mediaLocalId, r.id);
                                        } catch(e) {}
                                    }
                                    break;
                                }
                            }
                        }

                        // Only ingest if a rule actually matched
                        if (!matchedRule) continue;

                        const ruleIdToAttach = matchedRule.id;
                        const trackingId = crypto.randomUUID();

                        const eventRes = db.prepare(`
                            INSERT INTO events (rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, tracking_id, dm_status, created_at, user_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, 'delivered', ?, ?)
                        `).run(ruleIdToAttach, comment.id, commentText, fromId, fromUsername, igMediaId, trackingId, commentTime, userId);

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
