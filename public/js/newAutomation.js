window['new-automation'] = {
    currentStep: 1,
    selectedMediaId: 'global',
    mediaList: [],
    searchQuery: '',
    step1Filter: 'reels',
    keywordMode: 'specific', // 'specific' or 'any'
    keywordList: ['PLAYBOOK', 'PDF'],
    savedButtonsConfig: {
        gate_type: 'buttons',
        step1_text: "Hey there! Glad you're here ☺️\n\nTap below and I'll send you the access in just a moment ✨",
        step1_button: "Send me the access",
        step2_text: "Almost there !\nPlease visit my profile and tap follow to continue 😄",
        step2_profile_button: "Visit Profile",
        step2_confirm_button: "I'm following ✅",
        step3_text: "Dost appko document bejhdiya hai bahut mehnat sa bnaya hai please follow",
        step3_button: "Click me"
    },

    setKeywordMode(mode) {
        this.keywordMode = mode;
        this.renderStep2(document.getElementById('new-automation-content'));
    },

    addKeyword(word) {
        const input = document.getElementById('input-new-keyword');
        const text = (word !== undefined ? word : (input ? input.value : '')).trim();
        if (!text) return;

        const parts = text.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        parts.forEach(p => {
            if (!this.keywordList.includes(p)) {
                this.keywordList.push(p);
            }
        });

        this.savedKeywords = this.keywordList.join(', ');
        if (input) input.value = '';
        this.renderStep2(document.getElementById('new-automation-content'));
    },

    removeKeyword(index) {
        this.keywordList.splice(index, 1);
        this.savedKeywords = this.keywordList.join(', ');
        this.renderStep2(document.getElementById('new-automation-content'));
    },

    async render(container) {
        container.innerHTML = `
            <div class="view" id="new-automation-view" style="width: 100%; max-width: 1480px; margin: 0 auto;">
                
                <!-- COHESIVE FLOW CONTAINER -->
                <div style="background: #FFFFFF; border-radius: 18px; border: 1px solid var(--border-color); box-shadow: 0 2px 16px rgba(0,0,0,0.03); overflow: hidden; width: 100%;">
                    
                    <!-- HEADER BAR & STEPPER INDICATOR -->
                    <div style="padding: 1.15rem 1.75rem 0.85rem 1.75rem; background: #FAF8F5; border-bottom: 1px solid var(--border-color);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.85rem;">
                            <div>
                                <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.5rem; letter-spacing: -0.02em; color: var(--text-primary); margin:0;">Create New Automation</h1>
                                <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0.15rem 0 0 0;">Set up automated comment-to-DM responses and deliverable links in 4 easy steps.</p>
                            </div>
                            
                            <!-- ACCELERATOR PRESETS -->
                            <div style="display:flex; gap:0.5rem;">
                                <button type="button" class="btn btn-secondary btn-sm" onclick="window['new-automation'].applyTemplate('pdf')" style="font-size:0.78rem; font-weight:700; background:#FFFFFF; padding:0.35rem 0.75rem;">
                                    Lead E-Book Preset
                                </button>
                                <button type="button" class="btn btn-primary btn-sm" onclick="window['new-automation'].applyTemplate('follow')" style="font-size:0.78rem; font-weight:800; padding:0.35rem 0.75rem;">
                                    Follow First Gate 🔐
                                </button>
                                <button type="button" class="btn btn-secondary btn-sm" onclick="window['new-automation'].applyTemplate('course')" style="font-size:0.78rem; font-weight:700; background:#FFFFFF; padding:0.35rem 0.75rem;">
                                    Course Signup
                                </button>
                            </div>
                        </div>

                        <!-- 4-STEP INDICATOR TABS -->
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.65rem; width: 100%;">
                            <div id="step-tab-1" class="step-tab active" onclick="window['new-automation'].goToStep(1)" style="padding: 0.65rem 0.85rem; border-radius: 10px; background: #FFFFFF; border: 2px solid var(--accent-primary); cursor: pointer; display: flex; align-items: center; gap: 0.6rem;">
                                <div id="step-num-1" style="width: 24px; height: 24px; border-radius: 50%; background: var(--accent-primary); color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.78rem; flex-shrink: 0;">1</div>
                                <div>
                                    <div style="font-size: 0.68rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">STEP 1</div>
                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">Target Reel</div>
                                </div>
                            </div>

                            <div id="step-tab-2" class="step-tab" onclick="window['new-automation'].goToStep(2)" style="padding: 0.65rem 0.85rem; border-radius: 10px; background: #FAF8F5; border: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 0.6rem;">
                                <div id="step-num-2" style="width: 24px; height: 24px; border-radius: 50%; background: var(--border-color); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.78rem; flex-shrink: 0;">2</div>
                                <div>
                                    <div style="font-size: 0.68rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">STEP 2</div>
                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">Trigger Keywords</div>
                                </div>
                            </div>

                            <div id="step-tab-3" class="step-tab" onclick="window['new-automation'].goToStep(3)" style="padding: 0.65rem 0.85rem; border-radius: 10px; background: #FAF8F5; border: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 0.6rem;">
                                <div id="step-num-3" style="width: 24px; height: 24px; border-radius: 50%; background: var(--border-color); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.78rem; flex-shrink: 0;">3</div>
                                <div>
                                    <div style="font-size: 0.68rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">STEP 3</div>
                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">DM & Resource</div>
                                </div>
                            </div>

                            <div id="step-tab-4" class="step-tab" onclick="window['new-automation'].goToStep(4)" style="padding: 0.65rem 0.85rem; border-radius: 10px; background: #FAF8F5; border: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 0.6rem;">
                                <div id="step-num-4" style="width: 24px; height: 24px; border-radius: 50%; background: var(--border-color); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.78rem; flex-shrink: 0;">4</div>
                                <div>
                                    <div style="font-size: 0.68rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">STEP 4</div>
                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">Pacing & Reply</div>
                                </div>
                            </div>
                        </div>

                        <!-- PROGRESS BAR -->
                        <div style="width: 100%; height: 5px; background: var(--border-color); border-radius: 10px; margin-top: 0.65rem; overflow: hidden;">
                            <div id="flow-progress-bar" style="width: 25%; height: 100%; background: var(--accent-primary); transition: width 0.3s ease-in-out;"></div>
                        </div>
                    </div>

                    <!-- STEP BODY CONTENT -->
                    <div id="new-automation-content" style="padding: 1.35rem 1.75rem; width: 100%;">
                        <div class="text-center" style="padding:3rem;"><div class="spinner"></div></div>
                    </div>

                    <!-- VISIBLE ACTION BAR -->
                    <div style="width: 100%; background: #FFFFFF; border-top: 1px solid var(--border-color); padding: 0.85rem 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                        <button type="button" class="btn btn-secondary" onclick="App.navigate('workflows')" style="font-weight: 700; padding: 0.55rem 1.15rem; font-size: 0.88rem;">Cancel</button>

                        <div style="display: flex; gap: 0.65rem;">
                            <button type="button" id="btn-flow-back" class="btn btn-secondary" onclick="window['new-automation'].goToPrevStep()" style="font-weight: 700; font-size: 0.88rem; padding: 0.55rem 1.25rem; display: none;">
                                ← Back
                            </button>

                            <button type="button" id="btn-flow-next" class="btn btn-primary" onclick="window['new-automation'].goToNextStep()" style="font-weight: 800; font-size: 0.88rem; padding: 0.58rem 1.45rem;">
                                Continue to Step 2 →
                            </button>

                            <button type="button" id="btn-flow-deploy" class="btn btn-primary" onclick="window['new-automation'].saveAutomation()" style="font-weight: 800; font-size: 0.9rem; padding: 0.58rem 1.65rem; display: none;">
                                🚀 Deploy Automation
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        `;
        await this.loadPage();
    },

    async loadPage() {
        try {
            this.mediaList = await App.apiCall('GET', '/api/media') || [];
            this.currentStep = 1;
            this.renderStepContent();
        } catch (err) {
            document.getElementById('new-automation-content').innerHTML = `
                <div class="empty-state" style="width:100%;">
                    <h3>Error loading media posts</h3>
                    <p>${err.message}</p>
                    <button class="btn btn-primary" onclick="window['new-automation'].loadPage()">Retry</button>
                </div>
            `;
        }
    },

    goToStep(stepNum) {
        this.currentStep = stepNum;
        this.updateStepperHeader();
        this.renderStepContent();
    },

    goToNextStep() {
        if (this.currentStep === 1 && !this.selectedMediaId) {
            App.showToast('Please select a target post or choose Account-Wide Rule to continue', 'warning');
            return;
        }

        if (this.currentStep === 2 && this.keywordMode !== 'any') {
            const pendingInput = document.getElementById('input-new-keyword');
            if (pendingInput && pendingInput.value.trim()) {
                const parts = pendingInput.value.trim().split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                parts.forEach(p => {
                    if (!this.keywordList.includes(p)) this.keywordList.push(p);
                });
                this.savedKeywords = this.keywordList.join(', ');
            }
            if (this.keywordList.length === 0) {
                App.showToast('Please add at least one keyword, or select "Any Comment" mode', 'warning');
                return;
            }
        }

        if (this.currentStep < 4) {
            this.currentStep += 1;
            this.updateStepperHeader();
            this.renderStepContent();
        }
    },

    goToPrevStep() {
        if (this.currentStep > 1) {
            this.currentStep -= 1;
            this.updateStepperHeader();
            this.renderStepContent();
        }
    },

    updateStepperHeader() {
        for (let i = 1; i <= 4; i++) {
            const tab = document.getElementById(`step-tab-${i}`);
            const num = document.getElementById(`step-num-${i}`);
            if (tab && num) {
                if (i === this.currentStep) {
                    tab.style.background = '#FFFFFF';
                    tab.style.border = '2px solid var(--accent-primary)';
                    num.style.background = 'var(--accent-primary)';
                    num.style.color = '#FFFFFF';
                } else if (i < this.currentStep) {
                    tab.style.background = '#FAF8F5';
                    tab.style.border = '1px solid var(--border-color)';
                    num.style.background = '#2E7D32';
                    num.style.color = '#FFFFFF';
                } else {
                    tab.style.background = '#FAF8F5';
                    tab.style.border = '1px solid var(--border-color)';
                    num.style.background = 'var(--border-color)';
                    num.style.color = 'var(--text-secondary)';
                }
            }
        }

        const progressBar = document.getElementById('flow-progress-bar');
        if (progressBar) progressBar.style.width = `${(this.currentStep / 4) * 100}%`;

        const btnBack = document.getElementById('btn-flow-back');
        const btnNext = document.getElementById('btn-flow-next');
        const btnDeploy = document.getElementById('btn-flow-deploy');

        if (btnBack) btnBack.style.display = this.currentStep > 1 ? 'inline-block' : 'none';

        if (btnNext) {
            if (this.currentStep < 4) {
                btnNext.style.display = 'inline-block';
                btnNext.textContent = `Continue to Step ${this.currentStep + 1} →`;
            } else {
                btnNext.style.display = 'none';
            }
        }

        if (btnDeploy) btnDeploy.style.display = this.currentStep === 4 ? 'inline-block' : 'none';
    },

    renderStepContent() {
        const container = document.getElementById('new-automation-content');
        if (!container) return;

        if (this.currentStep === 1) {
            this.renderStep1(container);
        } else if (this.currentStep === 2) {
            this.renderStep2(container);
        } else if (this.currentStep === 3) {
            this.renderStep3(container);
        } else if (this.currentStep === 4) {
            this.renderStep4(container);
        }
    },

    filterReels(query) {
        this.searchQuery = query || '';
        this.renderStep1(document.getElementById('new-automation-content'));
    },

    setStep1Filter(filter) {
        this.step1Filter = filter;
        this.renderStep1(document.getElementById('new-automation-content'));
    },

    async refreshMedia() {
        const btn = document.getElementById('btn-refresh-step1-reels');
        if (btn) {
            btn.innerHTML = '<span class="spinner"></span> Syncing from Instagram...';
            btn.disabled = true;
        }
        try {
            const res = await App.apiCall('POST', '/api/media/sync');
            this.mediaList = await App.apiCall('GET', '/api/media') || [];
            const count = res.count !== undefined ? res.count : 'latest';
            App.showToast(`✅ Synced ${count} items from Instagram!`, 'success');
            this.renderStep1(document.getElementById('new-automation-content'));
        } catch (err) {
            App.showToast(err.message, 'error');
        } finally {
            if (btn) {
                btn.innerHTML = '<span>🔄 Refresh Latest Reels</span>';
                btn.disabled = false;
            }
        }
    },

    renderStep1(container) {
        let filtered = (this.mediaList || []).filter(m => {
            const cap = (m.caption || '').toLowerCase();
            return !this.searchQuery || cap.includes(this.searchQuery.toLowerCase());
        });

        if (this.step1Filter === 'reels') {
            filtered = filtered.filter(m => 
                m.media_product_type === 'REELS' || m.media_type === 'REEL' || (m.media_type === 'VIDEO' && m.media_product_type !== 'FEED')
            );
        }

        const reelsCount = (this.mediaList || []).filter(m => 
            m.media_product_type === 'REELS' || m.media_type === 'REEL' || (m.media_type === 'VIDEO' && m.media_product_type !== 'FEED')
        ).length;
        const totalCount = (this.mediaList || []).length;

        const isGlobalSelected = String(this.selectedMediaId) === 'global';

        let gridHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.85rem; width: 100%;">
                
                <!-- GLOBAL OPTION -->
                <div class="reel-card-item ${isGlobalSelected ? 'selected' : ''}" onclick="window['new-automation'].selectReel('global', this)" style="
                    border-radius: 14px;
                    border: ${isGlobalSelected ? '2.5px solid var(--accent-primary)' : '1.5px solid var(--border-color)'};
                    outline: ${isGlobalSelected ? '3px solid var(--accent-primary)' : 'none'};
                    outline-offset: ${isGlobalSelected ? '3px' : '0'};
                    background: ${isGlobalSelected ? '#FDF8F6' : '#FFFFFF'};
                    box-shadow: ${isGlobalSelected ? '0 0 0 4px rgba(217, 119, 87, 0.28), 0 8px 24px rgba(217, 119, 87, 0.2)' : '0 1px 4px rgba(0,0,0,0.02)'};
                    cursor: pointer;
                    overflow: hidden;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                ">
                    ${isGlobalSelected ? `<div style="position:absolute; top:8px; right:8px; width:26px; height:26px; border-radius:50%; background:var(--accent-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.85rem; z-index:10; box-shadow:0 2px 8px rgba(0,0,0,0.25); border: 2px solid #FFFFFF;">✓</div>` : ''}
                    
                    <div style="height: 120px; background: linear-gradient(135deg, #FAF8F5 0%, #E6E1D8 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.65rem; text-align: center;">
                        <div style="font-size: 1.5rem; margin-bottom: 0.15rem;">🌐</div>
                        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.88rem; color: var(--accent-primary);">Account-Wide Rule</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.1rem;">Applies to all current & newly posted Reels</div>
                    </div>

                    <div style="padding: 0.75rem; flex: 1;">
                        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.82rem; color: var(--text-primary);">Global Account Rule</div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.15rem; line-height: 1.35;">Triggers on comments across your entire Instagram profile</div>
                    </div>

                    ${isGlobalSelected ? `
                        <div style="background: var(--accent-primary); color: #FFFFFF; font-size: 0.7rem; font-weight: 800; text-align: center; padding: 4px 8px; letter-spacing: 0.04em;">
                            ✓ SELECTED
                        </div>
                    ` : ''}
                </div>
        `;

        filtered.forEach(m => {
            const isSelected = String(this.selectedMediaId) === String(m.id);
            const isReel = m.media_product_type === 'REELS' || m.media_type === 'REEL' || (m.media_type === 'VIDEO' && m.media_product_type !== 'FEED');
            const thumbUrl = m.thumbnail_url || m.media_url || '';
            const captionCut = m.caption ? (m.caption.slice(0, 45) + '...') : 'Instagram Content';
            const comments = m.comments_count || 0;

            gridHtml += `
                <div class="reel-card-item ${isSelected ? 'selected' : ''}" onclick="window['new-automation'].selectReel('${m.id}', this)" style="
                    border-radius: 14px;
                    border: ${isSelected ? '2.5px solid var(--accent-primary)' : '1.5px solid var(--border-color)'};
                    outline: ${isSelected ? '3px solid var(--accent-primary)' : 'none'};
                    outline-offset: ${isSelected ? '3px' : '0'};
                    background: ${isSelected ? '#FDF8F6' : '#FFFFFF'};
                    box-shadow: ${isSelected ? '0 0 0 4px rgba(217, 119, 87, 0.28), 0 8px 24px rgba(217, 119, 87, 0.2)' : '0 1px 4px rgba(0,0,0,0.02)'};
                    cursor: pointer;
                    overflow: hidden;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                ">
                    ${isSelected ? `<div style="position:absolute; top:8px; right:8px; width:26px; height:26px; border-radius:50%; background:var(--accent-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.85rem; z-index:10; box-shadow:0 2px 8px rgba(0,0,0,0.25); border: 2px solid #FFFFFF;">✓</div>` : ''}

                    <!-- 9:16 VERTICAL COVER FOR REELS -->
                    <div style="
                        position: relative;
                        width: 100%;
                        padding-top: ${isReel ? '125%' : '85%'};
                        background-color: #171514;
                        background-size: cover;
                        background-position: center;
                        background-image: url('${thumbUrl}');
                    ">
                        <div style="position: absolute; top: 6px; left: 6px; font-size: 0.65rem; font-weight: 800; color: #FFFFFF; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); padding: 0.2rem 0.5rem; border-radius: 6px; display: flex; align-items: center; gap: 4px;">
                            ${isReel ? '▶ REEL' : '📸 POST'}
                        </div>

                        <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1.25rem 0.5rem 0.4rem 0.5rem; background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%); color: #FFF; font-size: 0.68rem; font-weight: 700;">
                            💬 ${comments} comments
                        </div>
                    </div>

                    <div style="padding: 0.65rem 0.75rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.8rem; color: var(--text-primary); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${captionCut}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.35rem; font-weight: 600;">
                            ${new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    </div>

                    ${isSelected ? `
                        <div style="background: var(--accent-primary); color: #FFFFFF; font-size: 0.7rem; font-weight: 800; text-align: center; padding: 4px 8px; letter-spacing: 0.04em;">
                            ✓ SELECTED
                        </div>
                    ` : ''}
                </div>
            `;
        });

        gridHtml += '</div>';

        container.innerHTML = `
            <div style="width: 100%;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.85rem; flex-wrap:wrap; gap:0.65rem;">
                    <div>
                        <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">Step 1: Pick a Target Reel or Post</h2>
                        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.1rem;">Select which specific Instagram content item this comment-to-DM automation rule will monitor.</p>
                    </div>

                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <!-- INSTANT REFRESH BUTTON -->
                        <button type="button" id="btn-refresh-step1-reels" class="btn btn-secondary btn-sm" onclick="window['new-automation'].refreshMedia()" style="font-weight: 700; font-size: 0.78rem; background: #FFFFFF; border: 1px solid var(--border-color); padding: 0.45rem 0.85rem;" title="Fetch newly posted Reels from Instagram immediately">
                            <span>🔄 Refresh Latest Reels</span>
                        </button>

                        <div style="min-width: 180px;">
                            <input type="text" value="${this.searchQuery}" onkeyup="window['new-automation'].filterReels(this.value)" placeholder="Search reels..." style="padding: 0.42rem 0.75rem; font-size: 0.8rem; font-weight: 500; border-radius: 8px; border: 1px solid var(--border-color); background: #FAF8F5; outline: none; width: 100%;">
                        </div>
                    </div>
                </div>

                <!-- SUB TABS FOR STEP 1 -->
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
                    <button type="button" onclick="window['new-automation'].setStep1Filter('reels')" style="padding: 0.35rem 0.85rem; font-size: 0.78rem; font-weight: ${this.step1Filter === 'reels' ? '800' : '600'}; border-radius: 8px; background: ${this.step1Filter === 'reels' ? 'var(--accent-primary)' : '#FFFFFF'}; color: ${this.step1Filter === 'reels' ? '#FFFFFF' : 'var(--text-secondary)'}; border: ${this.step1Filter === 'reels' ? 'none' : '1px solid var(--border-color)'}; cursor: pointer;">
                        🎬 Reels Only (${reelsCount})
                    </button>
                    <button type="button" onclick="window['new-automation'].setStep1Filter('all')" style="padding: 0.35rem 0.85rem; font-size: 0.78rem; font-weight: ${this.step1Filter === 'all' ? '800' : '600'}; border-radius: 8px; background: ${this.step1Filter === 'all' ? 'var(--accent-primary)' : '#FFFFFF'}; color: ${this.step1Filter === 'all' ? '#FFFFFF' : 'var(--text-secondary)'}; border: ${this.step1Filter === 'all' ? 'none' : '1px solid var(--border-color)'}; cursor: pointer;">
                        📁 All Content (${totalCount})
                    </button>
                </div>

                <div style="max-height: 380px; overflow-y: auto; border-radius: 12px; border: 1px solid var(--border-color); padding: 0.85rem; background: #FAF8F5;">
                    ${gridHtml}
                </div>
            </div>
        `;
    },

    selectReel(id, el) {
        this.selectedMediaId = String(id);
        this.renderStep1(document.getElementById('new-automation-content'));
    },

    renderStep2(container) {
        const isAny = this.keywordMode === 'any';

        let chipsHtml = '';
        if (this.keywordList && this.keywordList.length > 0) {
            chipsHtml = this.keywordList.map((kw, idx) => `
                <div style="display: inline-flex; align-items: center; gap: 8px; background: #FFFFFF; border: 1.5px solid var(--accent-primary); border-radius: 8px; padding: 6px 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
                    <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.85rem; color: var(--accent-primary);">${kw}</span>
                    <button type="button" onclick="window['new-automation'].removeKeyword(${idx})" style="background: none; border: none; cursor: pointer; color: #736E68; font-weight: 800; font-size: 1.05rem; line-height: 1; padding: 0 2px;" title="Remove keyword">×</button>
                </div>
            `).join('');
        } else {
            chipsHtml = `<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">No keywords added yet. Type below and click "+ Add Keyword" (or select "Any Comment" mode).</div>`;
        }

        container.innerHTML = `
            <div style="width: 100%;">
                <div style="margin-bottom: 1.15rem;">
                    <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">Step 2: Trigger Keyword Configuration</h2>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.15rem;">Choose whether to trigger on specific keywords or on every single comment on this Reel.</p>
                </div>

                <!-- 1. TRIGGER MODE SELECTION (SPECIFIC KEYWORDS vs ANY COMMENT) -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.85rem; margin-bottom: 1.25rem;">
                    <div onclick="window['new-automation'].setKeywordMode('specific')" style="
                        padding: 1rem 1.25rem;
                        border-radius: 12px;
                        border: ${!isAny ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'};
                        background: ${!isAny ? '#FDF8F6' : '#FFFFFF'};
                        box-shadow: ${!isAny ? '0 2px 10px rgba(217, 119, 87, 0.12)' : 'none'};
                        cursor: pointer;
                        display: flex;
                        align-items: flex-start;
                        gap: 0.85rem;
                        transition: all 0.15s ease;
                    ">
                        <input type="radio" name="trigger_mode" ${!isAny ? 'checked' : ''} style="accent-color: var(--accent-primary); margin-top: 3px; cursor: pointer;">
                        <div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.92rem; color: var(--text-primary);">🎯 Specific Keyword(s) Only</div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; line-height: 1.4;">Only followers who comment your chosen keywords (e.g. PLAYBOOK, PDF) receive the automated DM.</div>
                        </div>
                    </div>

                    <div onclick="window['new-automation'].setKeywordMode('any')" style="
                        padding: 1rem 1.25rem;
                        border-radius: 12px;
                        border: ${isAny ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'};
                        background: ${isAny ? '#FDF8F6' : '#FFFFFF'};
                        box-shadow: ${isAny ? '0 2px 10px rgba(217, 119, 87, 0.12)' : 'none'};
                        cursor: pointer;
                        display: flex;
                        align-items: flex-start;
                        gap: 0.85rem;
                        transition: all 0.15s ease;
                    ">
                        <input type="radio" name="trigger_mode" ${isAny ? 'checked' : ''} style="accent-color: var(--accent-primary); margin-top: 3px; cursor: pointer;">
                        <div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.92rem; color: var(--text-primary);">⚡ Any Comment (Every Comment)</div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; line-height: 1.4;">Triggers the automated DM for EVERY comment posted on this Reel, no matter what they write!</div>
                        </div>
                    </div>
                </div>

                ${!isAny ? `
                    <!-- 2. INTERACTIVE KEYWORD INPUT & CHIPS -->
                    <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
                        
                        <!-- ADD KEYWORD BAR WITH CLEAR LABEL -->
                        <div style="display: flex; flex-direction: column; gap: 0.45rem;">
                            <label for="input-new-keyword" style="font-size: 0.85rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                                <span>Type Keyword Here:</span>
                                <span style="font-size: 0.76rem; font-weight: 600; color: var(--text-secondary);">(Type word and press Enter or click + Add Keyword)</span>
                            </label>
                            <div style="display: flex; gap: 0.65rem; align-items: center;">
                                <input type="text" id="input-new-keyword" placeholder="e.g. PLAYBOOK, GUIDE, LINK, PDF..." onkeydown="if(event.key==='Enter'){event.preventDefault(); window['new-automation'].addKeyword();}" style="flex: 1; padding: 0.75rem 1.1rem; font-size: 0.92rem; font-weight: 600; border-radius: 10px; border: 1.5px solid #D1C9BE; background: #FAF8F5; outline: none;">
                                <button type="button" class="btn btn-primary" onclick="window['new-automation'].addKeyword()" style="padding: 0.75rem 1.4rem; font-size: 0.88rem; font-weight: 800; border-radius: 10px; white-space: nowrap;">
                                    + Add Keyword
                                </button>
                            </div>
                        </div>

                        <!-- KEYWORD CHIPS CONTAINER BOX -->
                        <div>
                            <label style="font-size: 0.8rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.4rem; display: block;">
                                Active Trigger Keywords (${this.keywordList.length})
                            </label>
                            <div style="min-height: 62px; padding: 0.85rem; background: #FAF8F5; border: 1.5px solid #E6E1D8; border-radius: 12px; display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center;">
                                ${chipsHtml}
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.35rem;">Each box above is an individual active trigger keyword. Matching is case-insensitive.</div>
                        </div>

                        <!-- ONE-CLICK PRESET SUGGESTIONS -->
                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                            <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary);">Popular Presets:</span>
                            <button type="button" onclick="window['new-automation'].addKeyword('PLAYBOOK')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; font-weight: 700; border-radius: 6px; background: #FFFFFF; border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer;">+ PLAYBOOK</button>
                            <button type="button" onclick="window['new-automation'].addKeyword('PDF')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; font-weight: 700; border-radius: 6px; background: #FFFFFF; border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer;">+ PDF</button>
                            <button type="button" onclick="window['new-automation'].addKeyword('LINK')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; font-weight: 700; border-radius: 6px; background: #FFFFFF; border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer;">+ LINK</button>
                            <button type="button" onclick="window['new-automation'].addKeyword('GUIDE')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; font-weight: 700; border-radius: 6px; background: #FFFFFF; border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer;">+ GUIDE</button>
                            <button type="button" onclick="window['new-automation'].addKeyword('COURSE')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; font-weight: 700; border-radius: 6px; background: #FFFFFF; border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer;">+ COURSE</button>
                        </div>

                    </div>
                ` : `
                    <!-- ANY COMMENT MODE ACTIVE ALERT BANNER -->
                    <div style="padding: 1.25rem; background: #FDF8F6; border: 1.5px solid var(--accent-primary); border-radius: 12px; display: flex; gap: 0.85rem; align-items: center;">
                        <div style="font-size: 1.8rem;">⚡</div>
                        <div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.95rem; color: var(--accent-primary);">Universal Comment Trigger Enabled</div>
                            <div style="font-size: 0.84rem; color: var(--text-primary); margin-top: 0.2rem; line-height: 1.45;">
                                InstaAuto will dispatch your automated DM for <strong>ANY comment</strong> left on this Reel. No keyword typing required by your followers!
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;
    },

    // STEP 3: DM & RESOURCE DISPATCH WITH FOLLOW-FIRST GATE WORKFLOW PREVIEW
    renderStep3(container) {
        const actionVal = this.savedActionType || 'link_dm';
        const responseVal = this.savedResponseText || 'Hey! Thanks for commenting. Here is your requested resource link 🚀';
        const linkVal = this.savedLinkUrl || 'https://example.com/guide.pdf';
        const promptVal = this.savedFollowPrompt || 'Thanks for commenting! Please follow @creator.studio first, then reply "I FOLLOWED" in this DM to unlock your link!';

        if (!this.savedButtonsConfig) {
            this.savedButtonsConfig = {
                gate_type: 'buttons',
                step1_text: "Hey there! Glad you're here ☺️\n\nTap below and I'll send you the access in just a moment ✨",
                step1_button: "Send me the access",
                step2_text: "Almost there !\nPlease visit my profile and tap follow to continue 😄",
                step2_profile_button: "Visit Profile",
                step2_confirm_button: "I'm following ✅",
                step3_text: "Dost appko document bejhdiya hai bahut mehnat sa bnaya hai please follow",
                step3_button: "Click me"
            };
        }
        const btnCfg = this.savedButtonsConfig;

        container.innerHTML = `
            <div style="width: 100%;">
                <div style="margin-bottom: 1rem;">
                    <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">Step 3: Direct Message Dispatch & Resource</h2>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.15rem;">Configure the automated response message body and deliverable URL sent to followers.</p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 1.1rem; width: 100%;">
                    
                    <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                        <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">Automation Action Type</label>
                        <select id="auto_action_type" onchange="window['new-automation'].savedActionType=this.value; window['new-automation'].renderStep3(document.getElementById('new-automation-content'))" style="width: 100%; padding: 0.7rem 1rem; font-size: 0.9rem; font-weight: 600; border-radius: 10px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none;">
                            <option value="link_dm" ${actionVal==='link_dm'?'selected':''}>Send DM with Clickable Deliverable Link</option>
                            <option value="follow_first" ${actionVal==='follow_first'?'selected':''}>Ask to Follow First Gate (Follow Verification)</option>
                            <option value="direct_dm" ${actionVal==='direct_dm'?'selected':''}>Send Direct Text Message (No Link)</option>
                        </select>
                    </div>

                    ${actionVal === 'follow_first' ? `
                        <!-- FOLLOW-FIRST GATE WORKFLOW & 3-STEP BUTTON FUNNEL BUILDER -->
                        <div style="padding: 1.15rem; background: #FAF8F5; border: 2px solid var(--accent-primary); border-radius: 14px; box-shadow: 0 4px 14px rgba(217,119,87,0.08);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 1.25rem;">🔐</span>
                                    <div>
                                        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.95rem; font-weight: 800; color: var(--accent-primary); margin: 0;">
                                            Follow-First Gate System Active
                                        </h3>
                                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.1rem 0 0 0;">
                                            Followers must follow your account to unlock your resource.
                                        </p>
                                    </div>
                                </div>
                                <select id="wizard_gate_type_select" onchange="window['new-automation'].savedButtonsConfig.gate_type=this.value; window['new-automation'].renderStep3(document.getElementById('new-automation-content'))" style="padding: 0.4rem 0.8rem; font-size: 0.82rem; font-weight: 700; border-radius: 8px; border: 1px solid #D1C9BE; background: #FFF; outline: none;">
                                    <option value="buttons" ${btnCfg.gate_type !== 'text' ? 'selected' : ''}>🌟 3-Step Interactive Button Funnel (Top Creator Setup)</option>
                                    <option value="text" ${btnCfg.gate_type === 'text' ? 'selected' : ''}>💬 Simple Text Prompt ("DONE")</option>
                                </select>
                            </div>

                            ${btnCfg.gate_type !== 'text' ? `
                            <!-- 3-STEP VISUAL BUTTON FUNNEL PIPELINE -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.65rem; background: #FFFFFF; padding: 0.85rem; border-radius: 10px; border: 1px solid #F2E3D5; margin-bottom: 1rem;">
                                <div style="font-size: 0.78rem;">
                                    <strong style="color: var(--accent-primary);">1. Comment:</strong> Follower comments trigger keyword on your Reel.
                                </div>
                                <div style="font-size: 0.78rem;">
                                    <strong style="color: var(--accent-primary);">2. Hook DM:</strong> Quick Reply button <em>"Send me the access"</em>.
                                </div>
                                <div style="font-size: 0.78rem;">
                                    <strong style="color: var(--accent-primary);">3. Follow Gate:</strong> <em>"Visit Profile"</em> + <em>"I'm following ✅"</em> buttons.
                                </div>
                                <div style="font-size: 0.78rem;">
                                    <strong style="color: #2E7D32;">4. Unlocked:</strong> Deliverable message with <em>"Click me"</em> link button!
                                </div>
                            </div>

                            <!-- STEP 1 CARD -->
                            <div style="background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 10px; padding: 0.9rem 1.1rem; margin-bottom: 0.85rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                    <span style="background: var(--accent-primary); color: #FFF; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">STEP 1</span>
                                    <span style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary);">First DM Sent to Follower (Unlocks 24-hr messaging window)</span>
                                </div>
                                <textarea id="wizard_btn_step1_text" rows="2" onchange="window['new-automation'].savedButtonsConfig.step1_text=this.value" style="width: 100%; padding: 0.65rem 0.9rem; font-size: 0.88rem; font-family: inherit; font-weight: 500; border-radius: 8px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none; margin-bottom: 0.5rem;">${btnCfg.step1_text}</textarea>
                                <div style="display: flex; align-items: center; gap: 0.6rem;">
                                    <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary);">Tappable Button Title:</span>
                                    <input type="text" id="wizard_btn_step1_button" value="${btnCfg.step1_button}" onchange="window['new-automation'].savedButtonsConfig.step1_button=this.value" placeholder="Send me the access" maxlength="20" style="flex: 1; max-width: 250px; padding: 0.4rem 0.75rem; font-size: 0.85rem; font-weight: 700; border-radius: 8px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none;">
                                </div>
                            </div>

                            <!-- STEP 2 CARD -->
                            <div style="background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 10px; padding: 0.9rem 1.1rem; margin-bottom: 0.85rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                    <span style="background: #B45309; color: #FFF; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">STEP 2</span>
                                    <span style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary);">Follow Gate DM (Sent when follower taps "Send me the access")</span>
                                </div>
                                <textarea id="wizard_btn_step2_text" rows="2" onchange="window['new-automation'].savedButtonsConfig.step2_text=this.value" style="width: 100%; padding: 0.65rem 0.9rem; font-size: 0.88rem; font-family: inherit; font-weight: 500; border-radius: 8px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none; margin-bottom: 0.5rem;">${btnCfg.step2_text}</textarea>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
                                    <div>
                                        <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Button 1 (Opens Profile URL):</label>
                                        <input type="text" id="wizard_btn_step2_profile_button" value="${btnCfg.step2_profile_button}" onchange="window['new-automation'].savedButtonsConfig.step2_profile_button=this.value" placeholder="Visit Profile" maxlength="20" style="width: 100%; padding: 0.4rem 0.75rem; font-size: 0.85rem; font-weight: 700; border-radius: 8px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none;">
                                    </div>
                                    <div>
                                        <label style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Button 2 (Follow Confirmation):</label>
                                        <input type="text" id="wizard_btn_step2_confirm_button" value="${btnCfg.step2_confirm_button}" onchange="window['new-automation'].savedButtonsConfig.step2_confirm_button=this.value" placeholder="I'm following ✅" maxlength="20" style="width: 100%; padding: 0.4rem 0.75rem; font-size: 0.85rem; font-weight: 700; border-radius: 8px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none;">
                                    </div>
                                </div>
                            </div>

                            <!-- STEP 3 CARD -->
                            <div style="background: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 10px; padding: 0.9rem 1.1rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                    <span style="background: #15803D; color: #FFF; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">STEP 3</span>
                                    <span style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary);">Deliverable DM (Sent when follower taps "I'm following ✅")</span>
                                </div>
                                <textarea id="wizard_btn_step3_text" rows="2" onchange="window['new-automation'].savedButtonsConfig.step3_text=this.value" style="width: 100%; padding: 0.65rem 0.9rem; font-size: 0.88rem; font-family: inherit; font-weight: 500; border-radius: 8px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none; margin-bottom: 0.5rem;">${btnCfg.step3_text}</textarea>
                                <div style="display: flex; align-items: center; gap: 0.6rem;">
                                    <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary);">Resource Button Title:</span>
                                    <input type="text" id="wizard_btn_step3_button" value="${btnCfg.step3_button}" onchange="window['new-automation'].savedButtonsConfig.step3_button=this.value" placeholder="Click me" maxlength="20" style="flex: 1; max-width: 250px; padding: 0.4rem 0.75rem; font-size: 0.85rem; font-weight: 700; border-radius: 8px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none;">
                                </div>
                            </div>
                            ` : `
                            <!-- SIMPLE TEXT PROMPT -->
                            <div style="margin-top: 0.75rem;">
                                <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem; display: block;">Follow Gate Prompt DM Message</label>
                                <textarea id="auto_follow_prompt" rows="2" onchange="window['new-automation'].savedFollowPrompt=this.value" placeholder="e.g. Thanks for commenting! Please follow @creator.studio first, then reply 'I FOLLOWED' in this DM to unlock your link!" style="width: 100%; padding: 0.75rem 1.1rem; font-size: 0.9rem; font-family: inherit; font-weight: 500; border-radius: 10px; border: 1px solid #D1C9BE; background: #FAF8F5; outline: none; line-height: 1.4;">${promptVal}</textarea>
                            </div>
                            `}
                        </div>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                            <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">DM Message Body</label>
                            <textarea id="auto_response_text" rows="3" onchange="window['new-automation'].savedResponseText=this.value" placeholder="e.g. Thanks for commenting! Here is your requested resource link..." style="width: 100%; padding: 0.75rem 1.1rem; font-size: 0.9rem; font-family: inherit; font-weight: 500; border-radius: 10px; border: 1px solid #D1C9BE; background: #FAF8F5; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03); outline: none; line-height: 1.45;">${responseVal}</textarea>
                        </div>
                    `}

                    ${(actionVal === 'link_dm' || actionVal === 'follow_first') ? `
                        <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                            <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">Deliverable Resource URL (PDF / Guide / Website)</label>
                            <input type="url" id="auto_link_url" value="${linkVal}" onchange="window['new-automation'].savedLinkUrl=this.value" placeholder="https://example.com/guide.pdf" style="width: 100%; padding: 0.75rem 1.1rem; font-size: 0.9rem; font-weight: 500; border-radius: 10px; border: 1px solid #D1C9BE; background: #FAF8F5; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03); outline: none;">
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    renderStep4(container) {
        const delayVal = this.savedDelay || 5;
        const replyVal = this.savedPublicReply || 'Sent! Check your DMs 📩';

        container.innerHTML = `
            <div style="width: 100%;">
                <div style="margin-bottom: 1rem;">
                    <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">Step 4: Anti-Spam Pacing & Public Comment Reply</h2>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.15rem;">Protect account health with delay pacing and boost post engagement with public comment replies.</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; width: 100%;">
                    <div style="padding: 1.15rem; background: #FAF8F5; border: 1px solid var(--border-color); border-radius: 12px;">
                        <label style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary);">Anti-Spam Delay Pacing</label>
                        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.1rem;">Natural delay before sending DM</div>
                        <select id="auto_delay_seconds" onchange="window['new-automation'].savedDelay=parseInt(this.value)" style="width: 100%; padding: 0.65rem 0.95rem; font-size: 0.88rem; font-weight: 600; border-radius: 8px; border: 1px solid #D1C9BE; background: #FFF; marginTop: 0.5rem; outline: none;">
                            <option value="0" ${delayVal===0?'selected':''}>Instant Dispatch (0 seconds)</option>
                            <option value="5" ${delayVal===5?'selected':''}>5 Seconds Delay (Recommended)</option>
                            <option value="15" ${delayVal===15?'selected':''}>15 Seconds Delay</option>
                        </select>
                    </div>

                    <div style="padding: 1.15rem; background: #FAF8F5; border: 1px solid var(--border-color); border-radius: 12px;">
                        <label style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary);">Public Comment Reply (Optional)</label>
                        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.1rem;">Posts public comment reply under post</div>
                        <input type="text" id="auto_public_reply" value="${replyVal}" onchange="window['new-automation'].savedPublicReply=this.value" placeholder="e.g. Sent! Check your DMs 📩" style="width: 100%; padding: 0.65rem 0.95rem; font-size: 0.88rem; font-weight: 500; border-radius: 8px; border: 1px solid #D1C9BE; background: #FFF; marginTop: 0.5rem; outline: none;">
                    </div>
                </div>
            </div>
        `;
    },

    applyTemplate(type) {
        this.keywordMode = 'specific';
        if (type === 'pdf') {
            this.savedKeywords = 'PDF, GUIDE, EBOOK';
            this.keywordList = ['PDF', 'GUIDE', 'EBOOK'];
            this.savedActionType = 'link_dm';
            this.savedResponseText = 'Thanks for commenting! Here is your requested PDF resource link:';
            this.savedLinkUrl = 'https://example.com/free-guide.pdf';
            this.savedPublicReply = 'Sent to your DMs! Check your inbox 📩';
            App.showToast('Applied "Lead E-Book" preset', 'success');
        } else if (type === 'follow') {
            this.savedKeywords = 'SECRET, LINK, UNLOCK';
            this.keywordList = ['SECRET', 'LINK', 'UNLOCK'];
            this.savedActionType = 'follow_first';
            this.savedFollowPrompt = 'Thanks for commenting! Please follow @creator.studio first, then reply "I FOLLOWED" in this DM to unlock your link!';
            this.savedResponseText = '🎉 Thank you for following @creator.studio! Here is your requested resource link:';
            this.savedLinkUrl = 'https://example.com/secret-guide.pdf';
            this.savedPublicReply = 'Check your DMs for access instructions!';
            App.showToast('Applied "Follow First Gate" preset 🔐', 'success');
        } else if (type === 'course') {
            this.savedKeywords = 'COURSE, MASTERCLASS';
            this.keywordList = ['COURSE', 'MASTERCLASS'];
            this.savedActionType = 'link_dm';
            this.savedResponseText = 'Here is your private access link to register for the Masterclass:';
            this.savedLinkUrl = 'https://example.com/masterclass';
            this.savedPublicReply = 'Check your DMs!';
            App.showToast('Applied "Course Signup" preset', 'success');
        }
        this.renderStepContent();
    },

    async saveAutomation() {
        // Automatically capture any pending text in the keyword input
        const pendingInput = document.getElementById('input-new-keyword');
        if (pendingInput && pendingInput.value.trim()) {
            const parts = pendingInput.value.trim().split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
            parts.forEach(p => {
                if (!this.keywordList.includes(p)) this.keywordList.push(p);
            });
            this.savedKeywords = this.keywordList.join(', ');
        }

        let triggerWord = '';
        if (this.keywordMode === 'any') {
            triggerWord = '*'; // Universal trigger for ANY comment
        } else {
            triggerWord = (this.keywordList && this.keywordList.length > 0)
                ? this.keywordList.join(', ')
                : (this.savedKeywords || 'PLAYBOOK');
        }

        const actionType = this.savedActionType || document.getElementById('auto_action_type')?.value || 'link_dm';

        const gateType = document.getElementById('wizard_gate_type_select')?.value || this.savedButtonsConfig?.gate_type || 'buttons';
        const buttonsConfig = {
            gate_type: gateType,
            step1_text: document.getElementById('wizard_btn_step1_text')?.value || this.savedButtonsConfig?.step1_text || "Hey there! Glad you're here ☺️\n\nTap below and I'll send you the access in just a moment ✨",
            step1_button: (document.getElementById('wizard_btn_step1_button')?.value || this.savedButtonsConfig?.step1_button || "Send me the access").trim(),
            step2_text: document.getElementById('wizard_btn_step2_text')?.value || this.savedButtonsConfig?.step2_text || "Almost there !\nPlease visit my profile and tap follow to continue 😄",
            step2_profile_button: (document.getElementById('wizard_btn_step2_profile_button')?.value || this.savedButtonsConfig?.step2_profile_button || "Visit Profile").trim(),
            step2_confirm_button: (document.getElementById('wizard_btn_step2_confirm_button')?.value || this.savedButtonsConfig?.step2_confirm_button || "I'm following ✅").trim(),
            step3_text: document.getElementById('wizard_btn_step3_text')?.value || this.savedButtonsConfig?.step3_text || "Dost appko document bejhdiya hai bahut mehnat sa bnaya hai please follow",
            step3_button: (document.getElementById('wizard_btn_step3_button')?.value || this.savedButtonsConfig?.step3_button || "Click me").trim()
        };
        this.savedButtonsConfig = buttonsConfig;

        const responseText = actionType === 'follow_first'
            ? (buttonsConfig.step3_text || this.savedResponseText || 'Dost appko document bejhdiya hai bahut mehnat sa bnaya hai please follow')
            : (this.savedResponseText || document.getElementById('auto_response_text')?.value || 'Here is your resource link!');

        const payload = {
            media_id: this.selectedMediaId,
            trigger_word: triggerWord,
            action_type: actionType,
            response_text: responseText,
            link_url: this.savedLinkUrl || document.getElementById('auto_link_url')?.value || 'https://example.com/guide.pdf',
            follow_prompt: this.savedFollowPrompt || document.getElementById('auto_follow_prompt')?.value || 'Please follow us first!',
            public_reply: this.savedPublicReply || document.getElementById('auto_public_reply')?.value || 'Sent to DMs!',
            delay_seconds: this.savedDelay !== undefined ? this.savedDelay : 5,
            buttons_config_json: JSON.stringify(buttonsConfig),
            is_active: true
        };

        try {
            await App.apiCall('POST', '/api/rules', payload);
            App.showToast('Automation deployed successfully!', 'success');
            App.navigate('workflows');
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }
};
