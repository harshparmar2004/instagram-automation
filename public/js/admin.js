// Super Admin Portal View
const adminView = {
    metrics: null,
    users: [],
    searchQuery: '',
    statusFilter: 'all',
    isLoading: false,

    async render(container) {
        container.innerHTML = `
            <div style="padding: 1.5rem; max-width: 1200px; margin: 0 auto;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.8rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                            <span style="font-size: 1.5rem;">👑</span>
                            <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.6rem; color: #2C2A29; letter-spacing: -0.02em; margin: 0;">Super Admin Portal</h1>
                            <span style="background: #FEF3C7; color: #B45309; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; letter-spacing: 0.04em;">Platform Control</span>
                        </div>
                        <p style="font-size: 0.88rem; color: #736E68; margin: 0;">Monitor creator workspaces, manage accounts, track system metrics, and inspect tenant rules.</p>
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        <button onclick="adminView.refresh(false)" class="btn btn-secondary" style="font-size: 0.84rem; padding: 0.55rem 1rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                            <span>↻</span> Refresh Live
                        </button>
                    </div>
                </div>

                <!-- KPI Metric Cards Grid -->
                <div id="admin-metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.8rem;">
                    <div class="card" style="padding: 1.25rem; background: #FFFFFF; border-radius: 14px; border: 1px solid #E6E1D8; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                        <div style="font-size: 0.76rem; font-weight: 700; color: #736E68; text-transform: uppercase; margin-bottom: 0.4rem;">Total Users</div>
                        <div id="metric-total-users" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.8rem; font-weight: 800; color: #2C2A29;">-</div>
                        <div style="font-size: 0.74rem; color: #2E7D32; font-weight: 600; margin-top: 0.2rem;">Registered Creators</div>
                    </div>

                    <div class="card" style="padding: 1.25rem; background: #FFFFFF; border-radius: 14px; border: 1px solid #E6E1D8; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                        <div style="font-size: 0.76rem; font-weight: 700; color: #736E68; text-transform: uppercase; margin-bottom: 0.4rem;">Instagram Connected</div>
                        <div id="metric-connected-accounts" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.8rem; font-weight: 800; color: #D97757;">-</div>
                        <div style="font-size: 0.74rem; color: #736E68; font-weight: 600; margin-top: 0.2rem;">Active IG Workspaces</div>
                    </div>

                    <div class="card" style="padding: 1.25rem; background: #FFFFFF; border-radius: 14px; border: 1px solid #E6E1D8; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                        <div style="font-size: 0.76rem; font-weight: 700; color: #736E68; text-transform: uppercase; margin-bottom: 0.4rem;">Active Automations</div>
                        <div id="metric-active-rules" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.8rem; font-weight: 800; color: #2C2A29;">-</div>
                        <div style="font-size: 0.74rem; color: #736E68; font-weight: 600; margin-top: 0.2rem;">Live Comment Triggers</div>
                    </div>

                    <div class="card" style="padding: 1.25rem; background: #FFFFFF; border-radius: 14px; border: 1px solid #E6E1D8; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                        <div style="font-size: 0.76rem; font-weight: 700; color: #736E68; text-transform: uppercase; margin-bottom: 0.4rem;">Total Leads & DMs</div>
                        <div id="metric-total-leads" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.8rem; font-weight: 800; color: #2E7D32;">-</div>
                        <div style="font-size: 0.74rem; color: #2E7D32; font-weight: 600; margin-top: 0.2rem;">Dispatched & Tracked</div>
                    </div>
                </div>

                <!-- Token Alerts Section -->
                <div id="admin-token-alerts" style="margin-bottom: 1.5rem; display: none;">
                    <!-- Rendered if any tokens are expiring -->
                </div>

                <!-- User Management Table Section -->
                <div class="card" style="background: #FFFFFF; border-radius: 14px; border: 1px solid #E6E1D8; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #F5F1EA; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.15rem; color: #2C2A29; margin: 0 0 0.2rem 0;">Creator Directory</h2>
                            <div style="font-size: 0.8rem; color: #736E68;">Search, inspect, and manage tenant workspaces.</div>
                        </div>

                        <!-- Filter & Search Controls -->
                        <div style="display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;">
                            <input 
                                type="text" 
                                id="admin-search-input" 
                                placeholder="Search by name, email, or @handle..." 
                                value="${this.searchQuery}"
                                oninput="adminView.handleSearch(this.value)"
                                style="padding: 0.5rem 0.85rem; font-size: 0.84rem; border-radius: 8px; border: 1.5px solid #E6E1D8; background: #FAF8F5; outline: none; min-width: 250px;"
                            />
                            <select 
                                id="admin-status-filter"
                                onchange="adminView.handleStatusFilter(this.value)"
                                style="padding: 0.5rem 0.85rem; font-size: 0.84rem; border-radius: 8px; border: 1.5px solid #E6E1D8; background: #FAF8F5; outline: none; cursor: pointer;"
                            >
                                <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                                <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Active Only</option>
                                <option value="suspended" ${this.statusFilter === 'suspended' ? 'selected' : ''}>Suspended Only</option>
                            </select>
                        </div>
                    </div>

                    <!-- Table Container -->
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.86rem;">
                            <thead>
                                <tr style="background: #FAF8F5; border-bottom: 1px solid #E6E1D8; color: #736E68; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">
                                    <th style="padding: 0.85rem 1.25rem;">Creator / User</th>
                                    <th style="padding: 0.85rem 1rem;">Role</th>
                                    <th style="padding: 0.85rem 1rem;">Instagram Account</th>
                                    <th style="padding: 0.85rem 1rem;">Rules</th>
                                    <th style="padding: 0.85rem 1rem;">Leads</th>
                                    <th style="padding: 0.85rem 1rem;">Status</th>
                                    <th style="padding: 0.85rem 1rem;">Joined</th>
                                    <th style="padding: 0.85rem 1.25rem; text-align: right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="admin-users-tbody">
                                <tr>
                                    <td colspan="8" style="padding: 2.5rem; text-align: center; color: #736E68;">
                                        <span class="spinner" style="width: 24px; height: 24px; display: inline-block;"></span>
                                        <div style="margin-top: 0.5rem;">Loading user directory...</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    async loadData() {
        this.isLoading = true;
        try {
            const [metricsRes, usersRes, alertsRes] = await Promise.all([
                App.apiCall('GET', '/api/admin/metrics').catch(e => null),
                App.apiCall('GET', `/api/admin/users?search=${encodeURIComponent(this.searchQuery)}`).catch(e => null),
                App.apiCall('GET', '/api/admin/token-alerts').catch(e => null)
            ]);

            if (metricsRes && metricsRes.metrics) {
                this.metrics = metricsRes.metrics;
                this.renderMetrics();
            }

            if (usersRes && usersRes.users) {
                this.users = usersRes.users;
                this.renderUsers();
            }

            if (alertsRes && alertsRes.alerts) {
                this.renderAlerts(alertsRes.alerts);
            }
        } catch (err) {
            console.error('[Admin Load Error]:', err);
            App.showToast('Failed to load admin data: ' + err.message, 'error');
        } finally {
            this.isLoading = false;
        }
    },

    renderMetrics() {
        if (!this.metrics) return;
        const totalUsersEl = document.getElementById('metric-total-users');
        const connectedEl = document.getElementById('metric-connected-accounts');
        const rulesEl = document.getElementById('metric-active-rules');
        const leadsEl = document.getElementById('metric-total-leads');

        if (totalUsersEl) totalUsersEl.textContent = this.metrics.total_users || 0;
        if (connectedEl) connectedEl.textContent = this.metrics.connected_accounts || 0;
        if (rulesEl) rulesEl.textContent = this.metrics.active_rules || 0;
        if (leadsEl) leadsEl.textContent = this.metrics.total_leads || 0;
    },

    renderAlerts(alerts) {
        const container = document.getElementById('admin-token-alerts');
        if (!container) return;

        if (!alerts || alerts.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        container.innerHTML = `
            <div style="padding: 1rem 1.25rem; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; display: flex; align-items: center; gap: 0.85rem;">
                <span style="font-size: 1.4rem;">⚠️</span>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 0.88rem; color: #92400E;">Token Attention Required (${alerts.length})</div>
                    <div style="font-size: 0.8rem; color: #B45309; margin-top: 0.15rem;">
                        The following accounts have tokens expiring soon: 
                        ${alerts.map(a => `<strong>@${a.ig_username}</strong> (${a.email})`).join(', ')}.
                    </div>
                </div>
            </div>
        `;
    },

    renderUsers() {
        const tbody = document.getElementById('admin-users-tbody');
        if (!tbody) return;

        let filtered = this.users || [];
        if (this.statusFilter !== 'all') {
            filtered = filtered.filter(u => u.status === this.statusFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 2.5rem; text-align: center; color: #736E68;">
                        <div style="font-size: 1.2rem; margin-bottom: 0.35rem;">🔍</div>
                        <div style="font-weight: 600;">No creators found</div>
                        <div style="font-size: 0.8rem; color: #A09890; margin-top: 0.2rem;">Try adjusting your search query or filters.</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(user => {
            const isSuper = user.role === 'super_admin';
            const isActive = user.status === 'active';
            const hasIg = !!user.ig_username;
            const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const joinedDate = user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

            return `
                <tr style="border-bottom: 1px solid #F5F1EA; transition: background 0.15s ease;" onmouseover="this.style.background='#FAF8F5'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 1rem 1.25rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 34px; height: 34px; border-radius: 50%; background: #FAF0EC; color: #D97757; font-weight: 800; font-size: 0.82rem; display: flex; align-items: center; justify-content: center; border: 1px solid #E6E1D8; flex-shrink: 0;">
                                ${initials}
                            </div>
                            <div style="overflow: hidden;">
                                <div style="font-weight: 700; color: #2C2A29; line-height: 1.2;">${user.name || 'Unnamed Creator'}</div>
                                <div style="font-size: 0.76rem; color: #736E68; margin-top: 0.15rem;">${user.email}</div>
                            </div>
                        </div>
                    </td>

                    <td style="padding: 1rem;">
                        <span style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; padding: 2px 7px; border-radius: 5px; ${isSuper ? 'background: #FEF3C7; color: #B45309;' : 'background: #FAF0EC; color: #D97757;'}">
                            ${isSuper ? '👑 Super Admin' : 'Creator'}
                        </span>
                    </td>

                    <td style="padding: 1rem;">
                        ${hasIg ? `
                            <div style="display: flex; align-items: center; gap: 0.35rem; font-weight: 700; color: #2C2A29;">
                                <span style="color: #2E7D32; font-size: 0.75rem;">●</span>
                                <span>@${user.ig_username}</span>
                            </div>
                        ` : `
                            <span style="font-size: 0.78rem; color: #A09890; font-style: italic;">Not Connected</span>
                        `}
                    </td>

                    <td style="padding: 1rem;">
                        <span style="font-weight: 700; color: #2C2A29; background: #F5F1EA; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem;">
                            ${user.rules_count || 0}
                        </span>
                    </td>

                    <td style="padding: 1rem;">
                        <span style="font-weight: 700; color: #2E7D32; background: #E8F5E9; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem;">
                            ${user.leads_count || 0}
                        </span>
                    </td>

                    <td style="padding: 1rem;">
                        <span style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; padding: 2px 7px; border-radius: 5px; ${isActive ? 'background: #E8F5E9; color: #2E7D32;' : 'background: #FEE2E2; color: #DC2626;'}">
                            ${isActive ? 'Active' : 'Suspended'}
                        </span>
                    </td>

                    <td style="padding: 1rem; color: #736E68; font-size: 0.8rem;">
                        ${joinedDate}
                    </td>

                    <td style="padding: 1rem 1.25rem; text-align: right;">
                        <div style="display: flex; justify-content: flex-end; gap: 0.45rem; align-items: center;">
                            <!-- Impersonate / Inspect Workspace -->
                            <button 
                                onclick="adminView.impersonateUser(${user.id}, '${(user.name || user.email).replace(/'/g, "\\'")}')"
                                title="Inspect this creator's automations & workspace"
                                class="btn btn-secondary"
                                style="padding: 0.35rem 0.65rem; font-size: 0.76rem; font-weight: 700; display: flex; align-items: center; gap: 0.25rem;"
                            >
                                <span>👁️</span> View
                            </button>

                            <!-- Toggle Suspend / Activate (Only for non-super admins) -->
                            ${!isSuper ? `
                                <button 
                                    onclick="adminView.toggleStatus(${user.id}, '${isActive ? 'suspended' : 'active'}')"
                                    title="${isActive ? 'Suspend User Access' : 'Activate User Access'}"
                                    class="btn btn-secondary"
                                    style="padding: 0.35rem 0.65rem; font-size: 0.76rem; font-weight: 700; color: ${isActive ? '#DC2626' : '#2E7D32'};"
                                >
                                    ${isActive ? 'Pause' : 'Activate'}
                                </button>
                            ` : ''}

                            <!-- Delete User Workspace (Only for non-super admins) -->
                            ${!isSuper ? `
                                <button 
                                    onclick="adminView.deleteUser(${user.id}, '${(user.name || user.email).replace(/'/g, "\\'")}')"
                                    title="Delete User Workspace"
                                    class="btn btn-secondary"
                                    style="padding: 0.35rem 0.55rem; font-size: 0.76rem; font-weight: 700; color: #DC2626;"
                                >
                                    🗑️
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    handleSearch(query) {
        this.searchQuery = query;
        this.renderUsers();
    },

    handleStatusFilter(status) {
        this.statusFilter = status;
        this.renderUsers();
    },

    impersonateUser(userId, userName) {
        App.impersonateUser(userId, userName);
    },

    async toggleStatus(userId, newStatus) {
        try {
            const res = await App.apiCall('POST', `/api/admin/users/${userId}/status`, { status: newStatus });
            App.showToast(res.message || `User status updated to ${newStatus}`, 'success');
            await this.loadData();
        } catch (err) {
            App.showToast(err.message || 'Failed to update status', 'error');
        }
    },

    async deleteUser(userId, userName) {
        if (!confirm(`Are you sure you want to permanently delete workspace for "${userName}"? This will delete their connected automations and data.`)) {
            return;
        }

        try {
            const res = await App.apiCall('DELETE', `/api/admin/users/${userId}`);
            App.showToast(res.message || 'User deleted successfully', 'success');
            await this.loadData();
        } catch (err) {
            App.showToast(err.message || 'Failed to delete user', 'error');
        }
    },

    async refresh(isSilent = true) {
        if (!isSilent) App.showToast('Refreshing Super Admin telemetry...', 'info');
        await this.loadData();
    }
};

window.adminView = adminView;
window.admin = adminView;
