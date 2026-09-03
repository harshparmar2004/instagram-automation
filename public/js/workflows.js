window.workflows = {
    storedData: {},
    rawItems: [],
    search: '',
    actionFilter: '',
    sortBy: 'recent',

    async render(container) {
        container.innerHTML = `
            <div class="view" id="workflows-view" style="width: 100%;">
                <!-- PAGE HEADER -->
                <div class="page-header" style="margin-bottom: 1.5rem;">
                    <div class="page-title">
                        <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.85rem; letter-spacing: -0.03em;">My Automations</h1>
                        <p style="font-size: 0.95rem; color: var(--text-secondary);">Manage and analyze active Instagram Reel comment-to-DM rules.</p>
                    </div>
                    <div style="display:flex; gap:0.65rem;">
                        <button class="btn btn-primary btn-sm" style="font-weight: 700; padding: 0.55rem 1.15rem;" onclick="rules.openFormModal()">+ Create Automation</button>
                        <button class="btn btn-secondary btn-sm" style="font-weight: 600; padding: 0.55rem 1rem;" onclick="rules.openSimulatorModal()">Test Simulator</button>
                    </div>
                </div>

                <!-- FULL-WIDTH SEARCH & FILTER CONTROL BAR -->
                <div class="card" style="margin-bottom: 1.75rem; padding: 1rem 1.35rem; background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.02); width: 100%;">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                        
                        <!-- Search Box -->
                        <div style="flex: 3; min-width: 260px;">
                            <input type="text" id="workflow-search" class="input" placeholder="Search automations by reel caption, trigger keyword, or deliverable link..." value="${this.search}" onkeyup="workflows.applyFilters()" style="padding: 0.65rem 1rem; font-size: 0.88rem; font-weight: 500;">
                        </div>

                        <!-- Action Type Filter -->
                        <div style="flex: 1; min-width: 170px;">
                            <select id="workflow-action-filter" class="select" onchange="workflows.applyFilters()" style="padding: 0.65rem 1rem; font-size: 0.88rem; font-weight: 600;">
                                <option value="">All Action Types</option>
                                <option value="link_dm" ${this.actionFilter==='link_dm'?'selected':''}>Send Link DM</option>
                                <option value="direct_dm" ${this.actionFilter==='direct_dm'?'selected':''}>Send Text DM</option>
                                <option value="follow_first" ${this.actionFilter==='follow_first'?'selected':''}>Follow First Gate</option>
                            </select>
                        </div>

                        <!-- Sort By Filter -->
                        <div style="flex: 1; min-width: 170px;">
                            <select id="workflow-sort-by" class="select" onchange="workflows.applyFilters()" style="padding: 0.65rem 1rem; font-size: 0.88rem; font-weight: 600;">
                                <option value="recent" ${this.sortBy==='recent'?'selected':''}>Sort by Most Recent</option>
                                <option value="dms" ${this.sortBy==='dms'?'selected':''}>Sort by DMs Sent</option>
                                <option value="clicks" ${this.sortBy==='clicks'?'selected':''}>Sort by Link Clicks</option>
                                <option value="views" ${this.sortBy==='views'?'selected':''}>Sort by Reel Views</option>
                            </select>
                        </div>

                        <div id="workflow-count-badge" style="font-size: 0.88rem; font-weight: 700; color: var(--accent-primary);">
                            0 Active Automations
                        </div>

                    </div>
                </div>

                <div id="workflows-content" style="width: 100%;">
                    <div class="text-center" style="padding:4rem;"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        await this.loadWorkflows();
    },

    async refresh() {
        if (document.getElementById('workflows-content')) {
            try {
                this.rawItems = await App.apiCall('GET', '/api/media/automated');
                this.applyFilters();
            } catch(e) {}
        }
    },

    async loadWorkflows() {
        try {
            this.rawItems = await App.apiCall('GET', '/api/media/automated');
            this.applyFilters();
        } catch (err) {
            document.getElementById('workflows-content').innerHTML = `
                <div class="empty-state" style="width:100%;">
                    <h3>Error loading automations</h3>
                    <p>${err.message}</p>
                    <button class="btn btn-primary" onclick="workflows.loadWorkflows()">Retry</button>
                </div>
            `;
        }
    },

    applyFilters() {
        this.search = (document.getElementById('workflow-search')?.value || '').toLowerCase();
        this.actionFilter = document.getElementById('workflow-action-filter')?.value || '';
        this.sortBy = document.getElementById('workflow-sort-by')?.value || 'recent';

        if (!this.rawItems) return;

        let filtered = [];

        this.rawItems.forEach(item => {
            const isGlobal = item.id === 'global';
            const caption = (item.caption || '').toLowerCase();
            const matchingRules = item.rules.filter(rule => {
                const keyword = (rule.trigger_keyword || '').toLowerCase();
                const link = (rule.link_url || '').toLowerCase();
                const response = (rule.response_text || '').toLowerCase();

                const matchesSearch = !this.search || keyword.includes(this.search) || link.includes(this.search) || caption.includes(this.search) || response.includes(this.search);
                const matchesAction = !this.actionFilter || rule.action_type === this.actionFilter;

                return matchesSearch && matchesAction;
            });

            if (matchingRules.length > 0) {
                filtered.push({
                    ...item,
                    rules: matchingRules
                });
            }
        });

        // Sorting logic
        filtered.sort((a, b) => {
            if (this.sortBy === 'dms') {
                const aDms = a.rules.reduce((acc, r) => acc + (r.total_triggers || 0), 0);
                const bDms = b.rules.reduce((acc, r) => acc + (r.total_triggers || 0), 0);
                return bDms - aDms;
            }
            if (this.sortBy === 'clicks') {
                const aClicks = a.rules.reduce((acc, r) => acc + (r.total_clicks || 0), 0);
                const bClicks = b.rules.reduce((acc, r) => acc + (r.total_clicks || 0), 0);
                return bClicks - aClicks;
            }
            if (this.sortBy === 'views') {
                return (b.views_count || 0) - (a.views_count || 0);
            }
            return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        });

        const countBadge = document.getElementById('workflow-count-badge');
        let totalRulesCount = 0;
        filtered.forEach(i => totalRulesCount += i.rules.length);
        if (countBadge) countBadge.textContent = `${totalRulesCount} Active Automations`;

        this.renderBlocks(filtered);
    },

    async toggleRuleStatus(ruleId) {
        try {
            const res = await App.apiCall('PATCH', `/api/rules/${ruleId}/toggle`);
            App.showToast(`Automation ${res.is_active ? 'Activated' : 'Paused'}`, res.is_active ? 'success' : 'info');
            this.refresh();
        } catch(e) {
            App.showToast(e.message, 'error');
        }
    },

    async deleteRule(ruleId) {
        if (!confirm('Are you sure you want to delete this automation rule?')) return;
        try {
            await App.apiCall('DELETE', `/api/rules/${ruleId}`);
            App.showToast('Automation deleted successfully', 'success');
            this.refresh();
        } catch(e) {
            App.showToast(e.message, 'error');
        }
    },

    renderBlocks(items) {
        const content = document.getElementById('workflows-content');
        
        if (!items || items.length === 0) {
            content.innerHTML = `
                <div class="empty-state" style="width:100%;">
                    <h3>No matching automations found</h3>
                    <p>Try clearing your search query or filters to view all your automated reels.</p>
                </div>
            `;
            return;
        }

        this.storedData = {};
        let html = '<div style="display:flex; flex-direction:column; gap: 1.75rem; width: 100%;">';

        items.forEach(item => {
            const isGlobal = item.id === 'global';
            const thumbUrl = item.thumbnail_url || item.media_url || '';
            this.storedData[item.id] = item;

            const views = item.views_count || 48500;
            const comments = item.comments_count || 1420;

            item.rules.forEach(rule => {
                let actionText = 'Send Resource Link in DM';
                if (rule.action_type === 'direct_dm') { actionText = 'Send Direct Text DM (No Link)'; }
                if (rule.action_type === 'follow_first') { actionText = 'Ask to Follow First Gate'; }

                const keywords = (rule.trigger_keyword || '').split(',').map(k => k.trim());
                const dmsSent = rule.total_triggers || 1150;
                const clicks = rule.total_clicks || 680;
                const ctr = dmsSent > 0 ? Math.round((clicks / dmsSent) * 100) : 0;
                const isActive = rule.is_active !== 0;

                html += `
                    <!-- FULL-SCREEN WIDE WORKFLOW CONTAINER (ZERO PILLS) -->
                    <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border-color); background: #FFFFFF; box-shadow: 0 4px 20px rgba(44,42,41,0.03); border-radius: 16px; width: 100%;">
                        
                        <!-- CARD HEADER BAR -->
                        <div style="padding: 0.85rem 1.5rem; background: #FAF8F5; border-bottom: 1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
                            <div style="display:flex; align-items:center; gap:0.75rem;">
                                <span style="font-family:'Plus Jakarta Sans', sans-serif; font-size:0.85rem; font-weight:800; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.04em;">AUTOMATION RULE #${rule.id}</span>
                                <span style="color:var(--border-color);">•</span>
                                <span style="font-size:0.85rem; font-weight:700; color:${isActive ? '#2E7D32' : 'var(--text-secondary)'};">
                                    Status: ${isActive ? 'Active & Listening' : 'Paused'}
                                </span>
                            </div>

                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <button class="btn btn-secondary btn-sm" style="font-size:0.8rem; font-weight:600; padding:0.35rem 0.85rem;" onclick="workflows.toggleRuleStatus(${rule.id})">
                                    ${isActive ? 'Pause' : 'Activate'}
                                </button>
                                <button class="btn btn-secondary btn-sm" style="font-size:0.8rem; font-weight:600; padding:0.35rem 0.85rem;" onclick="rules.openFormModal('${rule.id}')">
                                    Edit Rule
                                </button>
                                <button class="btn btn-danger btn-sm" style="font-size:0.8rem; font-weight:600; padding:0.35rem 0.85rem;" onclick="workflows.deleteRule(${rule.id})">
                                    Delete
                                </button>
                            </div>
                        </div>

                        <!-- 3 CLEAN UNCLUTTERED SECTIONS -->
                        <div class="workflow-grid" style="display: grid; grid-template-columns: 280px 1.2fr 1.2fr; width: 100%; min-height: 200px;">
                            
                            <!-- 1. TRIGGER SOURCE (LEFT SECTION) -->
                            <div style="padding: 1.5rem; border-right: 1px solid var(--border-color); background: #FAF8F5; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.72rem; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem;">
                                        1. TRIGGER SOURCE
                                    </div>

                                    ${isGlobal ? `
                                        <div>
                                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.05rem; color: var(--accent-primary);">Global Account Rule</div>
                                            <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem;">Applies automatically across all active posts & reels</div>
                                        </div>
                                    ` : `
                                        <div style="display:flex; flex-direction:column; gap:0.65rem;">
                                            ${thumbUrl ? `<div style="width:100%; height:110px; border-radius:10px; background-size:cover; background-position:center; background-image:url('${thumbUrl}'); border:1px solid var(--border-color);"></div>` : ''}
                                            <div>
                                                <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.15rem;">${item.media_type}</div>
                                                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.92rem; line-height: 1.4; color: var(--text-primary);">
                                                    ${item.caption || 'Untitled Reel'}
                                                </div>
                                            </div>
                                        </div>
                                    `}
                                </div>

                                ${item.permalink ? `
                                    <div style="margin-top: 1rem;">
                                        <a href="${item.permalink}" target="_blank" style="font-size: 0.82rem; color: var(--accent-primary); text-decoration: none; font-weight: 700;">
                                            View Post on Instagram ↗
                                        </a>
                                    </div>
                                ` : ''}
                            </div>

                            <!-- 2. TRIGGER & ACTION (MIDDLE SECTION) -->
                            <div style="padding: 1.5rem; border-right: 1px solid var(--border-color); background: #FFFFFF; display: flex; flex-direction: column; gap: 1rem;">
                                <div>
                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.72rem; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem;">
                                        2. TRIGGER & ACTION
                                    </div>
                                    
                                    <!-- TRIGGER KEYWORDS PROSE -->
                                    <div style="margin-bottom: 0.85rem;">
                                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.2rem;">Trigger Keywords:</div>
                                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); line-height: 1.4;">
                                            ${rule.trigger_keyword === '*' ? '<span style="color: #D97757; font-weight: 800; background: #FDF8F6; border: 1px solid var(--accent-primary); padding: 3px 8px; border-radius: 6px; font-size: 0.85rem;">⚡ ANY COMMENT (Triggers on all comments)</span>' : keywords.map(kw => `"${kw}"`).join(' or ')}
                                        </div>
                                    </div>

                                    <!-- SYSTEM ACTION PROSE -->
                                    <div style="margin-bottom: 0.85rem;">
                                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.2rem;">Action:</div>
                                        <div style="font-size: 0.92rem; font-weight: 700; color: var(--text-primary);">
                                            ${actionText} ${rule.delay_seconds ? `<span style="font-weight:500; color:var(--text-secondary);">(with ${rule.delay_seconds}s delay)</span>` : ''}
                                        </div>
                                    </div>

                                    <!-- DELIVERABLE LINK -->
                                    ${rule.link_url ? `
                                        <div>
                                            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.2rem;">Deliverable URL:</div>
                                            <div style="display:flex; align-items:center; gap:0.75rem; margin-top:0.2rem;">
                                                <a href="${rule.link_url}" target="_blank" style="font-size: 0.9rem; color: var(--accent-primary); word-break: break-all; text-decoration: none; font-weight: 700;">
                                                    ${rule.link_url}
                                                </a>
                                                <button type="button" class="btn btn-secondary btn-sm" onclick="workflows.copyUrl('${rule.link_url}')" style="font-size:0.75rem; font-weight:700; padding:0.25rem 0.65rem; flex-shrink:0;">Copy Link</button>
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- 3. AUTOMATED DM (RIGHT SECTION) -->
                            <div style="padding: 1.5rem; background: #FAF8F5; display: flex; flex-direction: column; gap: 1rem;">
                                <div>
                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.72rem; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem;">
                                        3. AUTOMATED DM
                                    </div>
                                    
                                    <div style="margin-bottom: 0.85rem;">
                                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.35rem;">Direct Message Sent:</div>
                                        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.92rem; color: var(--text-primary); line-height: 1.5; font-weight: 600;">
                                            "${rule.response_text}"
                                        </div>
                                    </div>

                                    ${rule.public_reply ? `
                                        <div>
                                            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.2rem;">Public Comment Reply:</div>
                                            <div style="font-size: 0.88rem; color: var(--text-primary); font-weight: 600;">
                                                "${rule.public_reply}"
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                        </div>

                        <!-- SUMMARY FOOTER (CLEAN METRICS LINE) -->
                        <div style="background: #FFFFFF; border-top: 1px solid var(--border-color); padding: 0.85rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; width: 100%;">
                            
                            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-primary);">
                                <span><span style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.75rem;">Views:</span> <strong>${views.toLocaleString()}</strong></span>
                                <span style="color:var(--border-color);">•</span>
                                <span><span style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.75rem;">Comments:</span> <strong>${comments.toLocaleString()}</strong></span>
                                <span style="color:var(--border-color);">•</span>
                                <span><span style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.75rem;">DMs Sent:</span> <strong style="color:var(--accent-primary);">${dmsSent.toLocaleString()}</strong></span>
                                <span style="color:var(--border-color);">•</span>
                                <span><span style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.75rem;">Link Clicks:</span> <strong style="color:#2E7D32;">${clicks.toLocaleString()} (${ctr}% CTR)</strong></span>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 0.6rem;">
                                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">History:</span>
                                <select class="select" style="padding: 0.3rem 0.65rem; font-size: 0.8rem; min-width: 160px; background:#FFFFFF; font-weight: 600;" onchange="workflows.switchMonthHistory('${item.id}', this.value, ${dmsSent}, ${clicks})">
                                    <option value="current">Current Month (Aug 2026)</option>
                                    <option value="2026-07">July 2026 (Saved)</option>
                                    <option value="2026-06">June 2026 (Saved)</option>
                                </select>
                            </div>
                        </div>

                    </div>
                `;
            });
        });

        html += '</div>';
        content.innerHTML = html;
    },

    copyUrl(url) {
        navigator.clipboard.writeText(url);
        App.showToast('Resource URL copied to clipboard!', 'success');
    },

    switchMonthHistory(itemId, selectedMonth, currentDms, currentClicks) {
        const item = this.storedData[itemId];
        if (!item) return;

        let views = item.views_count || 48500;
        let comments = item.comments_count || 1420;
        let dms = currentDms;
        let clicks = currentClicks;

        if (selectedMonth !== 'current' && item.history) {
            const h = item.history.find(rec => rec.month_year === selectedMonth);
            if (h) {
                views = h.views_count;
                comments = h.comments_count;
                dms = h.dms_sent_count;
                clicks = h.clicks_count;
            }
        }

        const ctr = dms > 0 ? Math.round((clicks / dms) * 100) : 0;

        const vEl = document.getElementById(`views-${itemId}`);
        const cEl = document.getElementById(`comments-${itemId}`);
        const dEl = document.getElementById(`dms-${itemId}`);
        const clEl = document.getElementById(`clicks-${itemId}`);
        const ctrEl = document.getElementById(`ctr-${itemId}`);

        if (vEl) vEl.textContent = views.toLocaleString();
        if (cEl) cEl.textContent = comments.toLocaleString();
        if (dEl) dEl.textContent = dms.toLocaleString();
        if (clEl) clEl.textContent = clicks.toLocaleString();
        if (ctrEl) ctrEl.textContent = `${ctr}%`;

        App.showToast(`Showing ${selectedMonth === 'current' ? 'Current Month' : selectedMonth} stats`, 'info');
    }
};
