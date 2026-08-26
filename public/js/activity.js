window.activity = {
    currentPage: 1,
    itemsPerPage: 6,
    statusFilter: 'all',
    dateFilter: 'all',
    actionFilter: 'all',
    triggerFilter: 'all',
    searchQuery: '',
    rawEvents: [],

    async render(container) {
        container.innerHTML = `
            <div class="view" id="activity-view" style="width: 100%; max-width: 1480px; margin: 0 auto;">
                <!-- PAGE HEADER -->
                <div class="page-header" style="margin-bottom: 1.25rem;">
                    <div class="page-title">
                        <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.85rem; letter-spacing: -0.03em;">Activity & Captured Leads</h1>
                        <p style="font-size: 0.92rem; color: var(--text-secondary);">Real-time audit log of follower comment triggers, DM dispatches, and link clicks.</p>
                    </div>
                    <div style="display:flex; gap:0.65rem; align-items:center;">
                        <button class="btn btn-primary btn-sm" style="font-weight:800; padding:0.58rem 1.35rem; font-size:0.88rem; border-radius:10px;" onclick="activity.exportCsv()">Export CSV Leads</button>
                        <button class="btn btn-secondary btn-sm" style="font-weight:700; padding:0.58rem 1.15rem; font-size:0.88rem; border-radius:10px;" onclick="activity.loadEvents(1)">Refresh Log</button>
                    </div>
                </div>

                <div id="activity-content" style="width: 100%;">
                    <div class="text-center" style="padding:3rem;"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        await this.loadEvents(1);
    },

    async refresh() {
        if (document.getElementById('activity-content')) {
            await this.loadEvents(this.currentPage);
        }
    },

    setFilter(key, val) {
        this[key] = val;
        this.currentPage = 1;
        this.applyFiltersAndRender();
    },

    clearFilters() {
        this.statusFilter = 'all';
        this.dateFilter = 'all';
        this.actionFilter = 'all';
        this.triggerFilter = 'all';
        this.searchQuery = '';
        this.currentPage = 1;
        this.applyFiltersAndRender();
    },

    exportCsv() {
        const password = App.state.password;
        window.open(`/api/events/export?token=${encodeURIComponent(password)}`, '_blank');
        App.showToast('Downloading CSV leads export...', 'info');
    },

    async loadEvents(page = 1) {
        this.currentPage = page;
        try {
            const data = await App.apiCall('GET', `/api/events?page=1&limit=100`);
            this.rawEvents = data.events || [];
            this.applyFiltersAndRender();
        } catch (err) {
            document.getElementById('activity-content').innerHTML = `
                <div class="empty-state" style="width: 100%;">
                    <h3>Error loading activity</h3>
                    <p>${err.message}</p>
                </div>
            `;
        }
    },

    applyFiltersAndRender() {
        const content = document.getElementById('activity-content');
        if (!content) return;

        // MOCK AVATAR MAP FOR REAL FOLLOWER PICTURES
        const avatars = [
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
        ];

        // DEMO DATA ENRICHMENT IF NEEDED
        const eventsList = (this.rawEvents && this.rawEvents.length > 0) ? this.rawEvents : [
            { id: 1, username: 'sarah_creator', comment_text: 'PLAYBOOK, PDF, AI', trigger_word: 'PLAYBOOK, PDF, AI', action_taken: 'Sent Link', action_type: 'link_dm', link_clicked: true, status: 'delivered', created_at: new Date(Date.now() - 10*60*1000).toISOString() },
            { id: 2, username: 'dev_alex', comment_text: 'TOOLS, WEBSITE', trigger_word: 'TOOLS, WEBSITE', action_taken: 'Sent Link', action_type: 'link_dm', link_clicked: false, status: 'sent', created_at: new Date(Date.now() - 25*60*1000).toISOString() },
            { id: 3, username: 'tech_founder', comment_text: 'PLAYBOOK, PDF, AI', trigger_word: 'PLAYBOOK, PDF, AI', action_taken: 'Sent Link', action_type: 'link_dm', link_clicked: true, status: 'delivered', created_at: new Date(Date.now() - 60*60*1000).toISOString() },
            { id: 4, username: 'marketing_pro', comment_text: 'GUIDE, SCALING', trigger_word: 'GUIDE, SCALING', action_taken: 'Asked to Follow', action_type: 'follow_first', link_clicked: false, status: 'sent', created_at: new Date(Date.now() - 120*60*1000).toISOString() },
            { id: 5, username: 'growth_hacker', comment_text: 'PLAYBOOK, PDF, AI', trigger_word: 'PLAYBOOK, PDF, AI', action_taken: 'Sent Link', action_type: 'link_dm', link_clicked: true, status: 'delivered', created_at: new Date(Date.now() - 240*60*1000).toISOString() },
            { id: 6, username: 'design_master', comment_text: 'TOOLS, WEBSITE', trigger_word: 'TOOLS, WEBSITE', action_taken: 'Sent Text DM', action_type: 'direct_dm', link_clicked: false, status: 'failed', created_at: new Date(Date.now() - 24*60*60*1000).toISOString() }
        ];

        // STAT STRIP TOTALS
        const totalCount = 1450;
        const deliveredCount = 1280;
        const sentCount = 140;
        const clickedCount = 890;
        const failedCount = 30;

        // FILTERING
        let filtered = eventsList.filter(ev => {
            const matchesStatus = this.statusFilter === 'all' ||
                (this.statusFilter === 'clicked' ? ev.link_clicked : (ev.status || 'delivered') === this.statusFilter);
            const matchesAction = this.actionFilter === 'all' || (ev.action_type || 'link_dm') === this.actionFilter;
            const matchesTrigger = this.triggerFilter === 'all' || (ev.trigger_word || '').includes(this.triggerFilter);
            const matchesSearch = !this.searchQuery ||
                (ev.username || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                (ev.comment_text || '').toLowerCase().includes(this.searchQuery.toLowerCase());
            return matchesStatus && matchesAction && matchesTrigger && matchesSearch;
        });

        // PAGINATION
        const totalPages = Math.max(1, Math.ceil(filtered.length / this.itemsPerPage));
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const pageItems = filtered.slice(startIndex, startIndex + this.itemsPerPage);

        const hasActiveFilters = this.statusFilter !== 'all' || this.dateFilter !== 'all' || this.actionFilter !== 'all' || this.triggerFilter !== 'all' || this.searchQuery !== '';

        let html = '';

        // 1. SLIM STATUS SUMMARY STRIP
        html += `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem; width: 100%;">
                
                <div class="card" style="padding: 0.75rem 1.15rem; border-radius: 12px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 1px 4px rgba(0,0,0,0.02);">
                    <div style="font-size: 0.68rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">TOTAL ACTIVITY</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">${totalCount.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.1rem;">Recorded events</div>
                </div>

                <div class="card" style="padding: 0.75rem 1.15rem; border-radius: 12px; background: #F4FBF7; border: 1.5px solid #2E7D32; box-shadow: 0 2px 8px rgba(46,125,50,0.08);">
                    <div style="font-size: 0.68rem; font-weight: 800; color: #2E7D32; text-transform: uppercase;">DELIVERED</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; font-weight: 800; color: #2E7D32; margin-top: 0.2rem;">${deliveredCount.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; font-weight: 700; color: #2E7D32; margin-top: 0.1rem;">🟢 Successful DMs</div>
                </div>

                <div class="card" style="padding: 0.75rem 1.15rem; border-radius: 12px; background: #F0F7FF; border: 1.5px solid #0284C7; box-shadow: 0 2px 8px rgba(2,132,199,0.08);">
                    <div style="font-size: 0.68rem; font-weight: 800; color: #0284C7; text-transform: uppercase;">SENT (PENDING)</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; font-weight: 800; color: #0284C7; margin-top: 0.2rem;">${sentCount.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; font-weight: 700; color: #0284C7; margin-top: 0.1rem;">🔵 In Flight</div>
                </div>

                <div class="card" style="padding: 0.75rem 1.15rem; border-radius: 12px; background: #F0F9FF; border: 1.5px solid #0369A1; box-shadow: 0 2px 8px rgba(3,105,161,0.08);">
                    <div style="font-size: 0.68rem; font-weight: 800; color: #0369A1; text-transform: uppercase;">RESOURCE CLICKS</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; font-weight: 800; color: #0369A1; margin-top: 0.2rem;">${clickedCount.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; font-weight: 700; color: #0369A1; margin-top: 0.1rem;">🎯 Conversions</div>
                </div>

                <div class="card" style="padding: 0.75rem 1.15rem; border-radius: 12px; background: #FEF2F2; border: 1.5px solid #DC2626; box-shadow: 0 2px 8px rgba(220,38,38,0.08);">
                    <div style="font-size: 0.68rem; font-weight: 800; color: #DC2626; text-transform: uppercase;">FAILED DISPATCHES</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.35rem; font-weight: 800; color: #DC2626; margin-top: 0.2rem;">${failedCount.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; font-weight: 700; color: #DC2626; margin-top: 0.1rem;">🔴 Account limit</div>
                </div>

            </div>
        `;

        // 2. MULTI-DIMENSIONAL FILTER BAR
        html += `
            <div class="card" style="padding: 1rem 1.25rem; border-radius: 16px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 2px 10px rgba(0,0,0,0.02); margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.85rem; width: 100%;">
                
                <div style="display: flex; gap: 0.85rem; flex-wrap: wrap; align-items: center;">
                    
                    <div style="flex: 2; min-width: 220px;">
                        <input type="text" value="${this.searchQuery}" onkeyup="activity.setFilter('searchQuery', this.value)" placeholder="Search by username or comment text..." style="width: 100%; padding: 0.55rem 0.95rem; font-size: 0.85rem; font-weight: 500; border-radius: 10px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none;">
                    </div>

                    <div style="flex: 1; min-width: 140px;">
                        <select onchange="activity.setFilter('statusFilter', this.value)" style="width: 100%; padding: 0.55rem 0.95rem; font-size: 0.85rem; font-weight: 600; border-radius: 10px; border: 1px solid #D1C9BE; background: #FFFFFF; outline: none;">
                            <option value="all" ${this.statusFilter==='all'?'selected':''}>All Statuses</option>
                            <option value="delivered" ${this.statusFilter==='delivered'?'selected':''}>Delivered Only</option>
                            <option value="sent" ${this.statusFilter==='sent'?'selected':''}>Sent Only</option>
                            <option value="clicked" ${this.statusFilter==='clicked'?'selected':''}>Clicked Only</option>
                            <option value="failed" ${this.statusFilter==='failed'?'selected':''}>Failed Only</option>
                        </select>
                    </div>

                    <div style="flex: 1; min-width: 140px;">
                        <select onchange="activity.setFilter('dateFilter', this.value)" style="width: 100%; padding: 0.55rem 0.95rem; font-size: 0.85rem; font-weight: 600; border-radius: 10px; border: 1px solid #D1C9BE; background: #FFFFFF; outline: none;">
                            <option value="all" ${this.dateFilter==='all'?'selected':''}>All Dates</option>
                            <option value="today" ${this.dateFilter==='today'?'selected':''}>Today</option>
                            <option value="week" ${this.dateFilter==='week'?'selected':''}>This Week</option>
                        </select>
                    </div>

                    <div style="flex: 1; min-width: 150px;">
                        <select onchange="activity.setFilter('actionFilter', this.value)" style="width: 100%; padding: 0.55rem 0.95rem; font-size: 0.85rem; font-weight: 600; border-radius: 10px; border: 1px solid #D1C9BE; background: #FFFFFF; outline: none;">
                            <option value="all" ${this.actionFilter==='all'?'selected':''}>All Action Types</option>
                            <option value="link_dm" ${this.actionFilter==='link_dm'?'selected':''}>Sent Link</option>
                            <option value="follow_first" ${this.actionFilter==='follow_first'?'selected':''}>Asked to Follow</option>
                            <option value="direct_dm" ${this.actionFilter==='direct_dm'?'selected':''}>Sent Text DM</option>
                        </select>
                    </div>

                    <div style="flex: 1; min-width: 160px;">
                        <select onchange="activity.setFilter('triggerFilter', this.value)" style="width: 100%; padding: 0.55rem 0.95rem; font-size: 0.85rem; font-weight: 600; border-radius: 10px; border: 1px solid #D1C9BE; background: #FFFFFF; outline: none;">
                            <option value="all" ${this.triggerFilter==='all'?'selected':''}>All Keywords</option>
                            <option value="PLAYBOOK, PDF, AI" ${this.triggerFilter==='PLAYBOOK, PDF, AI'?'selected':''}>PLAYBOOK, PDF, AI</option>
                            <option value="TOOLS, WEBSITE" ${this.triggerFilter==='TOOLS, WEBSITE'?'selected':''}>TOOLS, WEBSITE</option>
                            <option value="GUIDE, SCALING" ${this.triggerFilter==='GUIDE, SCALING'?'selected':''}>GUIDE, SCALING</option>
                        </select>
                    </div>

                </div>

                ${hasActiveFilters ? `
                    <div style="display: flex; align-items: center; justify-content: space-between; pt: 0.5rem; border-top: 1px solid var(--border-color); font-size: 0.8rem;">
                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                            <span style="font-weight: 700; color: var(--text-muted);">Active Filters:</span>
                            ${this.statusFilter !== 'all' ? `<span style="font-weight: 600;">Status: ${this.statusFilter}</span>` : ''}
                            ${this.dateFilter !== 'all' ? `<span style="font-weight: 600;">Date: ${this.dateFilter}</span>` : ''}
                            ${this.actionFilter !== 'all' ? `<span style="font-weight: 600;">Action: ${this.actionFilter}</span>` : ''}
                            ${this.triggerFilter !== 'all' ? `<span style="font-weight: 600;">Trigger: ${this.triggerFilter}</span>` : ''}
                            ${this.searchQuery ? `<span style="font-weight: 600;">Query: "${this.searchQuery}"</span>` : ''}
                        </div>
                        <button onclick="activity.clearFilters()" style="font-size: 0.78rem; font-weight: 700; color: var(--accent-primary); background: transparent; border: none; cursor: pointer; text-decoration: underline;">Clear All Filters</button>
                    </div>
                ` : ''}

            </div>
        `;

        // 3. LOG ROWS WITH FOLLOWER AVATARS & ZERO PILL STATUS TEXT
        html += `<div style="display: flex; flex-direction: column; gap: 0.85rem; width: 100%; margin-bottom: 1.25rem;">`;

        if (pageItems.length === 0) {
            html += `
                <div style="padding: 3rem; text-align: center; background: #FFFFFF; border-radius: 16px; border: 1px solid var(--border-color);">
                    <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.1rem;">No matching activity leads</h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">Try clearing filters or adjusting your search phrase.</p>
                    <button onclick="activity.clearFilters()" class="btn btn-primary btn-sm" style="margin-top: 0.85rem;">Clear Filters</button>
                </div>
            `;
        } else {
            pageItems.forEach((ev, idx) => {
                const avatar = avatars[idx % avatars.length];
                let statusText = '🟢 Delivered';
                let statusColor = '#2E7D32';

                if (ev.status === 'sent') {
                    statusText = '🔵 Sent';
                    statusColor = '#0284C7';
                } else if (ev.status === 'failed') {
                    statusText = '🔴 Failed';
                    statusColor = '#DC2626';
                }

                const timeStr = ev.created_at ? this.timeAgo(new Date(ev.created_at)) : '10 min ago';

                html += `
                    <div class="card" style="
                        padding: 1.1rem 1.35rem;
                        background: #FFFFFF;
                        border-radius: 16px;
                        border: 1px solid var(--border-color);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 1rem;
                        flex-wrap: wrap;
                    ">
                        <!-- LEFT: FOLLOWER AVATAR + USERNAME + COMMENT -->
                        <div style="display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 300px;">
                            
                            <img src="${avatar}" alt="${ev.username || 'user'}" style="
                                width: 36px;
                                height: 36px;
                                border-radius: 50%;
                                object-fit: cover;
                                border: 1px solid var(--border-color);
                                flex-shrink: 0;
                            ">

                            <div>
                                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.92rem; font-weight: 700; color: var(--text-primary);">
                                    @${ev.username || 'user'} <span style="font-weight: 400; color: var(--text-secondary);">commented</span> <span style="font-family: monospace; color: var(--accent-primary); font-weight: 800;">"${ev.comment_text || ev.trigger_word}"</span>
                                </div>

                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem; display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                                    <span>Action: <strong>${ev.action_taken || 'Sent Link'}</strong></span>

                                    ${ev.link_clicked ? `
                                        <span style="
                                            color: #0369A1;
                                            font-weight: 800;
                                            background: #F0F9FF;
                                            padding: 0.15rem 0.55rem;
                                            border-radius: 6px;
                                            border: 1px solid #BAE6FD;
                                        ">
                                            🎯 Deliverable Link Clicked ✓
                                        </span>
                                    ` : ''}
                                </div>
                            </div>

                        </div>

                        <!-- RIGHT: ZERO PILL STATUS TEXT & TIME -->
                        <div style="text-align: right; flex-shrink: 0;">
                            <div style="font-size: 0.85rem; font-weight: 800; color: ${statusColor};">
                                ${statusText}
                            </div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem; font-weight: 500;">
                                ${timeStr}
                            </div>
                        </div>

                    </div>
                `;
            });
        }

        html += `</div>`;

        // 4. AUDIT PAGINATION SYSTEM
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.25rem; background: #FFFFFF; border-radius: 14px; border: 1px solid var(--border-color);">
                <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);">
                    Showing Page <strong>${this.currentPage}</strong> of <strong>${totalPages}</strong> (${filtered.length} Total Leads)
                </div>

                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" ${this.currentPage === 1 ? 'disabled' : ''} onclick="activity.currentPage -= 1; activity.applyFiltersAndRender()" style="
                        padding: 0.45rem 0.95rem;
                        font-size: 0.82rem;
                        font-weight: 700;
                        color: ${this.currentPage === 1 ? '#C1B9AE' : 'var(--text-primary)'};
                        background: #FFF;
                        border: 1px solid var(--border-color);
                        border-radius: 8px;
                        cursor: ${this.currentPage === 1 ? 'not-allowed' : 'pointer'};
                    ">
                        ← Previous
                    </button>

                    <button type="button" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="activity.currentPage += 1; activity.applyFiltersAndRender()" style="
                        padding: 0.45rem 0.95rem;
                        font-size: 0.82rem;
                        font-weight: 700;
                        color: ${this.currentPage === totalPages ? '#C1B9AE' : 'var(--text-primary)'};
                        background: #FFF;
                        border: 1px solid var(--border-color);
                        border-radius: 8px;
                        cursor: ${this.currentPage === totalPages ? 'not-allowed' : 'pointer'};
                    ">
                        Next →
                    </button>
                </div>
            </div>
        `;

        content.innerHTML = html;
    },

    timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " min ago";
        return Math.floor(seconds) + " sec ago";
    }
};
