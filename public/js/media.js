window.media = {
    async render(container) {
        container.innerHTML = `
            <div class="view" id="media-view">
                <div class="page-header">
                    <div class="page-title">
                        <h1>Media Gallery</h1>
                        <p>Select a reel or post to add automation rules.</p>
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="media.sync()">
                            <span>🔄 Sync Media</span>
                        </button>
                    </div>
                </div>
                <div id="media-content">
                    <div class="text-center" style="padding:3rem;"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        await this.loadMedia();
    },

    async refresh() {
        // background refresh
    },

    async loadMedia() {
        try {
            const data = await App.apiCall('GET', '/api/media');
            this.renderGrid(data);
        } catch (err) {
            document.getElementById('media-content').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Failed to load media</h3>
                    <p>${err.message}</p>
                    <button class="btn btn-primary" onclick="media.loadMedia()">Try Again</button>
                </div>
            `;
        }
    },

    async sync() {
        const btn = document.querySelector('.page-header .btn');
        btn.innerHTML = '<span class="spinner"></span> Syncing...';
        btn.disabled = true;
        try {
            await App.apiCall('POST', '/api/media/sync');
            App.showToast('Media synced successfully', 'success');
            await this.loadMedia();
        } catch (err) {
            App.showToast(err.message, 'error');
        } finally {
            btn.innerHTML = '<span>🔄 Sync Media</span>';
            btn.disabled = false;
        }
    },

    renderGrid(mediaItems) {
        const content = document.getElementById('media-content');
        
        if (!mediaItems || mediaItems.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📸</div>
                    <h3>No media found</h3>
                    <p>Connect your Instagram account and click Sync Media to fetch your posts.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="media-grid">';
        mediaItems.forEach(item => {
            const typeClass = item.media_type === 'VIDEO' || item.media_type === 'REEL' ? 'badge-purple' : 'badge-blue';
            const rulesCount = item.rulesCount || 0;
            const thumbUrl = item.thumbnail_url || item.media_url || '';
            const thumbStyle = thumbUrl ? `background-image: url('${thumbUrl}')` : '';

            html += `
                <div class="card media-card" onclick="media.openRules('${item.id}')">
                    <div class="media-thumb" style="${thumbStyle}">
                        <span class="media-type-badge ${typeClass}">${item.media_type}</span>
                    </div>
                    <div class="media-body">
                        <p class="media-caption">${item.caption || 'No caption'}</p>
                        <div class="media-meta">
                            <span>${new Date(item.timestamp).toLocaleDateString()}</span>
                            <span class="badge ${rulesCount > 0 ? 'badge-green' : 'badge-gray'}">${rulesCount} Rules</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        content.innerHTML = html;
    },

    openRules(mediaId) {
        // Store the selected media ID globally or in rules state and navigate
        window.selectedMediaId = mediaId;
        App.navigate('rules');
    }
};
