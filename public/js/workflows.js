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

                        <!-- Content Source Filter -->
                        <div style="flex: 1; min-width: 170px;">
                            <select id="workflow-source-filter" class="select" onchange="workflows.applyFilters()" style="padding: 0.65rem 1rem; font-size: 0.88rem; font-weight: 600;">
                                <option value="">All Content Types</option>
                                <option value="reels" ${this.sourceFilter==='reels'?'selected':''}>🎬 Reels & Posts</option>
                                <option value="story" ${this.sourceFilter==='story'?'selected':''}>⚡ Story Automations</option>
                                <option value="global" ${this.sourceFilter==='global'?'selected':''}>🌐 Global Rules</option>
                            </select>
                        </div>

                        <!-- Action Type Filter -->
                        <div style="flex: 1; min-width: 160px;">
                            <select id="workflow-action-filter" class="select" onchange="workflows.applyFilters()" style="padding: 0.65rem 1rem; font-size: 0.88rem; font-weight: 600;">
                                <option value="">All Action Types</option>
                                <option value="link_dm" ${this.actionFilter==='link_dm'?'selected':''}>Send Link DM</option>
                                <option value="direct_dm" ${this.actionFilter==='direct_dm'?'selected':''}>Send Text DM</option>
                                <option value="follow_first" ${this.actionFilter==='follow_first'?'selected':''}>Follow First Gate</option>
                            </select>
                        </div>

                        <!-- Status Filter (Active / Paused / Deleted) -->
                        <div style="flex: 1; min-width: 170px;">
                            <select id="workflow-status-filter" class="select" onchange="workflows.applyFilters()" style="padding: 0.65rem 1rem; font-size: 0.88rem; font-weight: 600;">
                                <option value="">All Statuses (Active & Paused)</option>
                                <option value="active" ${this.statusFilter==='active'?'selected':''}>🟢 Active Only</option>
                                <option value="paused" ${this.statusFilter==='paused'?'selected':''}>⏸️ Paused Only</option>
                                <option value="deleted" ${this.statusFilter==='deleted'?'selected':''}>🗑️ Deleted Automations</option>
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
                this.rawItems = await App.apiCall('GET', '/api/media/automated?include_deleted=true');
                this.applyFilters();
            } catch(e) {}
        }
    },

    async loadWorkflows() {
        try {
            this.rawItems = await App.apiCall('GET', '/api/media/automated?include_deleted=true');
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
        this.sourceFilter = document.getElementById('workflow-source-filter')?.value || '';
        this.actionFilter = document.getElementById('workflow-action-filter')?.value || '';
        this.statusFilter = document.getElementById('workflow-status-filter')?.value || '';
        this.sortBy = document.getElementById('workflow-sort-by')?.value || 'recent';

        if (!this.rawItems) return;

        let filtered = [];

        this.rawItems.forEach(item => {
            const isStory = item.id === 'story' || item.media_type === 'STORY' || item.media_product_type === 'STORY';
            const isGlobal = item.id === 'global' || item.media_type === 'GLOBAL';
            const isReel = !isStory && !isGlobal;

            if (this.sourceFilter === 'story' && !isStory) return;
            if (this.sourceFilter === 'reels' && !isReel) return;
            if (this.sourceFilter === 'global' && !isGlobal) return;

            const caption = (item.caption || '').toLowerCase();
            const matchingRules = (item.rules || []).filter(rule => {
                const keyword = (rule.trigger_keyword || '').toLowerCase();
                const link = (rule.link_url || '').toLowerCase();
                const response = (rule.response_text || '').toLowerCase();

                const matchesSearch = !this.search || keyword.includes(this.search) || link.includes(this.search) || caption.includes(this.search) || response.includes(this.search);
                const matchesAction = !this.actionFilter || rule.action_type === this.actionFilter;
                
                const isRuleDeleted = rule.is_deleted === 1 || rule.is_deleted === true || rule.is_deleted === '1';
                const isRuleActive = (rule.is_active === 1 || rule.is_active === true || rule.is_active === '1') && !isRuleDeleted;

                let matchesStatus = true;
                if (this.statusFilter === 'deleted') {
                    matchesStatus = isRuleDeleted;
                } else if (this.statusFilter === 'active') {
                    matchesStatus = isRuleActive;
                } else if (this.statusFilter === 'paused') {
                    matchesStatus = !isRuleActive && !isRuleDeleted;
                } else {
                    // Default / All Statuses: show active and paused, hide deleted
                    matchesStatus = !isRuleDeleted;
                }

                return matchesSearch && matchesAction && matchesStatus;
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
        let activeCount = 0;
        let totalCount = 0;
        let deletedCount = 0;
        filtered.forEach(i => {
            i.rules.forEach(r => {
                const isDel = r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1';
                if (isDel) {
                    deletedCount++;
                } else {
                    totalCount++;
                    if (r.is_active === 1 || r.is_active === true || r.is_active === '1') activeCount++;
                }
            });
        });

        if (countBadge) {
            if (this.statusFilter === 'deleted') {
                countBadge.textContent = `${deletedCount} Deleted Automation${deletedCount === 1 ? '' : 's'}`;
                countBadge.style.color = '#B91C1C';
            } else {
                countBadge.textContent = `${activeCount} Active / ${totalCount} Total`;
                countBadge.style.color = 'var(--accent-primary)';
            }
        }

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
        if (!confirm('Are you sure you want to delete this automation? It will be moved to Deleted Automations and can be restored anytime.')) return;
        try {
            await App.apiCall('DELETE', `/api/rules/${ruleId}`);
            App.showToast('Automation moved to Deleted Automations', 'success');
            await this.loadWorkflows();
        } catch(e) {
            App.showToast(e.message, 'error');
        }
    },

    async restoreRule(ruleId) {
        try {
            await App.apiCall('POST', `/api/rules/${ruleId}/restore`);
            App.showToast('Automation restored successfully! It is now active.', 'success');
            await this.loadWorkflows();
        } catch(e) {
            App.showToast(e.message, 'error');
        }
    },

    async permanentDeleteRule(ruleId) {
        if (!confirm('Are you sure you want to PERMANENTLY delete this automation? This cannot be undone.')) return;
        try {
            await App.apiCall('DELETE', `/api/rules/${ruleId}/permanent`);
            App.showToast('Automation permanently deleted', 'success');
            await this.loadWorkflows();
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
            const isStory = item.id === 'story' || item.media_type === 'STORY' || item.media_product_type === 'STORY';
            const thumbUrl = item.thumbnail_url || item.media_url || '';
            this.storedData[item.id] = item;

            const views = item.views_count !== undefined && item.views_count !== null ? item.views_count : 0;
            const comments = item.comments_count !== undefined && item.comments_count !== null ? item.comments_count : 0;
            const likes = item.like_count !== undefined && item.like_count !== null ? item.like_count : 0;

            item.rules.forEach(rule => {
                const ruleIsStory = isStory || rule.source_type === 'story' || rule.source_type === 'story_mention';
                let actionText = 'Send Resource Link in DM';
                let isButtonFunnel = false;
                if (rule.action_type === 'direct_dm') { actionText = 'Send Direct Text DM (No Link)'; }
                if (rule.action_type === 'follow_first') {
                    let btnCfg = null;
                    if (rule.buttons_config_json) {
                        try { btnCfg = JSON.parse(rule.buttons_config_json); } catch(e) {}
                    }
                    if (!btnCfg || btnCfg.gate_type !== 'text') {
                        actionText = '🌟 3-Step Interactive Button Funnel';
                        isButtonFunnel = true;
                    } else {
                        actionText = 'Ask to Follow First (Text Reply)';
                    }
                }

                const keywords = (rule.trigger_keyword || '').split(',').map(k => k.trim());
                const dmsSent = rule.total_triggers !== undefined && rule.total_triggers !== null ? rule.total_triggers : 0;
                const clicks = rule.total_clicks !== undefined && rule.total_clicks !== null ? rule.total_clicks : 0;
                const ctr = dmsSent > 0 ? Math.round((clicks / dmsSent) * 100) : 0;
                const isDeleted = rule.is_deleted === 1 || rule.is_deleted === true || rule.is_deleted === '1';
                const isActive = (rule.is_active !== 0 && !isDeleted);

                html += `
                    <!-- FULL-SCREEN WIDE WORKFLOW CONTAINER (ZERO PILLS) -->
                    <div class="card" style="padding: 0; overflow: hidden; border: 1px solid var(--border-color); background: #FFFFFF; box-shadow: 0 4px 20px rgba(44,42,41,0.03); border-radius: 16px; width: 100%;">
                        
                        <!-- CARD HEADER BAR -->
                        <div style="padding: 0.85rem 1.5rem; background: ${isDeleted ? '#FEF2F2' : '#FAF8F5'}; border-bottom: 1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
                            <div style="display:flex; align-items:center; gap:0.75rem;">
                                <span style="font-family:'Plus Jakarta Sans', sans-serif; font-size:0.85rem; font-weight:800; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.04em;">AUTOMATION RULE #${rule.id}</span>
                                <span style="color:var(--border-color);">•</span>
                                ${isDeleted ? `
                                <span style="font-size:0.85rem; font-weight:800; color:#991B1B; display: inline-flex; align-items: center; gap: 0.35rem; background: #FEE2E2; border: 1px solid #FECACA; padding: 3px 8px; border-radius: 6px;">
                                    <span>🗑️</span>
                                    <span>Deleted Automation</span>
                                </span>
                                ` : `
                                <span style="font-size:0.85rem; font-weight:800; color:${isActive ? '#1B5E20' : '#B45309'}; display: inline-flex; align-items: center; gap: 0.35rem; background: ${isActive ? '#E8F5E9' : '#FEF3C7'}; padding: 3px 8px; border-radius: 6px;">
                                    <span>${isActive ? '🟢' : '⏸️'}</span>
                                    <span>${isActive ? 'Active & Listening' : 'Paused'}</span>
                                </span>
                                `}
                                ${ruleIsStory && !isDeleted ? `
                                <span style="font-size:0.8rem; font-weight:800; color:#C2410C; display: inline-flex; align-items: center; gap: 0.35rem; background:#FFF7ED; border:1px solid #FFEDD5; padding: 3px 8px; border-radius: 6px;">
                                    <span>⚡ Story Automation</span>
                                </span>` : ''}
                                ${isButtonFunnel && !isDeleted ? `
                                <span style="font-size:0.8rem; font-weight:800; color:#1D4ED8; display: inline-flex; align-items: center; gap: 0.35rem; background:#EFF6FF; border:1px solid #BFDBFE; padding: 3px 8px; border-radius: 6px;">
                                    <span>🔘 Interactive Button Funnel</span>
                                </span>` : ''}
                            </div>

                            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                                ${isDeleted ? `
                                <button class="btn btn-primary btn-sm" style="font-size:0.82rem; font-weight:800; padding:0.4rem 1.1rem; border-radius: 8px; background:#2E7D32; border:1.5px solid #2E7D32; color:#FFFFFF; cursor:pointer;" onclick="workflows.restoreRule(${rule.id})">
                                    ♻️ Restore Automation
                                </button>
                                <button class="btn btn-danger btn-sm" style="font-size:0.8rem; font-weight:600; padding:0.35rem 0.85rem;" onclick="workflows.permanentDeleteRule(${rule.id})">
                                    Delete Permanently
                                </button>
                                ` : `
                                <button class="btn btn-sm" style="font-size:0.82rem; font-weight:800; padding:0.4rem 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; ${isActive ? 'background:#FFFFFF; border:1.5px solid #D1C9BE; color:#4B5563;' : 'background:#2E7D32; border:1.5px solid #2E7D32; color:#FFFFFF;'}" onclick="workflows.toggleRuleStatus(${rule.id})" title="${isActive ? 'Click to Pause this automation' : 'Click to Activate this automation'}">
                                    ${isActive ? '⏸️ Pause' : '🟢 Activate'}
                                </button>
                                ${!ruleIsStory ? `
                                <button class="btn btn-secondary btn-sm" style="font-size:0.8rem; font-weight:700; padding:0.35rem 0.85rem; color: #2E7D32; background: #F4FBF7; border-color: #A3D9B1;" onclick="workflows.backfillPastComments(${rule.id})" title="Auto-DM followers who commented before this automation was created">
                                    ⚡ Catch-Up Past Comments
                                </button>
                                ` : ''}
                                <button class="btn btn-secondary btn-sm" style="font-size:0.8rem; font-weight:700; padding:0.35rem 0.85rem; color: #0369A1; background: #F0F9FF; border-color: #BAE6FD;" onclick="workflows.testRuleTrigger(${rule.id}, '${item.ig_media_id || item.id || ''}', '${rule.trigger_keyword || ''}', '${rule.source_type || ''}')">
                                    🧪 Test Trigger
                                </button>
                                <button class="btn btn-secondary btn-sm" style="font-size:0.8rem; font-weight:600; padding:0.35rem 0.85rem;" onclick="rules.openFormModal('${rule.id}')">
                                    Edit Rule
                                </button>
                                <button class="btn btn-danger btn-sm" style="font-size:0.8rem; font-weight:600; padding:0.35rem 0.85rem;" onclick="workflows.deleteRule(${rule.id})">
                                    Delete
                                </button>
                                `}
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
                                    ` : ruleIsStory ? `
                                        <div style="display:flex; flex-direction:column; gap:0.65rem;">
                                            ${thumbUrl ? `
                                                <div style="width:100%; height:110px; border-radius:10px; background-size:cover; background-position:center; background-image:url('${thumbUrl}'); border:1px solid var(--border-color); position:relative;">
                                                    <span style="position:absolute; top:6px; left:6px; font-size:0.62rem; font-weight:800; background:linear-gradient(45deg, #f09433, #dc2743); color:#FFF; padding:2px 6px; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.3);">⚡ ACTIVE STORY</span>
                                                </div>
                                            ` : `
                                                <div style="width:100%; height:90px; border-radius:10px; background: linear-gradient(135deg, #FFF1EB 0%, #FDD1C3 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid #FDC8B6;">
                                                    <div style="font-size: 1.8rem;">⚡</div>
                                                    <div style="font-size: 0.75rem; font-weight: 800; color: var(--accent-primary); text-transform: uppercase;">Instagram Story</div>
                                                </div>
                                            `}
                                            <div>
                                                <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.15rem;">
                                                    ${rule.source_type === 'story_mention' ? '🏷️ Story Mentions' : '⚡ Story Replies'}
                                                </div>
                                                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.92rem; line-height: 1.4; color: var(--text-primary);">
                                                    ${item.caption || (rule.source_type === 'story_mention' ? 'Follower mentions your account in their story' : 'Follower replies to your active Instagram Story')}
                                                </div>
                                            </div>
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

                        <!-- SUMMARY FOOTER (100% REAL LIVE METRICS) -->
                        <div style="background: #FFFFFF; border-top: 1px solid var(--border-color); padding: 0.85rem 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; width: 100%;">
                            
                            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-primary);">
                                <span><span style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.75rem;">Likes:</span> <strong id="likes-${rule.id}">${likes.toLocaleString()}</strong></span>
                                <span style="color:var(--border-color);">•</span>
                                <span><span style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.75rem;">Comments:</span> <strong id="comments-${rule.id}">${comments.toLocaleString()}</strong></span>
                                <span style="color:var(--border-color);">•</span>
                                <span><span style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.75rem;">DMs Dispatched:</span> <strong id="dms-${rule.id}" style="color:var(--accent-primary);">${dmsSent.toLocaleString()}</strong></span>
                                <span style="color:var(--border-color);">•</span>
                                <span><span style="color:var(--text-muted); font-weight:700; text-transform:uppercase; font-size:0.75rem;">Link Clicks:</span> <strong id="clicks-${rule.id}" style="color:#2E7D32;">${clicks.toLocaleString()} (${ctr}% CTR)</strong></span>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 0.6rem;">
                                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Status:</span>
                                <span style="font-size: 0.8rem; font-weight: 700; color: ${isActive ? '#2E7D32' : 'var(--text-secondary)'};">
                                    ${isActive ? '🟢 Active & Listening' : '⏸️ Paused'}
                                </span>
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

        let views = item.views_count || 0;
        let comments = item.comments_count || 0;
        let dms = currentDms || 0;
        let clicks = currentClicks || 0;

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
    },

    async testRuleTrigger(ruleId, mediaIgId, triggerKeyword, sourceType = '') {
        const kw = (triggerKeyword || 'GOOGLE').split(',')[0].replace(/['"]/g, '').trim();
        const isStory = sourceType === 'story' || sourceType === 'story_mention' || mediaIgId === 'story' || mediaIgId === 'story_mention';
        const label = sourceType === 'story_mention' ? 'story mention' : (isStory ? 'story reply' : 'comment');
        App.showToast(`⚡ Simulating follower ${label} "${kw}"...`, 'info');
        try {
            const payload = {
                media_id: mediaIgId,
                comment_text: kw,
                username: 'live_test_follower'
            };
            if (isStory) {
                payload.type = sourceType || (mediaIgId === 'story_mention' ? 'story_mention' : 'story');
            }
            const res = await App.apiCall('POST', '/api/webhook/simulate', payload);
            App.showToast(res.message || 'Test trigger executed successfully!', 'success');
            setTimeout(() => {
                this.refresh();
                if (window.activity && window.activity.refresh) window.activity.refresh();
                if (window.dashboard && window.dashboard.refresh) window.dashboard.refresh();
            }, 1500);
        } catch(err) {
            App.showToast('Test failed: ' + err.message, 'error');
        }
    },

    async backfillPastComments(ruleId) {
        if (!confirm('Scan all existing comments on this Reel and send automated DMs to anyone who commented before this rule was set up?')) return;
        App.showToast('Scanning past comments on Instagram...', 'info');
        try {
            const res = await App.apiCall('POST', `/api/rules/${ruleId}/backfill`);
            App.showToast(res.message || 'Past comments queued successfully!', 'success');
            setTimeout(() => {
                this.refresh();
                if (window.activity && window.activity.refresh) window.activity.refresh();
                if (window.dashboard && window.dashboard.refresh) window.dashboard.refresh();
            }, 1500);
        } catch(err) {
            App.showToast('Catch-up failed: ' + err.message, 'error');
        }
    }
};
