// App core logic
const App = {
    state: {
        password: sessionStorage.getItem('dashboard_password') || null,
        currentView: window.location.hash.slice(1) || 'dashboard',
        pollingInterval: null
    },

    // Dynamic API Base URL for Vercel (Frontend) -> Render (Backend) cross-deployment
    getApiUrl(path) {
        const baseUrl = window.API_BASE_URL || '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
    },

    elements: {
        loginScreen: document.getElementById('login-screen'),
        loginForm: document.getElementById('login-form'),
        passwordInput: document.getElementById('password'),
        dashboard: document.getElementById('dashboard'),
        viewContainer: document.getElementById('view-container'),
        navItems: document.querySelectorAll('.nav-item'),
        logoutBtn: document.getElementById('logout-btn'),
        toastContainer: document.getElementById('toast-container'),
        modalContainer: document.getElementById('modal-container'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        closeModalBtn: document.getElementById('close-modal-btn')
    },

    init() {
        this.bindEvents();
        if (this.state.password) {
            this.checkAuth();
        } else {
            this.showLogin();
        }
    },

    bindEvents() {
        this.elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pwd = this.elements.passwordInput.value;
            await this.login(pwd);
        });

        this.elements.logoutBtn.addEventListener('click', () => this.logout());
        
        window.addEventListener('hashchange', () => {
            const newView = window.location.hash.slice(1);
            if (newView && newView !== this.state.currentView) {
                this.navigate(newView);
            }
        });

        this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.elements.modalContainer.querySelector('.modal-backdrop').addEventListener('click', () => this.closeModal());
    },

    async login(password) {
        try {
            const btn = this.elements.loginForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner"></span>';
            btn.disabled = true;

            const res = await fetch(this.getApiUrl('/api/status'), {
                headers: { 'Authorization': `Bearer ${password}` }
            });
            
            if (res.ok) {
                this.state.password = password;
                sessionStorage.setItem('dashboard_password', password);
                this.showToast('Login successful', 'success');
                this.showDashboard();
            } else {
                this.showToast('Invalid password', 'error');
            }
        } catch (err) {
            this.showToast('Connection error', 'error');
        } finally {
            const btn = this.elements.loginForm.querySelector('button');
            btn.innerHTML = '<span>Login</span>';
            btn.disabled = false;
        }
    },

    async checkAuth() {
        try {
            const res = await fetch(this.getApiUrl('/api/status'), {
                headers: { 'Authorization': `Bearer ${this.state.password}` }
            });
            if (res.ok) {
                this.showDashboard();
            } else {
                this.logout();
            }
        } catch (err) {
            this.showToast('Connection error. Please try again later.', 'error');
        }
    },

    logout() {
        this.state.password = null;
        sessionStorage.removeItem('dashboard_password');
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
        this.navigate(this.state.currentView || 'dashboard');
        
        if (this.state.pollingInterval) clearInterval(this.state.pollingInterval);
        this.state.pollingInterval = setInterval(() => {
            const currentObj = (this.state.currentView === 'history') ? window.monthlyHistory : window[this.state.currentView];
            if (currentObj && typeof currentObj.refresh === 'function') {
                currentObj.refresh();
            }
        }, 10000);
    },

    navigate(view) {
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
            const targetObj = (view === 'history') ? window.monthlyHistory : window[view];
            if (targetObj && typeof targetObj.render === 'function') {
                targetObj.render(this.elements.viewContainer);
            } else {
                this.elements.viewContainer.innerHTML = '<div class="empty-state"><h3>View not found</h3></div>';
            }
        }, 100);
    },

    async apiCall(method, url, body = null) {
        const fullUrl = this.getApiUrl(url);
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.state.password}`
            }
        };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        
        const res = await fetch(fullUrl, options);
        let data = null;
        try { data = await res.json(); } catch(e) {}
        
        if (!res.ok) {
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
