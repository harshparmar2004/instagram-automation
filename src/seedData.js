const { getDb, setConfig } = require('./database');
const { v4: uuidv4 } = require('uuid');

function seedDemoData() {
    console.log('[Seed] Populating realistic creator demo data with per-reel monthly analytics...');
    const db = getDb();

    // 1. Config
    setConfig('meta_app_id', '9876543210123');
    setConfig('meta_app_secret', 'demo_secret_key_8888');
    setConfig('webhook_verify_token', 'creator_verify_token_2026');
    setConfig('access_token', 'IGQWR_demo_long_lived_token_token_active');
    setConfig('token_expires_at', new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString());
    setConfig('ig_username', 'creator.studio');
    setConfig('webhook_subscribed', '1');

    // 2. Media Items (Reels & Posts)
    const mediaItems = [
        {
            ig_media_id: '179001122334455',
            media_type: 'REEL',
            caption: 'Free 2026 AI Growth Playbook PDF 📚 Comment PLAYBOOK to get the free link sent directly to your DMs!',
            thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
            media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
            permalink: 'https://instagram.com/p/demo_reel_1',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            views_count: 48500,
            comments_count: 1420
        },
        {
            ig_media_id: '179002233445566',
            media_type: 'REEL',
            caption: 'How I scaled to 100k followers in 6 months 🚀 Comment GUIDE for step-by-step blueprint!',
            thumbnail_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&auto=format&fit=crop&q=80',
            media_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
            permalink: 'https://instagram.com/p/demo_reel_2',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            views_count: 32100,
            comments_count: 980
        },
        {
            ig_media_id: '179003344556677',
            media_type: 'IMAGE',
            caption: 'Top 10 Coding & Design Tools Every Creator Needs 💻 Comment TOOLS for direct access links!',
            thumbnail_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=80',
            media_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
            permalink: 'https://instagram.com/p/demo_post_3',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            views_count: 18400,
            comments_count: 510
        },
        {
            ig_media_id: '179004455667788',
            media_type: 'REEL',
            caption: 'Exclusive Creator Masterclass Signup 🎓 Comment MASTERCLASS for private registration access!',
            thumbnail_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80',
            media_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
            permalink: 'https://instagram.com/p/demo_reel_4',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            views_count: 24900,
            comments_count: 670
        }
    ];

    const insertMedia = db.prepare(`
        INSERT INTO media (ig_media_id, media_type, caption, thumbnail_url, media_url, permalink, timestamp, synced_at, views_count, comments_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ig_media_id) DO UPDATE SET 
            caption=excluded.caption, 
            thumbnail_url=excluded.thumbnail_url,
            views_count=excluded.views_count,
            comments_count=excluded.comments_count
    `);

    const mediaIds = {};
    for (const m of mediaItems) {
        insertMedia.run(m.ig_media_id, m.media_type, m.caption, m.thumbnail_url, m.media_url, m.permalink, m.timestamp, new Date().toISOString(), m.views_count, m.comments_count);
        const row = db.prepare('SELECT id FROM media WHERE ig_media_id = ?').get(m.ig_media_id);
        mediaIds[m.ig_media_id] = row.id;
    }

    // Seed reel_stats_history (Monthly Saved History)
    db.prepare('DELETE FROM reel_stats_history').run();
    const insertHistory = db.prepare(`
        INSERT INTO reel_stats_history (media_id, month_year, views_count, comments_count, dms_sent_count, clicks_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Months: August 2026, July 2026, June 2026
    for (const mediaIgId of Object.keys(mediaIds)) {
        const mId = mediaIds[mediaIgId];
        insertHistory.run(mId, '2026-08', 48500, 1420, 1150, 680, new Date().toISOString());
        insertHistory.run(mId, '2026-07', 36200, 1080, 890, 510, new Date().toISOString());
        insertHistory.run(mId, '2026-06', 22100, 640, 520, 290, new Date().toISOString());
    }

    // 3. Rules
    db.prepare('DELETE FROM rules').run();
    
    const insertRule = db.prepare(`
        INSERT INTO rules (media_id, trigger_keyword, action_type, response_text, link_url, follow_prompt, public_reply, delay_seconds, variations_json, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const rule1 = insertRule.run(
        mediaIds['179001122334455'],
        'PLAYBOOK, PDF, AI',
        'link_dm',
        'Here is your 2026 AI Growth Playbook PDF!',
        'https://example.com/ai-playbook.pdf',
        null,
        'Check your DMs! 📩',
        10,
        JSON.stringify([
            'Thanks for commenting! Grab your AI Playbook here...',
            'Hey! Here is your free 2026 AI Growth Playbook...'
        ]),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
    );

    const rule2 = insertRule.run(
        mediaIds['179002233445566'],
        'GUIDE, SCALING',
        'follow_first',
        'Thanks for following! Here is the 100k Scaling Blueprint guide...',
        'https://example.com/scaling-blueprint.pdf',
        'Hey! Please follow @creator.studio and reply DONE here to unlock the guide 🙌',
        'Check your DMs for instructions! 📩',
        0,
        JSON.stringify([
            'Appreciate the comment! Follow us and reply DONE for your guide.'
        ]),
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
    );

    const rule3 = insertRule.run(
        mediaIds['179003344556677'],
        'TOOLS, WEBSITE',
        'link_dm',
        'Here is the complete list of 10 Creator Tools...',
        'https://example.com/top-tools',
        null,
        'Sent to your DMs! 📩',
        30,
        null,
        new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
    );

    const rule4 = insertRule.run(
        null, // Global Rule
        'INFO, HELP',
        'direct_dm',
        'Hey! Thanks for reaching out to Creator Studio. How can our team assist you today?',
        null,
        null,
        'Replied in DMs! 📩',
        0,
        null,
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
    );

    // 4. Events & Clicks (18 Realistic Activity Logs)
    db.prepare('DELETE FROM events').run();
    db.prepare('DELETE FROM clicks').run();

    const users = [
        'sarah_creator', 'dev_alex', 'tech_founder', 'marketing_pro', 'growth_hacker',
        'design_master', 'startup_john', 'julia_vlogs', 'chris_code', 'emily_digital',
        'marcus_ai', 'lisa_social', 'david_biz', 'hannah_mode', 'kevin_tech'
    ];

    const insertEvent = db.prepare(`
        INSERT INTO events (rule_id, comment_id, comment_text, commenter_ig_id, commenter_username, media_ig_id, dm_status, tracking_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertClick = db.prepare(`
        INSERT INTO clicks (event_id, tracking_id, clicked_at, user_agent)
        VALUES (?, ?, ?, ?)
    `);

    let commentCounter = 10001;

    for (let i = 0; i < 18; i++) {
        const user = users[i % users.length];
        const ruleId = i % 2 === 0 ? rule1.lastInsertRowid : (i % 3 === 0 ? rule2.lastInsertRowid : rule3.lastInsertRowid);
        const mediaIgId = i % 2 === 0 ? '179001122334455' : (i % 3 === 0 ? '179002233445566' : '179003344556677');
        const triggerWord = i % 2 === 0 ? 'PLAYBOOK' : (i % 3 === 0 ? 'GUIDE' : 'TOOLS');
        const commentText = `Can I please get the ${triggerWord}? Looks awesome! 🔥`;
        const commentId = `comment_${commentCounter++}`;
        const trackingId = uuidv4();
        const status = i === 17 ? 'pending' : (i === 12 ? 'failed' : (i % 4 === 0 ? 'delivered' : 'sent'));
        const createdAt = new Date(Date.now() - i * 3 * 3600 * 1000).toISOString();

        const evRes = insertEvent.run(
            ruleId, commentId, commentText, `user_id_${i}`, user, mediaIgId, status, trackingId, createdAt
        );

        if ((status === 'delivered' || status === 'sent') && i % 2 === 0) {
            insertClick.run(
                evRes.lastInsertRowid, trackingId, new Date(Date.now() - i * 2.5 * 3600 * 1000).toISOString(), 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)'
            );
        }
    }

    console.log('[Seed] Demo data successfully seeded into automation.db!');
}

module.exports = { seedDemoData };

if (require.main === module) {
    seedDemoData();
}
