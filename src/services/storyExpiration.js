const { getDb } = require('../database');
const { asyncSync } = require('./turso');

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Checks all story media and specific story rules.
 * If an Instagram story is older than 24 hours (or rule was created > 24 hours ago for a specific story):
 * - Marks the rule as `is_deleted = 1, is_active = 0`
 * - Marks the media as `status = 'expired'`
 * - Syncs changes to Turso cloud
 * This automatically removes expired story automations from the active list
 * and moves them cleanly into "Deleted Automations".
 */
function checkAndExpireOldStoryRules() {
    try {
        const db = getDb();
        const now = new Date().toISOString();
        const cutoffTime = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

        // 1. Expire specific story rules where the attached story media timestamp is > 24 hours old
        const expiredByMedia = db.prepare(`
            SELECT r.id as rule_id, r.media_id, m.id as media_id_val, m.timestamp, m.status 
            FROM rules r
            JOIN media m ON (r.media_id = m.id OR r.media_id = m.ig_media_id)
            WHERE (r.source_type = 'story' OR m.media_product_type = 'STORY' OR m.media_type = 'STORY')
              AND r.media_id IS NOT NULL 
              AND r.media_id != 'story' 
              AND r.media_id != 'story_mention'
              AND (r.is_deleted = 0 OR r.is_deleted IS NULL)
              AND m.timestamp IS NOT NULL
              AND m.timestamp < ?
        `).all(cutoffTime);

        for (const row of expiredByMedia) {
            console.log(`[StoryExpiration] ⏳ Expiring Rule #${row.rule_id} because attached Story #${row.media_id_val} passed 24h limit (created: ${row.timestamp})`);
            db.prepare("UPDATE rules SET is_deleted = 1, is_active = 0, updated_at = ? WHERE id = ?").run(now, row.rule_id);
            db.prepare("UPDATE media SET status = 'expired' WHERE id = ?").run(row.media_id_val);
            try {
                asyncSync("UPDATE rules SET is_deleted = 1, is_active = 0, updated_at = ? WHERE id = ?", [now, row.rule_id]);
                asyncSync("UPDATE media SET status = 'expired' WHERE id = ?", [row.media_id_val]);
            } catch (e) {}
        }

        // 2. Expire specific story rules created > 24 hours ago whose attached story has passed 24h
        const expiredByRuleAge = db.prepare(`
            SELECT r.id as rule_id, r.created_at, r.media_id
            FROM rules r
            WHERE r.source_type = 'story'
              AND r.media_id IS NOT NULL
              AND r.media_id != 'story'
              AND r.media_id != 'story_mention'
              AND (r.is_deleted = 0 OR r.is_deleted IS NULL)
              AND r.created_at IS NOT NULL
              AND r.created_at < ?
        `).all(cutoffTime);

        for (const row of expiredByRuleAge) {
            console.log(`[StoryExpiration] ⏳ Expiring specific story Rule #${row.rule_id} (>24h since creation: ${row.created_at})`);
            db.prepare("UPDATE rules SET is_deleted = 1, is_active = 0, updated_at = ? WHERE id = ?").run(now, row.rule_id);
            try {
                asyncSync("UPDATE rules SET is_deleted = 1, is_active = 0, updated_at = ? WHERE id = ?", [now, row.rule_id]);
            } catch (e) {}
        }

        // 3. Mark any stories in media table that are older than 24h as 'expired'
        db.prepare(`
            UPDATE media 
            SET status = 'expired' 
            WHERE (media_product_type = 'STORY' OR media_type = 'STORY')
              AND status != 'expired' 
              AND status != 'deleted'
              AND timestamp IS NOT NULL
              AND timestamp < ?
        `).run(cutoffTime);

        return { expiredCount: expiredByMedia.length + expiredByRuleAge.length };
    } catch (err) {
        console.warn('[StoryExpiration] Notice during check:', err.message);
        return { expiredCount: 0, error: err.message };
    }
}

module.exports = {
    checkAndExpireOldStoryRules,
    TWENTY_FOUR_HOURS_MS
};
