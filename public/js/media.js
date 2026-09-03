window.media = {
    currentFilter: 'reels',
    mediaItems: [],

    async render(container) {
        container.innerHTML = `
            <div class="view" id="media-view" style="width: 100%; max-width: 1480px; margin: 0 auto;">
                <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div class="page-title">
                        <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.65rem; letter-spacing: -0.02em; color: var(--text-primary); margin: 0;">Instagram Media Gallery</h1>
                        <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">View your synced Instagram Reels and Posts, or tap any item to attach comment automation rules.</p>
                    </div>
                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                        <button class="btn btn-secondary" id="btn-sync-media" onclick="media.sync()" style="font-weight: 700; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem; background: #FFFFFF;">
                            <span>🔄 Sync Latest Reels</span>
                        </button>
                    </div>
                </div>

                <!-- FILTER TABS (REELS vs FEED vs ALL) -->
                <div style="display: flex; gap: 0.65rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem; align-items: center;">
                    <button type="button" id="tab-media-reels" class="btn btn-sm" onclick="media.setFilter('reels')" style="font-weight: 800; font-size: 0.82rem; border-radius: 10px; padding: 0.5rem 1rem; background: var(--accent-primary); color: #FFF;">
                        🎬 Reels (<span id="count-reels">0</span>)
                    </button>
                    <button type="button" id="tab-media-all" class="btn btn-sm" onclick="media.setFilter('all')" style="font-weight: 700; font-size: 0.82rem; border-radius: 10px; padding: 0.5rem 1rem; background: #FFFFFF; color: var(--text-secondary); border: 1px solid var(--border-color);">
                        📁 All Content (<span id="count-all">0</span>)
                    </button>
                    <button type="button" id="tab-media-feed" class="btn btn-sm" onclick="media.setFilter('feed')" style="font-weight: 700; font-size: 0.82rem; border-radius: 10px; padding: 0.5rem 1rem; background: #FFFFFF; color: var(--text-secondary); border: 1px solid var(--border-color);">
                        📸 Feed Posts (<span id="count-feed">0</span>)
                    </button>
                </div>

                <div id="media-content">
                    <div class="text-center" style="padding: 3rem;"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        await this.loadMedia();
    },

    async refresh() {
        await this.loadMedia();
    },

    setFilter(filter) {
        this.currentFilter = filter;
        
        const tabs = ['reels', 'all', 'feed'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-media-${t}`);
            if (btn) {
                if (t === filter) {
                    btn.style.background = 'var(--accent-primary)';
                    btn.style.color = '#FFFFFF';
                    btn.style.fontWeight = '800';
                    btn.style.border = 'none';
                } else {
                    btn.style.background = '#FFFFFF';
                    btn.style.color = 'var(--text-secondary)';
                    btn.style.fontWeight = '700';
                    btn.style.border = '1px solid var(--border-color)';
                }
            }
        });

        this.renderGrid();
    },

    async loadMedia() {
        try {
            this.mediaItems = await App.apiCall('GET', '/api/media') || [];
            
            // Calculate counts
            const reelsCount = this.mediaItems.filter(m => 
                m.media_product_type === 'REELS' || m.media_type === 'REEL' || (m.media_type === 'VIDEO' && m.media_product_type !== 'FEED')
            ).length;
            const feedCount = this.mediaItems.length - reelsCount;

            const countReelsEl = document.getElementById('count-reels');
            const countAllEl = document.getElementById('count-all');
            const countFeedEl = document.getElementById('count-feed');
            if (countReelsEl) countReelsEl.textContent = reelsCount;
            if (countAllEl) countAllEl.textContent = this.mediaItems.length;
            if (countFeedEl) countFeedEl.textContent = feedCount;

            this.renderGrid();
        } catch (err) {
            const content = document.getElementById('media-content');
            if (content) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <h3>Failed to load media</h3>
                        <p>${err.message}</p>
                        <button class="btn btn-primary" onclick="media.loadMedia()">Try Again</button>
                    </div>
                `;
            }
        }
    },

    async sync() {
        const btn = document.getElementById('btn-sync-media');
        if (btn) {
            btn.innerHTML = '<span class="spinner"></span> Syncing from Instagram...';
            btn.disabled = true;
        }
        try {
            const res = await App.apiCall('POST', '/api/media/sync');
            const count = res.count !== undefined ? res.count : 'latest';
            App.showToast(`✅ Successfully synced ${count} items from Instagram!`, 'success');
            await this.loadMedia();
        } catch (err) {
            App.showToast(err.message, 'error');
        } finally {
            if (btn) {
                btn.innerHTML = '<span>🔄 Sync Latest Reels</span>';
                btn.disabled = false;
            }
        }
    },

    renderGrid() {
        const content = document.getElementById('media-content');
        if (!content) return;

        let filtered = this.mediaItems || [];
        if (this.currentFilter === 'reels') {
            filtered = filtered.filter(m => 
                m.media_product_type === 'REELS' || m.media_type === 'REEL' || (m.media_type === 'VIDEO' && m.media_product_type !== 'FEED')
            );
        } else if (this.currentFilter === 'feed') {
            filtered = filtered.filter(m => 
                m.media_product_type !== 'REELS' && m.media_type !== 'REEL'
            );
        }

        if (filtered.length === 0) {
            content.innerHTML = `
                <div class="empty-state" style="padding: 4rem 1.5rem; background: #FFFFFF; border-radius: 18px; border: 1px solid var(--border-color); text-align: center;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.65rem;">📸</div>
                    <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.25rem; color: var(--text-primary);">No ${this.currentFilter === 'reels' ? 'Reels' : 'Media'} Found</h3>
                    <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 440px; margin: 0.35rem auto 1.25rem auto;">
                        Click "Sync Latest Reels" above to fetch your uploaded content directly from your connected Instagram account.
                    </p>
                    <button class="btn btn-primary" onclick="media.sync()" style="font-weight: 800; padding: 0.65rem 1.25rem;">
                        🔄 Fetch from Instagram Now
                    </button>
                </div>
            `;
            return;
        }

        // Dedicated 9:16 vertical Instagram style grid for reels, responsive cards for all
        const isReelView = this.currentFilter === 'reels';
        
        let html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(${isReelView ? '210px' : '240px'}, 1fr)); gap: 1.25rem; width: 100%;">`;
        
        filtered.forEach(item => {
            const isReel = item.media_product_type === 'REELS' || item.media_type === 'REEL' || (item.media_type === 'VIDEO' && item.media_product_type !== 'FEED');
            const rulesCount = item.rulesCount || 0;
            const thumbUrl = item.thumbnail_url || item.media_url || '';
            const commentsCount = item.comments_count || 0;

            html += `
                <div class="card media-card" onclick="media.openRules('${item.id}')" style="
                    background: #FFFFFF;
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.03);
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 10px rgba(0,0,0,0.03)';">
                    
                    <!-- 9:16 VERTICAL COVER FOR REELS -->
                    <div style="
                        position: relative;
                        width: 100%;
                        padding-top: ${isReel ? '150%' : '100%'};
                        background-color: #171514;
                        background-image: url('${thumbUrl}');
                        background-size: cover;
                        background-position: center;
                    ">
                        <!-- TOP BADGES -->
                        <div style="position: absolute; top: 10px; left: 10px; display: flex; gap: 6px;">
                            ${isReel 
                                ? `<span style="background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); color: #FFF; font-size: 0.7rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; display: flex; align-items: center; gap: 4px;">▶ REEL</span>`
                                : `<span style="background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); color: #FFF; font-size: 0.7rem; font-weight: 800; padding: 3px 8px; border-radius: 6px;">📸 POST</span>`
                            }
                        </div>

                        <!-- RULES ACTIVE BADGE -->
                        <div style="position: absolute; top: 10px; right: 10px;">
                            <span style="background: ${rulesCount > 0 ? '#2E7D32' : 'rgba(44,42,41,0.75)'}; color: #FFF; font-size: 0.68rem; font-weight: 800; padding: 3px 8px; border-radius: 6px;">
                                ${rulesCount > 0 ? `⚡ ${rulesCount} Active` : 'No Rules'}
                            </span>
                        </div>

                        <!-- BOTTOM OVERLAY COMMENTS COUNT -->
                        <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1.5rem 0.75rem 0.65rem 0.75rem; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%); display: flex; justify-content: space-between; align-items: flex-end; color: #FFF; font-size: 0.75rem; font-weight: 700;">
                            <span>💬 ${commentsCount} comments</span>
                            <span>${new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>

                    <!-- CAPTION & ACTION FOOTER -->
                    <div style="padding: 0.85rem; display: flex; flex-direction: column; justify-content: space-between; flex: 1;">
                        <p style="font-size: 0.82rem; color: var(--text-primary); font-weight: 600; line-height: 1.4; margin: 0 0 0.65rem 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${item.caption || 'No caption'}
                        </p>
                        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #F5F1EA; padding-top: 0.65rem; margin-top: auto;">
                            <span style="font-size: 0.75rem; font-weight: 800; color: var(--accent-primary);">Manage Rules →</span>
                            ${item.permalink ? `<a href="${item.permalink}" target="_blank" onclick="event.stopPropagation()" style="font-size: 0.72rem; color: var(--text-muted); text-decoration: none;" title="Open on Instagram">↗ IG</a>` : ''}
                        </div>
                    </div>

                </div>
            `;
        });
        html += '</div>';
        content.innerHTML = html;
    },

    openRules(mediaId) {
        window.selectedMediaId = mediaId;
        App.navigate('rules');
    }
};
