// App core logic - Multi-Tenant Creator Studio & Super Admin
const App = {
    state: {
        token: sessionStorage.getItem('auth_token') || sessionStorage.getItem('dashboard_password') || null,
        user: JSON.parse(sessionStorage.getItem('auth_user') || 'null'),
        impersonateUserId: sessionStorage.getItem('impersonate_user_id') || null,
        impersonateUserName: sessionStorage.getItem('impersonate_user_name') || null,
        currentView: window.location.hash.slice(1) || 'dashboard',
        pollingInterval: null
    },

    // Dynamic API Base URL for cross-deployment
    getApiUrl(path) {
        const baseUrl = window.API_BASE_URL || '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
    },

    elements: {
        loginScreen: document.getElementById('login-screen'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        loginEmailInput: document.getElementById('login-email'),
        passwordInput: document.getElementById('password'),
        dashboard: document.getElementById('dashboard'),
        viewContainer: document.getElementById('view-container'),
        navItems: document.querySelectorAll('.nav-item'),
        navItemAdmin: document.getElementById('nav-item-admin'),
        logoutBtn: document.getElementById('logout-btn'),
        toastContainer: document.getElementById('toast-container'),
        modalContainer: document.getElementById('modal-container'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        sidebarUserBadge: document.getElementById('sidebar-user-badge'),
        sidebarUserHandle: document.getElementById('sidebar-user-handle'),
        sidebarUserName: document.getElementById('sidebar-user-name'),
        sidebarUserEmail: document.getElementById('sidebar-user-email'),
        sidebarRoleBadge: document.getElementById('sidebar-role-badge'),
        impersonationBanner: document.getElementById('impersonation-banner'),
        impersonationUserName: document.getElementById('impersonation-user-name')
    },

    init() {
        this.bindEvents();
        if (this.state.token) {
            this.checkAuth();
        } else {
            this.showLogin();
        }
    },

    bindEvents() {
        // Sign in event
        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = (this.elements.loginEmailInput?.value || '').trim();
                const pwd = this.elements.passwordInput.value;
                await this.login(email, pwd);
            });
        }

        // Register event
        if (this.elements.registerForm) {
            this.elements.registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('reg-name').value.trim();
                const email = document.getElementById('reg-email').value.trim();
                const pwd = document.getElementById('reg-password').value;
                await this.register(name, email, pwd);
            });
        }

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => this.logout());
        }
        
        window.addEventListener('hashchange', () => {
            const newView = window.location.hash.slice(1);
            if (newView && newView !== this.state.currentView) {
                this.navigate(newView);
            }
        });

        if (this.elements.closeModalBtn) {
            this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        if (this.elements.modalContainer) {
            this.elements.modalContainer.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeModal());
        }
    },

    async login(email, password) {
        const btn = this.elements.loginForm.querySelector('button');
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Signing In...';
        btn.disabled = true;

        try {
            // Auto fallback: if email omitted or just a password entered, try admin email
            const targetEmail = email || (password === 'admin' || password === 'changeme' ? 'admin@instaauto.app' : '');
            
            const res = await fetch(this.getApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail, password })
            });

            const data = await res.json();

            if (res.ok && data.token) {
                this.state.token = data.token;
                this.state.user = data.user;
                sessionStorage.setItem('auth_token', data.token);
                sessionStorage.setItem('dashboard_password', data.token);
                sessionStorage.setItem('auth_user', JSON.stringify(data.user));

                this.showToast(`Welcome back, ${data.user.name || 'Creator'}!`, 'success');
                this.showDashboard();
            } else {
                // Fallback attempt for legacy single password token
                const legacyRes = await fetch(this.getApiUrl('/api/status'), {
                    headers: { 'Authorization': `Bearer ${password}` }
                });
                if (legacyRes.ok) {
                    this.state.token = password;
                    this.state.user = { name: 'Super Admin', email: 'admin@instaauto.app', role: 'super_admin' };
                    sessionStorage.setItem('auth_token', password);
                    sessionStorage.setItem('dashboard_password', password);
                    sessionStorage.setItem('auth_user', JSON.stringify(this.state.user));
                    this.showToast('Logged in successfully', 'success');
                    this.showDashboard();
                } else {
                    this.showToast(data.error || 'Invalid email or password', 'error');
                }
            }
        } catch (err) {
            console.error('[Login Error]:', err);
            this.showToast('Connection error. Could not contact server.', 'error');
        } finally {
            btn.innerHTML = origHtml;
            btn.disabled = false;
        }
    },

    async register(name, email, password) {
        const btn = this.elements.registerForm.querySelector('button');
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Creating Account...';
        btn.disabled = true;

        try {
            const res = await fetch(this.getApiUrl('/api/auth/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await res.json();

            if (res.ok && data.token) {
                this.state.token = data.token;
                this.state.user = data.user;
                sessionStorage.setItem('auth_token', data.token);
                sessionStorage.setItem('dashboard_password', data.token);
                sessionStorage.setItem('auth_user', JSON.stringify(data.user));

                this.showToast(`🎉 Account created! Welcome, ${data.user.name}!`, 'success');
                this.showDashboard();
                // Direct new creators to Connect/Setup page
                this.navigate('setup');
            } else {
                this.showToast(data.error || 'Registration failed', 'error');
            }
        } catch (err) {
            console.error('[Register Error]:', err);
            this.showToast('Connection error during registration', 'error');
        } finally {
            btn.innerHTML = origHtml;
            btn.disabled = false;
        }
    },

    async checkAuth() {
        try {
            const res = await fetch(this.getApiUrl('/api/auth/me'), {
                headers: { 'Authorization': `Bearer ${this.state.token}` }
            });

            if (res.ok) {
                const data = await res.json();
                this.state.user = data.user;
                sessionStorage.setItem('auth_user', JSON.stringify(data.user));
                this.showDashboard();
            } else {
                // Try legacy check
                const legacyRes = await fetch(this.getApiUrl('/api/status'), {
                    headers: { 'Authorization': `Bearer ${this.state.token}` }
                });
                if (legacyRes.ok) {
                    if (!this.state.user) {
                        this.state.user = { name: 'Super Admin', email: 'admin@instaauto.app', role: 'super_admin' };
                    }
                    this.showDashboard();
                } else {
                    this.logout();
                }
            }
        } catch (err) {
            console.warn('[CheckAuth Notice]:', err.message);
            // Offline or intermittent connection - allow cached dashboard view
            if (this.state.user) {
                this.showDashboard();
            } else {
                this.showLogin();
            }
        }
    },

    updateUserBadge() {
        const user = this.state.user;
        if (!user) return;

        if (this.elements.sidebarUserName) {
            this.elements.sidebarUserName.textContent = user.name || 'Creator';
        }
        if (this.elements.sidebarUserEmail) {
            this.elements.sidebarUserEmail.textContent = user.email || '';
        }
        if (this.elements.sidebarRoleBadge) {
            const isSuper = user.role === 'super_admin';
            this.elements.sidebarRoleBadge.textContent = isSuper ? '👑 Admin' : 'Creator';
            this.elements.sidebarRoleBadge.style.background = isSuper ? '#FEF3C7' : '#FAF0EC';
            this.elements.sidebarRoleBadge.style.color = isSuper ? '#B45309' : '#D97757';
        }

        // Handle connected Instagram handle display
        const igHandle = user.instagram?.username || user.ig_username;
        if (this.elements.sidebarUserHandle) {
            this.elements.sidebarUserHandle.textContent = igHandle ? `@${igHandle}` : '@not_connected';
        }

        // Show/hide Super Admin tab
        if (this.elements.navItemAdmin) {
            if (user.role === 'super_admin') {
                this.elements.navItemAdmin.style.display = 'flex';
            } else {
                this.elements.navItemAdmin.style.display = 'none';
            }
        }

        // Impersonation banner check
        if (this.elements.impersonationBanner) {
            if (this.state.impersonateUserId) {
                this.elements.impersonationBanner.style.display = 'block';
                if (this.elements.impersonationUserName) {
                    this.elements.impersonationUserName.textContent = this.state.impersonateUserName || `User #${this.state.impersonateUserId}`;
                }
            } else {
                this.elements.impersonationBanner.style.display = 'none';
            }
        }
    },

    impersonateUser(userId, userName = '') {
        this.state.impersonateUserId = String(userId);
        this.state.impersonateUserName = userName;
        sessionStorage.setItem('impersonate_user_id', String(userId));
        sessionStorage.setItem('impersonate_user_name', userName);
        this.showToast(`Switched into ${userName || 'user'}'s workspace`, 'info');
        this.updateUserBadge();
        this.navigate('dashboard');
    },

    exitImpersonation() {
        this.state.impersonateUserId = null;
        this.state.impersonateUserName = null;
        sessionStorage.removeItem('impersonate_user_id');
        sessionStorage.removeItem('impersonate_user_name');
        this.showToast('Exited impersonation. Back to Super Admin.', 'info');
        this.updateUserBadge();
        this.navigate('admin');
    },

    async logout() {
        try {
            if (this.state.token) {
                fetch(this.getApiUrl('/api/auth/logout'), {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.state.token}` }
                }).catch(() => {});
            }
        } catch (e) {}

        this.state.token = null;
        this.state.user = null;
        this.state.impersonateUserId = null;
        this.state.impersonateUserName = null;
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('dashboard_password');
        sessionStorage.removeItem('auth_user');
        sessionStorage.removeItem('impersonate_user_id');
        sessionStorage.removeItem('impersonate_user_name');

        this.showLogin();
        window.location.hash = '';
    },

    showLogin() {
        this.elements.dashboard.classList.add('hidden');
        this.elements.loginScreen.classList.remove('hidden');
        if (this.state.pollingInterval) clearInterval(this.state.pollingInterval);
    },

    showDashboard() {
        this.elements.loginScreen.classList.add('hidden');
        this.elements.dashboard.classList.remove('hidden');
        this.updateUserBadge();
        this.navigate(this.state.currentView || 'dashboard');
        
        if (this.state.pollingInterval) clearInterval(this.state.pollingInterval);
        this.state.pollingInterval = setInterval(() => {
            let currentObj = window[this.state.currentView];
            if (this.state.currentView === 'history') currentObj = window.monthlyHistory;
            if (this.state.currentView === 'about') currentObj = window.aboutHandbook;
            if (this.state.currentView === 'admin') currentObj = window.adminView;

            if (currentObj && typeof currentObj.refresh === 'function') {
                currentObj.refresh();
            }
        }, 15000);
    },

    navigate(view) {
        // If navigating to admin but not super admin, bounce to dashboard
        if (view === 'admin' && this.state.user?.role !== 'super_admin') {
            view = 'dashboard';
        }

        this.state.currentView = view;
        window.location.hash = view;
        
        this.elements.navItems.forEach(item => {
            if (item.dataset.view === view) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        this.elements.viewContainer.innerHTML = '<div class="text-center" style="margin-top:4rem"><div class="spinner" style="width:40px;height:40px"></div></div>';
        
        setTimeout(() => {
            let targetObj = window[view];
            if (view === 'history') targetObj = window.monthlyHistory;
            if (view === 'about') targetObj = window.aboutHandbook;
            if (view === 'admin') targetObj = window.adminView;

            if (targetObj && typeof targetObj.render === 'function') {
                targetObj.render(this.elements.viewContainer);
            } else {
                this.elements.viewContainer.innerHTML = '<div class="empty-state"><h3>View not found</h3></div>';
            }
        }, 100);
    },

    async apiCall(method, url, body = null) {
        const fullUrl = this.getApiUrl(url);
        const headers = {
            'Authorization': `Bearer ${this.state.token}`
        };

        if (this.state.impersonateUserId) {
            headers['X-Impersonate-User-Id'] = this.state.impersonateUserId;
        }

        const options = {
            method,
            headers
        };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        
        const res = await fetch(fullUrl, options);
        let data = null;
        try { data = await res.json(); } catch(e) {}
        
        if (!res.ok) {
            if (res.status === 401) {
                this.logout();
                throw new Error('Session expired. Please sign in again.');
            }
            throw new Error((data && data.error) ? data.error : `HTTP error! status: ${res.status}`);
        }
        return data;
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        
        toast.innerHTML = `
            <span>${icon}</span>
            <span>${message}</span>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast-fadeOut');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    },

    openModal(title, contentHtml) {
        this.elements.modalTitle.textContent = title;
        this.elements.modalBody.innerHTML = contentHtml;
        this.elements.modalContainer.classList.remove('hidden');
    },

    closeModal() {
        this.elements.modalContainer.classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
window.App = App;
