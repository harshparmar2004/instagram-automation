window.rules = {
    async render(container) {
        const mediaId = window.selectedMediaId || 'global';
        
        container.innerHTML = `
            <div class="view" id="rules-view">
                <div class="page-header">
                    <div class="page-title">
                        <h1>Automation Rules</h1>
                        <p>${mediaId === 'global' ? 'Global rules applied to all posts.' : 'Rules for selected media.'}</p>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        ${mediaId !== 'global' ? '<button class="btn btn-secondary mr-2" onclick="App.navigate(\'media\')">Back to Media</button>' : ''}
                        <button class="btn btn-secondary" onclick="rules.openSimulatorModal()">
                            <span>🧪 Test Simulator</span>
                        </button>
                        <button class="btn btn-primary" onclick="rules.openFormModal()">
                            <span>+ Add Rule</span>
                        </button>
                    </div>
                </div>
                <div id="rules-content">
                    <div class="text-center" style="padding:3rem;"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        this.currentMediaId = mediaId;
        await this.loadRules();
    },

    async refresh() {
        if(!document.getElementById('rules-content')) return;
        try {
            const url = this.currentMediaId === 'global' ? '/api/rules?media_id=global' : `/api/rules?media_id=${this.currentMediaId}`;
            this.rulesList = await App.apiCall('GET', url);
            this.renderList();
        } catch(e) {}
    },

    async loadRules() {
        try {
            const url = this.currentMediaId === 'global' ? '/api/rules?media_id=global' : `/api/rules?media_id=${this.currentMediaId}`;
            this.rulesList = await App.apiCall('GET', url);
            this.renderList();
        } catch (err) {
            document.getElementById('rules-content').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Error loading rules</h3>
                    <p>${err.message}</p>
                </div>
            `;
        }
    },

    renderList() {
        const content = document.getElementById('rules-content');
        if (!this.rulesList || this.rulesList.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🤖</div>
                    <h3>No rules yet</h3>
                    <p>Create a rule to automate replies and DMs for this post.</p>
                    <button class="btn btn-primary mt-3" onclick="rules.openFormModal()">Add Rule</button>
                </div>
            `;
            return;
        }

        let html = '<div class="rules-list">';
        this.rulesList.forEach(rule => {
            const badgeClass = rule.action_type === 'direct_dm' ? 'badge-blue' : 
                               rule.action_type === 'link_dm' ? 'badge-green' : 'badge-purple';
                               
            const typeLabel = rule.action_type.replace('_', ' ').toUpperCase();
            const delayText = rule.delay_seconds ? ` (${rule.delay_seconds}s delay)` : '';

            let variationsCount = 0;
            if (rule.variations_json) {
                try {
                    const parsed = JSON.parse(rule.variations_json);
                    if (Array.isArray(parsed)) variationsCount = parsed.length;
                } catch(e) {}
            }

            html += `
                <div class="card rule-card">
                    <div class="rule-info">
                        <div class="rule-header">
                            <span class="keyword-badge">"${rule.trigger_word}"</span>
                            <span class="badge ${badgeClass}">${typeLabel}${delayText}</span>
                            ${variationsCount > 0 ? `<span class="badge badge-gray">🎲 ${variationsCount + 1} DM Variations</span>` : ''}
                        </div>
                        <div class="rule-response">
                            Response DM: <em>"${rule.response_text}"</em>
                        </div>
                        ${rule.public_reply ? `<div class="rule-response text-muted" style="font-size:0.8rem; margin-top:4px;">Public Comment Reply: "${rule.public_reply}"</div>` : ''}
                    </div>
                    <div class="rule-actions">
                        <label class="toggle-switch">
                            <input type="checkbox" ${rule.is_active ? 'checked' : ''} onchange="rules.toggleRule('${rule.id}', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="btn btn-secondary btn-sm" onclick="rules.openFormModal('${rule.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="rules.deleteRule('${rule.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        content.innerHTML = html;
    },

    async toggleRule(id, isActive) {
        try {
            await App.apiCall('PATCH', `/api/rules/${id}/toggle`, { is_active: isActive });
            App.showToast(`Rule ${isActive ? 'enabled' : 'disabled'}`, 'success');
        } catch (err) {
            App.showToast('Failed to toggle rule', 'error');
            this.loadRules();
        }
    },

    async deleteRule(id) {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            await App.apiCall('DELETE', `/api/rules/${id}`);
            App.showToast('Rule deleted', 'success');
            if (window.workflows && typeof window.workflows.refresh === 'function') window.workflows.refresh();
            this.loadRules();
        } catch (err) {
            App.showToast('Failed to delete rule', 'error');
        }
    },

    async openFormModal(id = null) {
        let rule = { action_type: 'link_dm', trigger_word: '', response_text: '', link_url: '', follow_prompt: '', public_reply: '', delay_seconds: 0, variations_json: '[]' };
        if (id && this.rulesList) {
            rule = this.rulesList.find(r => r.id == id) || rule;
        }

        let mediaOptions = '<option value="global">🌐 All Posts & Reels (Global Rule)</option>';
        try {
            const mediaList = await App.apiCall('GET', '/api/media');
            if (Array.isArray(mediaList)) {
                mediaList.forEach(m => {
                    const selected = rule.media_id == m.id ? 'selected' : '';
                    const captionCut = m.caption ? (m.caption.slice(0, 45) + '...') : 'Untitled Post';
                    mediaOptions += `<option value="${m.id}" ${selected}>🎬 ${m.media_type}: ${captionCut}</option>`;
                });
            }
        } catch(e) {}

        let variationsLines = '';
        if (rule.variations_json) {
            try {
                const parsed = JSON.parse(rule.variations_json);
                if (Array.isArray(parsed)) variationsLines = parsed.join('\n');
            } catch(e) {}
        }

        const html = `
            <form id="rule-form">
                <input type="hidden" id="rule_id" value="${id || ''}">
                
                <div class="form-group">
                    <label>1. Apply to Which Post or Reel?</label>
                    <select id="selected_media_id" class="select">
                        ${mediaOptions}
                    </select>
                </div>

                <div class="form-group">
                    <label>2. When Someone Comments This Word:</label>
                    <input type="text" id="trigger_word" class="input" placeholder="e.g. LINK (or separate multiple with commas: LINK, URL, PDF)" value="${rule.trigger_word}" required>
                </div>

                <div class="form-group">
                    <label>3. What Action Should Happen?</label>
                    <select id="action_type" class="select" onchange="rules.onActionTypeChange(this.value)">
                        <option value="link_dm" ${rule.action_type === 'link_dm' ? 'selected' : ''}>🔗 Send a DM with a clickable link</option>
                        <option value="direct_dm" ${rule.action_type === 'direct_dm' ? 'selected' : ''}>💬 Send a plain text message DM</option>
                        <option value="follow_first" ${rule.action_type === 'follow_first' ? 'selected' : ''}>🔒 Ask them to follow first before unlocking link</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>4. Message Sent to Followers in DM:</label>
                    <textarea id="response_text" class="textarea" placeholder="e.g. Thanks for commenting! Here is your free guide..." required>${rule.response_text}</textarea>
                </div>

                <div id="link_url_group" class="form-group ${rule.action_type === 'direct_dm' ? 'hidden' : ''}">
                    <label>Link / PDF Website URL:</label>
                    <input type="url" id="link_url" class="input" placeholder="https://example.com/guide.pdf" value="${rule.link_url || ''}">
                </div>
                
                <div id="follow_prompt_group" class="form-group ${rule.action_type !== 'follow_first' ? 'hidden' : ''}">
                    <label>Follow Prompt Message (Sent if they don't follow yet):</label>
                    <textarea id="follow_prompt" class="textarea" placeholder="Please follow us first to unlock the link!">${rule.follow_prompt || 'Please follow us first to unlock the link!'}</textarea>
                </div>

                <div style="display:flex; gap: 1rem;">
                    <div class="form-group" style="flex:1;">
                        <label>Send Delay</label>
                        <select id="delay_seconds" class="select">
                            <option value="0" ${rule.delay_seconds == 0 ? 'selected' : ''}>Instant (0s)</option>
                            <option value="10" ${rule.delay_seconds == 10 ? 'selected' : ''}>10 seconds</option>
                            <option value="30" ${rule.delay_seconds == 30 ? 'selected' : ''}>30 seconds</option>
                            <option value="60" ${rule.delay_seconds == 60 ? 'selected' : ''}>1 minute</option>
                        </select>
                    </div>

                    <div class="form-group" style="flex:1;">
                        <label>Public Comment Reply (Optional)</label>
                        <input type="text" id="public_reply" class="input" placeholder="e.g. Check your DMs! 📩" value="${rule.public_reply || ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label>Message Variations <span class="text-muted" style="font-weight:normal">(Optional anti-spam rotation, 1 per line)</span></label>
                    <textarea id="variations_input" class="textarea" style="min-height:60px;" placeholder="Variation 2: Thanks for commenting! Grab your link here...">${variationsLines}</textarea>
                </div>
                
                <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Automation</button>
                </div>
            </form>
        `;

        App.openModal(id ? 'Edit Automation' : 'New Automation', html);
        
        document.getElementById('rule-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            this.saveRule();
        });
    },

    openSimulatorModal() {
        const html = `
            <div style="padding: 0.5rem 0;">
                <p class="text-muted" style="margin-bottom: 1rem;">Test how your active automation rules handle comments in real-time.</p>
                <div class="form-group">
                    <label>Simulated Comment Text</label>
                    <input type="text" id="sim_comment" class="input" placeholder="e.g. Can I get the LINK please?">
                </div>
                <button type="button" class="btn btn-primary w-full" onclick="rules.runSimulation()">Test Trigger Match</button>

                <div id="sim-result" style="margin-top: 1.5rem; display: none;"></div>
            </div>
        `;
        App.openModal('🧪 Rule Test Simulator', html);
    },

    async runSimulation() {
        const commentText = document.getElementById('sim_comment').value;
        if(!commentText) {
            App.showToast('Please enter a comment text', 'error');
            return;
        }

        const resultDiv = document.getElementById('sim-result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="spinner"></div> Testing...';

        try {
            const data = await App.apiCall('POST', '/api/rules/test', {
                comment_text: commentText,
                media_id: this.currentMediaId === 'global' ? null : this.currentMediaId
            });

            if(data.matched) {
                resultDiv.innerHTML = `
                    <div style="padding:1rem; background:rgba(46,125,50,0.1); border:1px solid rgba(46,125,50,0.25); border-radius:var(--radius-md);">
                        <strong class="text-success">✅ Match Found!</strong>
                        <div style="margin-top:0.5rem; font-size:0.9rem;">
                            <div><strong>Matched Keyword:</strong> "${data.rule.trigger_keyword}"</div>
                            <div><strong>Action Type:</strong> ${data.rule.action_type}</div>
                            <div><strong>Send Delay:</strong> ${data.rule.delay_seconds || 0} seconds</div>
                            <div><strong>Primary DM:</strong> "${data.rule.response_text}"</div>
                            ${data.rule.public_reply ? `<div><strong>Public Reply:</strong> "${data.rule.public_reply}"</div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div style="padding:1rem; background:rgba(217,119,6,0.1); border:1px solid rgba(217,119,6,0.25); border-radius:var(--radius-md);">
                        <strong class="text-warning">⚠️ No Rule Matched</strong>
                        <div style="margin-top:0.5rem; font-size:0.85rem;" class="text-muted">${data.message}</div>
                    </div>
                `;
            }
        } catch(e) {
            resultDiv.innerHTML = `<div class="text-error">Error: ${e.message}</div>`;
        }
    },

    onActionTypeChange(val) {
        const linkGroup = document.getElementById('link_url_group');
        const followGroup = document.getElementById('follow_prompt_group');
        
        if (val === 'direct_dm') {
            linkGroup.classList.add('hidden');
            followGroup.classList.add('hidden');
        } else if (val === 'link_dm') {
            linkGroup.classList.remove('hidden');
            followGroup.classList.add('hidden');
        } else if (val === 'follow_first') {
            linkGroup.classList.remove('hidden');
            followGroup.classList.remove('hidden');
        }
    },

    async saveRule() {
        const id = document.getElementById('rule_id').value;
        const selectedMediaId = document.getElementById('selected_media_id')?.value || this.currentMediaId;
        const variationsText = document.getElementById('variations_input').value || '';
        const variationsArray = variationsText.split('\n').map(v => v.trim()).filter(Boolean);

        const payload = {
            media_id: selectedMediaId,
            trigger_word: document.getElementById('trigger_word').value,
            action_type: document.getElementById('action_type').value,
            response_text: document.getElementById('response_text').value,
            link_url: document.getElementById('link_url').value,
            follow_prompt: document.getElementById('follow_prompt').value,
            public_reply: document.getElementById('public_reply').value,
            delay_seconds: parseInt(document.getElementById('delay_seconds').value || 0),
            variations_json: JSON.stringify(variationsArray),
            is_active: true
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/rules/${id}` : '/api/rules';

        try {
            await App.apiCall(method, url, payload);
            App.showToast('Automation saved successfully', 'success');
            App.closeModal();
            if (window.workflows && typeof window.workflows.refresh === 'function') window.workflows.refresh();
            if (typeof this.loadRules === 'function') this.loadRules();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }
};
