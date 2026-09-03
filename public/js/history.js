window.monthlyHistory = {
    selectedMonth: new Date().toISOString().slice(0, 7),
    reelsData: [],
    statsData: {},

    async render(container) {
        const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        container.innerHTML = `
            <div class="view" id="history-view" style="width: 100%; max-width: 1480px; margin: 0 auto;">
                <!-- PAGE HEADER -->
                <div class="page-header" style="margin-bottom: 1.25rem;">
                    <div class="page-title">
                        <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.85rem; letter-spacing: -0.03em;">Monthly History Archive</h1>
                        <p style="font-size: 0.92rem; color: var(--text-secondary);">Historical performance ledger of monthly Reel views, comments, automated DMs, and link conversions.</p>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <span style="font-size:0.85rem; font-weight:600; color:var(--text-secondary);">Period:</span>
                        <select id="history-month-select" class="select" style="min-width:170px; font-weight:600; padding:0.55rem 0.95rem; font-size:0.88rem; border-radius:10px;" onchange="window.monthlyHistory.onMonthChange(this.value)">
                            <option value="${this.selectedMonth}" selected>${currentMonthName} (Live)</option>
                        </select>
                        <button class="btn btn-secondary btn-sm" style="font-weight:700; padding:0.55rem 1.15rem; font-size:0.88rem; border-radius:10px;" onclick="window.monthlyHistory.exportCsv()">Export CSV</button>
                    </div>
                </div>
                <div id="history-content" style="width: 100%;">
                    <div class="text-center" style="padding:3rem;"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        await this.loadRealData();
    },

    async refresh() {
        if (document.getElementById('history-content')) {
            await this.loadRealData();
        }
    },

    async loadRealData() {
        try {
            const [mediaRes, statsRes] = await Promise.all([
                App.apiCall('GET', '/api/media').catch(() => ({ media: [] })),
                App.apiCall('GET', '/api/events/stats').catch(() => ({}))
            ]);
            this.reelsData = mediaRes.media || [];
            this.statsData = statsRes || {};
            this.renderHistoryData();
        } catch (err) {
            document.getElementById('history-content').innerHTML = `
                <div class="empty-state">
                    <h3>Error loading history</h3>
                    <p>${err.message}</p>
                </div>
            `;
        }
    },

    onMonthChange(month) {
        this.selectedMonth = month;
        this.renderHistoryData();
    },

    exportCsv() {
        let csv = 'Reel Title,Type,Views,Comments,DMs Dispatched,Link Clicks,CTR %\n';
        this.reelsData.forEach(r => {
            const views = r.views_count || 0;
            const comments = r.comments_count || 0;
            const dms = r.dms_sent || 0;
            const clicks = r.clicks || 0;
            const ctr = dms > 0 ? Math.min(100, Math.round((clicks / dms) * 100)) : 0;
            csv += `"${(r.caption || 'Reel').replace(/"/g, '""')}",${r.media_product_type || r.media_type || 'REEL'},${views},${comments},${dms},${clicks},${ctr}%\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Monthly_History_${this.selectedMonth}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    renderHistoryData() {
        const content = document.getElementById('history-content');
        if (!content) return;

        const reels = this.reelsData || [];
        const totalViews = reels.reduce((acc, r) => acc + (r.views_count || 0), 0);
        const totalComments = reels.reduce((acc, r) => acc + (r.comments_count || 0), 0);
        const totalDms = this.statsData.dms_sent || 0;
        const totalClicks = this.statsData.clicks || 0;
        const overallCtr = totalDms > 0 ? Math.min(100, Math.round((totalClicks / totalDms) * 100)) : 0;

        let html = '';

        // 1. FOUR TOP STAT CARDS
        html += `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; width: 100%;">
                
                <div class="card" style="padding: 1.15rem 1.45rem; border-radius: 14px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 1px 4px rgba(0,0,0,0.02);">
                    <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">MONTHLY REEL VIEWS</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.7rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">
                        ${totalViews.toLocaleString()}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">Live Instagram views</div>
                </div>

                <div class="card" style="padding: 1.15rem 1.45rem; border-radius: 14px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 1px 4px rgba(0,0,0,0.02);">
                    <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">MONTHLY COMMENTS</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.7rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">
                        ${totalComments.toLocaleString()}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">Follower engagement</div>
                </div>

                <div class="card" style="padding: 1.15rem 1.45rem; border-radius: 14px; background: #FAF8F5; border: 1.5px solid var(--accent-primary); box-shadow: 0 2px 10px rgba(217,119,87,0.08);">
                    <div style="font-size: 0.72rem; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.04em;">AUTOMATED DMS DISPATCHED</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.7rem; font-weight: 800; color: var(--accent-primary); margin-top: 0.25rem;">
                        ${totalDms.toLocaleString()}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">Live dispatched to commenters</div>
                </div>

                <div class="card" style="padding: 1.15rem 1.45rem; border-radius: 14px; background: #F0F9FF; border: 1.5px solid #0369A1; box-shadow: 0 2px 10px rgba(3,105,161,0.08);">
                    <div style="font-size: 0.72rem; font-weight: 800; color: #0369A1; text-transform: uppercase; letter-spacing: 0.04em;">RESOURCE LINK CLICKS</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.7rem; font-weight: 800; color: #0369A1; margin-top: 0.25rem;">
                        ${totalClicks.toLocaleString()}
                    </div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: #2E7D32; margin-top: 0.15rem;">🎯 ${overallCtr}% Conversion CTR</div>
                </div>

            </div>
        `;

        // 2. BREAKDOWN TABLE
        html += `
            <div class="card" style="padding: 1.6rem; border-radius: 18px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0,0,0,0.03); width: 100%;">
                <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.2rem; color: var(--text-primary); margin: 0 0 1.25rem 0;">
                    Performance Breakdown for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
        `;

        if (reels.length === 0) {
            html += `
                <div style="padding: 3.5rem 1.5rem; text-align: center; background: #FAF8F5; border-radius: 14px; border: 1px dashed var(--border-color);">
                    <div style="font-size: 2.2rem; margin-bottom: 0.65rem;">🎬</div>
                    <h4 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.15rem; color: var(--text-primary); margin: 0 0 0.35rem 0;">No Reels Synced Yet</h4>
                    <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 440px; margin: 0 auto 1.15rem auto;">
                        Connect your Instagram account or click "Sync Latest Reels" in Media Gallery to load your live content.
                    </p>
                    <button class="btn btn-primary btn-sm" onclick="App.navigate('media')" style="font-weight: 700; padding: 0.55rem 1.2rem; border-radius: 8px;">Go to Media Gallery</button>
                </div>
            `;
        } else {
            html += `
                <div style="overflow-x: auto; width: 100%;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 1.5px solid var(--border-color); background: #FAF8F5; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 800;">
                                <th style="padding: 0.85rem 1rem;">REEL CONTENT</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">VIEWS</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">COMMENTS</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">DMS DISPATCHED</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">LINK CLICKS</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">CONVERSION RATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reels.map(r => {
                                const views = r.views_count || 0;
                                const comments = r.comments_count || 0;
                                const dms = r.dms_sent || 0;
                                const clicks = r.clicks || 0;
                                const ctr = dms > 0 ? Math.min(100, Math.round((clicks / dms) * 100)) : 0;
                                const thumbUrl = r.thumbnail_url || r.media_url || '';
                                return `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 0.95rem 1rem;">
                                            <div style="display: flex; gap: 0.85rem; align-items: center;">
                                                ${thumbUrl ? `
                                                    <div style="width: 44px; height: 44px; border-radius: 10px; background-size: cover; background-position: center; background-image: url('${thumbUrl}'); flex-shrink:0; border: 1px solid var(--border-color);"></div>
                                                ` : `
                                                    <div style="width: 44px; height: 44px; border-radius: 10px; background: var(--accent-soft); color: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink:0;">🎬</div>
                                                `}
                                                <div>
                                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.88rem; color: var(--text-primary); line-height: 1.3;">
                                                        ${(r.caption || 'Instagram Post').slice(0, 50)}...
                                                    </div>
                                                    <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); margin-top: 0.15rem;">
                                                        Type: ${r.media_product_type || r.media_type || 'REELS'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">
                                            ${views.toLocaleString()}
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">
                                            ${comments.toLocaleString()}
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 800; font-size: 0.88rem; color: var(--accent-primary);">
                                            ${dms.toLocaleString()} DMs
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 800; font-size: 0.88rem; color: #0369A1;">
                                            ${clicks.toLocaleString()} Clicks
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 800; font-size: 0.88rem; color: #2E7D32;">
                                            ${ctr}% CTR
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        html += `</div>`;
        content.innerHTML = html;
    }
};
