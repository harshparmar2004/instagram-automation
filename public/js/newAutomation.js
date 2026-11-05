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

    isStoryTarget() {
        if (this.selectedMediaId === 'story' || this.selectedMediaId === 'story_mention') return true;
        const chosen = (this.mediaList || []).find(m => String(m.id) === String(this.selectedMediaId) || String(m.ig_media_id) === String(this.selectedMediaId));
        return chosen ? (chosen.media_product_type === 'STORY' || chosen.media_type === 'STORY') : false;
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
        if (filter === 'story') {
            const hasStorySelected = this.selectedMediaId === 'story' || 
                                     this.selectedMediaId === 'story_mention' || 
                                     (this.mediaList || []).some(m => String(m.id) === String(this.selectedMediaId) && (m.media_product_type === 'STORY' || m.media_type === 'STORY'));
            if (!hasStorySelected) {
                this.selectedMediaId = 'story';
            }
        } else {
            if (this.selectedMediaId === 'story' || this.selectedMediaId === 'story_mention') {
                this.selectedMediaId = 'global';
            }
        }
        this.renderStep1(document.getElementById('new-automation-content'));
    },

    async refreshStories() {
        const btn = document.getElementById('btn-refresh-step1-content') || document.getElementById('btn-refresh-stories-banner');
        if (btn) {
            btn.innerHTML = '<span class="spinner"></span> Syncing Stories...';
            btn.disabled = true;
        }
        try {
            const res = await App.apiCall('POST', '/api/stories/sync');
            this.mediaList = await App.apiCall('GET', '/api/media') || [];
            const count = res.count !== undefined ? res.count : 0;
            App.showToast(`✅ Synced! Found ${count} active stories on Instagram`, 'success');
            this.renderStep1(document.getElementById('new-automation-content'));
        } catch (err) {
            App.showToast(err.message, 'error');
        } finally {
            if (btn) {
                btn.innerHTML = '<span>🔄 Refresh Stories</span>';
                btn.disabled = false;
            }
        }
    },

    async refreshMedia() {
        const btn = document.getElementById('btn-refresh-step1-content') || document.getElementById('btn-refresh-step1-reels');
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
        const user = window.App?.state?.user || {};
        const igAccount = user.instagram || {};
        const igUsername = igAccount.username || user.ig_username || 'harshparmar007__';
        const igProfilePic = igAccount.profilePic || user.profile_pic || user.avatar_url || '';

        // Strict Separation: Stories are kept exclusively in Stories Only
        const activeStories = (this.mediaList || []).filter(m => 
            (m.media_product_type === 'STORY' || m.media_type === 'STORY') && m.status !== 'deleted'
        );
        const storiesCount = activeStories.length;

        const feedMedia = (this.mediaList || []).filter(m => 
            m.media_product_type !== 'STORY' && m.media_type !== 'STORY' && m.status !== 'deleted'
        );
        const feedCount = feedMedia.length;

        const reelsMedia = feedMedia.filter(m => 
            m.media_product_type === 'REELS' || m.media_type === 'REEL' || (m.media_type === 'VIDEO' && m.media_product_type !== 'FEED')
        );
        const reelsCount = reelsMedia.length;

        let filtered = [];
        if (this.step1Filter === 'reels') {
            filtered = reelsMedia.filter(m => {
                const cap = (m.caption || '').toLowerCase();
                return !this.searchQuery || cap.includes(this.searchQuery.toLowerCase());
            });
        } else if (this.step1Filter === 'story') {
            filtered = activeStories.filter(m => {
                const cap = (m.caption || '').toLowerCase();
                return !this.searchQuery || cap.includes(this.searchQuery.toLowerCase());
            });
        } else {
            // 'all': All Posts & Reels (strictly excluding Stories)
            filtered = feedMedia.filter(m => {
                const cap = (m.caption || '').toLowerCase();
                return !this.searchQuery || cap.includes(this.searchQuery.toLowerCase());
            });
        }

        // COMPACT AUTHENTIC INSTAGRAM STORY CARD RENDERER
        const renderStoryCard = (st, isSelected) => {
            const thumbUrl = st.thumbnail_url || st.media_url || '';
            const captionCut = st.caption ? (st.caption.slice(0, 32) + '...') : `Active Story #${String(st.id || st.ig_media_id).slice(-4)}`;

            return `
                <div class="reel-card-item ${isSelected ? 'selected' : ''}" onclick="window['new-automation'].selectReel('${st.id}', this)" style="
                    border-radius: 12px;
                    border: ${isSelected ? '2.5px solid var(--accent-primary)' : '1px solid var(--border-color)'};
                    outline: ${isSelected ? '2px solid var(--accent-primary)' : 'none'};
                    outline-offset: ${isSelected ? '1px' : '0'};
                    background: ${isSelected ? '#FDF8F6' : '#FFFFFF'};
                    box-shadow: ${isSelected ? '0 0 0 3px rgba(217, 119, 87, 0.2), 0 4px 14px rgba(217, 119, 87, 0.12)' : '0 1px 4px rgba(0,0,0,0.03)'};
                    cursor: pointer;
                    overflow: hidden;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: 155px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                ">
                    ${isSelected ? `<div style="position:absolute; top:6px; right:6px; width:20px; height:20px; border-radius:50%; background:var(--accent-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.7rem; z-index:20; border: 1.5px solid #FFFFFF; box-shadow: 0 1px 5px rgba(0,0,0,0.3);">✓</div>` : ''}

                    <!-- COMPACT 9:16 INSTAGRAM STORY MOBILE FRAME -->
                    <div style="
                        position: relative;
                        width: 100%;
                        padding-top: 140%;
                        background-color: #121212;
                        background-size: cover;
                        background-position: center;
                        background-image: url('${thumbUrl}');
                        overflow: hidden;
                    ">
                        <!-- TOP GRADIENT -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 50px; background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 70%, transparent 100%); pointer-events: none; z-index: 1;"></div>

                        <!-- 1. PROGRESS SEGMENTS -->
                        <div style="position: absolute; top: 4px; left: 5px; right: 5px; display: flex; gap: 2px; z-index: 2;">
                            <div style="flex: 1; height: 1.5px; background: #FFFFFF; border-radius: 1px;"></div>
                            <div style="flex: 1; height: 1.5px; background: rgba(255,255,255,0.4); border-radius: 1px;"></div>
                        </div>

                        <!-- 2. CREATOR HEADER -->
                        <div style="position: absolute; top: 9px; left: 5px; right: 5px; display: flex; align-items: center; justify-content: space-between; z-index: 2;">
                            <div style="display: flex; align-items: center; gap: 4px; min-width: 0;">
                                <div style="width: 16px; height: 16px; border-radius: 50%; padding: 1px; background: linear-gradient(45deg, #f09433, #dc2743); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    ${igProfilePic ? `
                                        <img src="${igProfilePic}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                        <div style="display:none; width: 100%; height: 100%; border-radius: 50%; background: #1a1a1a; color: #FFF; font-size: 0.5rem; font-weight: 800; align-items: center; justify-content: center;">${(igUsername[0] || 'C').toUpperCase()}</div>
                                    ` : `
                                        <div style="width: 100%; height: 100%; border-radius: 50%; background: #1a1a1a; color: #FFF; font-size: 0.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">${(igUsername[0] || 'C').toUpperCase()}</div>
                                    `}
                                </div>
                                <span style="font-size: 0.58rem; font-weight: 700; color: #FFFFFF; text-shadow: 0 1px 2px rgba(0,0,0,0.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 58px;">
                                    ${igUsername}
                                </span>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10" fill="#0095F6"/><path d="M9.5 12.3l1.8 1.8 4.2-4.2" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </div>
                            <span style="font-size: 0.52rem; color: rgba(255,255,255,0.85); font-weight: 700; background: rgba(0,0,0,0.45); padding: 1px 4px; border-radius: 6px;">Story</span>
                        </div>

                        <!-- 3. LIVE BADGE -->
                        <div style="position: absolute; top: 28px; left: 5px; z-index: 2;">
                            <span style="font-size: 0.48rem; font-weight: 800; color: #FFFFFF; background: linear-gradient(45deg, #f09433, #dc2743); padding: 1.5px 4.5px; border-radius: 3px; display: inline-flex; align-items: center; text-transform: uppercase;">
                                ⚡ Live
                            </span>
                        </div>

                        <!-- 4. BOTTOM OVERLAY & REPLY BAR MOCKUP -->
                        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 55px; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%); pointer-events: none; z-index: 1;"></div>
                        <div style="position: absolute; bottom: 5px; left: 5px; right: 5px; z-index: 2;">
                            <div style="background: rgba(255,255,255,0.22); backdrop-filter: blur(6px); border: 0.5px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 2.5px 6px; display: flex; align-items: center; justify-content: space-between;">
                                <span style="font-size: 0.52rem; color: rgba(255,255,255,0.92); font-weight: 500;">Send message...</span>
                                <span style="font-size: 0.55rem;">🤍</span>
                            </div>
                        </div>
                    </div>

                    <!-- METADATA FOOTER -->
                    <div style="padding: 0.45rem 0.55rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between; background: #FFFFFF;">
                        <div>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.15rem;">
                                <span style="font-size: 0.55rem; font-weight: 800; color: var(--accent-primary); background: #FAF2EC; padding: 1px 4px; border-radius: 3px;">
                                    ⚡ Story
                                </span>
                                <span style="font-size: 0.55rem; color: #15803D; font-weight: 700;">🟢 Active</span>
                            </div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.72rem; color: var(--text-primary); line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${captionCut}
                            </div>
                        </div>
                        <div style="font-size: 0.62rem; color: var(--text-secondary); margin-top: 0.25rem; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
                            <span>${new Date(st.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            <span style="color: var(--accent-primary); font-weight: 700;">Select →</span>
                        </div>
                    </div>

                    ${isSelected ? `
                        <div style="background: var(--accent-primary); color: #FFFFFF; font-size: 0.62rem; font-weight: 800; text-align: center; padding: 3px 4px; letter-spacing: 0.03em;">
                            ✓ SELECTED
                        </div>
                    ` : ''}
                </div>
            `;
        };

        let gridHtml = '';

        if (this.step1Filter === 'story') {
            const isStoryReplySelected = String(this.selectedMediaId) === 'story';
            const isStoryMentionSelected = String(this.selectedMediaId) === 'story_mention';

            gridHtml = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 155px)); gap: 0.75rem; width: 100%;">
                    
                    <!-- 1. COMPACT "EVERY STORY" CARD (USP: GUARANTEED FOR ALL STORIES) -->
                    <div class="reel-card-item ${isStoryReplySelected ? 'selected' : ''}" onclick="window['new-automation'].selectReel('story', this)" style="
                        border-radius: 12px;
                        border: ${isStoryReplySelected ? '2.5px solid var(--accent-primary)' : '1px solid var(--border-color)'};
                        outline: ${isStoryReplySelected ? '2px solid var(--accent-primary)' : 'none'};
                        outline-offset: ${isStoryReplySelected ? '1px' : '0'};
                        background: ${isStoryReplySelected ? '#FDF8F6' : '#FFFFFF'};
                        box-shadow: ${isStoryReplySelected ? '0 0 0 3px rgba(217, 119, 87, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)'};
                        cursor: pointer;
                        overflow: hidden;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        max-width: 155px;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    ">
                        ${isStoryReplySelected ? `<div style="position:absolute; top:6px; right:6px; width:20px; height:20px; border-radius:50%; background:var(--accent-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.7rem; z-index:10; border: 1.5px solid #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,0.3);">✓</div>` : ''}

                        <div style="height: 100px; background: linear-gradient(135deg, #FFF1EB 0%, #FEE5DC 60%, #FDC5B4 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.4rem; text-align: center; position: relative;">
                            <div style="position: absolute; top: 4px; left: 4px; font-size: 0.52rem; font-weight: 800; color: #8F4932; background: rgba(255,255,255,0.9); padding: 1.5px 5px; border-radius: 4px;">⚡ EVERY STORY</div>
                            <div style="font-size: 1.4rem; margin-top: 0.1rem;">⚡</div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.8rem; color: var(--accent-primary); margin-top: 0.1rem;">All Stories</div>
                            <div style="font-size: 0.62rem; color: #8F4932; font-weight: 600;">Incoming Replies</div>
                        </div>

                        <div style="padding: 0.5rem 0.55rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.72rem; color: var(--text-primary); margin-bottom: 0.15rem;">Every Story Automation</div>
                                <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.3;">Auto-replies to any story you post (current & future).</div>
                            </div>
                            <div style="margin-top: 0.35rem; display: flex; gap: 3px; flex-wrap: wrap;">
                                <span style="font-size: 0.58rem; font-weight: 700; background: #FAF2EC; color: var(--accent-primary); padding: 1px 5px; border-radius: 4px;">📩 DM</span>
                                <span style="font-size: 0.58rem; font-weight: 700; background: #FAF2EC; color: var(--accent-primary); padding: 1px 5px; border-radius: 4px;">🔐 Gate</span>
                            </div>
                        </div>

                        ${isStoryReplySelected ? `
                            <div style="background: var(--accent-primary); color: #FFFFFF; font-size: 0.62rem; font-weight: 800; text-align: center; padding: 3px 4px; letter-spacing: 0.03em;">
                                ✓ SELECTED
                            </div>
                        ` : ''}
                    </div>

                    <!-- 2. COMPACT "STORY MENTIONS" CARD -->
                    <div class="reel-card-item ${isStoryMentionSelected ? 'selected' : ''}" onclick="window['new-automation'].selectReel('story_mention', this)" style="
                        border-radius: 12px;
                        border: ${isStoryMentionSelected ? '2.5px solid var(--accent-primary)' : '1px solid var(--border-color)'};
                        outline: ${isStoryMentionSelected ? '2px solid var(--accent-primary)' : 'none'};
                        outline-offset: ${isStoryMentionSelected ? '1px' : '0'};
                        background: ${isStoryMentionSelected ? '#FDF8F6' : '#FFFFFF'};
                        box-shadow: ${isStoryMentionSelected ? '0 0 0 3px rgba(217, 119, 87, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)'};
                        cursor: pointer;
                        overflow: hidden;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        max-width: 155px;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    ">
                        ${isStoryMentionSelected ? `<div style="position:absolute; top:6px; right:6px; width:20px; height:20px; border-radius:50%; background:var(--accent-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.7rem; z-index:10; border: 1.5px solid #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,0.3);">✓</div>` : ''}

                        <div style="height: 100px; background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 60%, #C7D2FE 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.4rem; text-align: center; position: relative;">
                            <div style="position: absolute; top: 4px; left: 4px; font-size: 0.52rem; font-weight: 800; color: #4338CA; background: rgba(255,255,255,0.9); padding: 1.5px 5px; border-radius: 4px;">🏷️ MENTION</div>
                            <div style="font-size: 1.4rem; margin-top: 0.1rem;">🏷️</div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.8rem; color: #4338CA; margin-top: 0.1rem;">Story Mentions</div>
                            <div style="font-size: 0.62rem; color: #3730A3; font-weight: 600;">When Tagged</div>
                        </div>

                        <div style="padding: 0.5rem 0.55rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.72rem; color: var(--text-primary); margin-bottom: 0.15rem;">Story Tagged Automation</div>
                                <div style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.3;">Auto-DM when someone tags @${igUsername} in their story.</div>
                            </div>
                            <div style="margin-top: 0.35rem; display: flex; gap: 3px; flex-wrap: wrap;">
                                <span style="font-size: 0.58rem; font-weight: 700; background: #EEF2FF; color: #4338CA; padding: 1px 5px; border-radius: 4px;">🎁 Reward</span>
                                <span style="font-size: 0.58rem; font-weight: 700; background: #EEF2FF; color: #4338CA; padding: 1px 5px; border-radius: 4px;">🔥 Viral</span>
                            </div>
                        </div>

                        ${isStoryMentionSelected ? `
                            <div style="background: var(--accent-primary); color: #FFFFFF; font-size: 0.62rem; font-weight: 800; text-align: center; padding: 3px 4px; letter-spacing: 0.03em;">
                                ✓ SELECTED
                            </div>
                        ` : ''}
                    </div>

                    <!-- 3. ACTIVE STORIES POSTED BY CREATOR (COMPACT SLEEK INSTAGRAM STORY CARDS) -->
                    ${filtered.map(st => {
                        const isSelected = String(this.selectedMediaId) === String(st.id) || String(this.selectedMediaId) === String(st.ig_media_id);
                        return renderStoryCard(st, isSelected);
                    }).join('')}

                    ${filtered.length === 0 ? `
                        <div style="grid-column: 1 / -1; margin-top: 0.25rem; background: #FFFFFF; border: 1.5px dashed var(--border-color); border-radius: 12px; padding: 0.85rem 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 0.65rem;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: #FAF2EC; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">📱</div>
                                <div>
                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.8rem; color: var(--text-primary);">No individual active stories live on Instagram right now</div>
                                    <div style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.35; margin-top: 0.1rem;">Instagram stories expire after 24 hours. Select <strong>All Stories</strong> above to automate every current and newly posted story, or post a new story on Instagram and click refresh!</div>
                                </div>
                            </div>
                            <button type="button" id="btn-refresh-stories-banner" class="btn btn-secondary btn-sm" onclick="window['new-automation'].refreshStories()" style="font-weight: 700; font-size: 0.76rem; padding: 0.35rem 0.75rem; white-space: nowrap; background: #FFFFFF; border: 1px solid var(--border-color);">
                                🔄 Refresh Stories
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            const isGlobalSelected = String(this.selectedMediaId) === 'global';

            gridHtml = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0.85rem; width: 100%;">
                    
                    <!-- GLOBAL OPTION (FOR REELS & POSTS) -->
                    <div class="reel-card-item ${isGlobalSelected ? 'selected' : ''}" onclick="window['new-automation'].selectReel('global', this)" style="
                        border-radius: 14px;
                        border: ${isGlobalSelected ? '2.5px solid var(--accent-primary)' : '1.5px solid var(--border-color)'};
                        outline: ${isGlobalSelected ? '3px solid var(--accent-primary)' : 'none'};
                        outline-offset: ${isGlobalSelected ? '2px' : '0'};
                        background: ${isGlobalSelected ? '#FDF8F6' : '#FFFFFF'};
                        box-shadow: ${isGlobalSelected ? '0 0 0 3px rgba(217, 119, 87, 0.25)' : '0 1px 4px rgba(0,0,0,0.02)'};
                        cursor: pointer;
                        overflow: hidden;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    ">
                        ${isGlobalSelected ? `<div style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:50%; background:var(--accent-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.8rem; z-index:10; box-shadow:0 2px 6px rgba(0,0,0,0.25); border: 2px solid #FFFFFF;">✓</div>` : ''}
                        
                        <div style="height: 115px; background: linear-gradient(135deg, #FAF8F5 0%, #E6E1D8 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.6rem; text-align: center;">
                            <div style="font-size: 1.4rem; margin-bottom: 0.1rem;">🌐</div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.85rem; color: var(--accent-primary);">Account-Wide Rule</div>
                            <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 0.1rem;">Applies to all current & newly posted Reels</div>
                        </div>

                        <div style="padding: 0.7rem; flex: 1;">
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.8rem; color: var(--text-primary);">Global Account Rule</div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.15rem; line-height: 1.35;">Triggers on comments across your entire Instagram profile</div>
                        </div>

                        ${isGlobalSelected ? `
                            <div style="background: var(--accent-primary); color: #FFFFFF; font-size: 0.68rem; font-weight: 800; text-align: center; padding: 4px 8px; letter-spacing: 0.04em;">
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
                        outline-offset: ${isSelected ? '2px' : '0'};
                        background: ${isSelected ? '#FDF8F6' : '#FFFFFF'};
                        box-shadow: ${isSelected ? '0 0 0 3px rgba(217, 119, 87, 0.25)' : '0 1px 4px rgba(0,0,0,0.02)'};
                        cursor: pointer;
                        overflow: hidden;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    ">
                        ${isSelected ? `<div style="position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:50%; background:var(--accent-primary); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:0.8rem; z-index:10; box-shadow:0 2px 6px rgba(0,0,0,0.25); border: 2px solid #FFFFFF;">✓</div>` : ''}

                        <!-- VERTICAL COVER FOR REELS / FEED -->
                        <div style="
                            position: relative;
                            width: 100%;
                            padding-top: ${isReel ? '135%' : '100%'};
                            background-color: #171514;
                            background-size: cover;
                            background-position: center;
                            background-image: url('${thumbUrl}');
                        ">
                            <!-- TOP CREATOR HEADER OVERLAY -->
                            <div style="position: absolute; top: 0; left: 0; right: 0; padding: 5px 7px; background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%); display: flex; align-items: center; justify-content: space-between; z-index: 2;">
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span style="font-size: 0.62rem; font-weight: 700; color: #FFFFFF; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">@${igUsername}</span>
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#0095F6"/><path d="M9.5 12.3l1.8 1.8 4.2-4.2" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </div>
                                <div style="font-size: 0.6rem; font-weight: 800; color: #FFFFFF; background: rgba(0,0,0,0.65); backdrop-filter: blur(6px); padding: 2px 5px; border-radius: 4px; display: flex; align-items: center; gap: 3px;">
                                    ${isReel ? '▶ REEL' : '📸 POST'}
                                </div>
                            </div>

                            <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1.1rem 0.5rem 0.35rem 0.5rem; background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%); color: #FFF; font-size: 0.65rem; font-weight: 700;">
                                💬 ${comments} comments
                            </div>
                        </div>

                        <div style="padding: 0.6rem 0.7rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.78rem; color: var(--text-primary); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${captionCut}
                            </div>
                            <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 0.3rem; font-weight: 600;">
                                ${new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        </div>

                        ${isSelected ? `
                            <div style="background: var(--accent-primary); color: #FFFFFF; font-size: 0.68rem; font-weight: 800; text-align: center; padding: 4px 8px; letter-spacing: 0.04em;">
                                ✓ SELECTED
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            gridHtml += '</div>';
        }

        container.innerHTML = `
            <div style="width: 100%;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.85rem; flex-wrap:wrap; gap:0.65rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">Step 1: Pick a Target Reel, Post or Story</h2>
                            <div style="display: inline-flex; align-items: center; gap: 5px; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 2.5px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; color: #15803D;">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#0095F6"/><path d="M9.5 12.3l1.8 1.8 4.2-4.2" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                <span>@${igUsername}</span>
                                <span style="color: #86EFAC;">•</span>
                                <span>Meta Verified Active</span>
                            </div>
                        </div>
                        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.1rem;">Select which Instagram Reel, Post, or Story interaction this automation will monitor.</p>
                    </div>

                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <!-- INSTANT REFRESH BUTTON -->
                        <button type="button" id="btn-refresh-step1-content" class="btn btn-secondary btn-sm" onclick="${this.step1Filter === 'story' ? 'window[\'new-automation\'].refreshStories()' : 'window[\'new-automation\'].refreshMedia()'}" style="font-weight: 700; font-size: 0.78rem; background: #FFFFFF; border: 1px solid var(--border-color); padding: 0.45rem 0.85rem;" title="${this.step1Filter === 'story' ? 'Check Instagram for active stories' : 'Fetch newly posted Reels from Instagram immediately'}">
                            <span>🔄 ${this.step1Filter === 'story' ? 'Refresh Stories' : 'Refresh Latest Reels'}</span>
                        </button>

                        <div style="min-width: 180px;">
                            <input type="text" value="${this.searchQuery}" onkeyup="window['new-automation'].filterReels(this.value)" placeholder="Search content..." style="padding: 0.42rem 0.75rem; font-size: 0.8rem; font-weight: 500; border-radius: 8px; border: 1px solid var(--border-color); background: #FAF8F5; outline: none; width: 100%;">
                        </div>
                    </div>
                </div>

                <!-- SUB TABS FOR STEP 1 -->
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                    <button type="button" onclick="window['new-automation'].setStep1Filter('reels')" style="padding: 0.4rem 0.95rem; font-size: 0.82rem; font-weight: ${this.step1Filter === 'reels' ? '800' : '600'}; border-radius: 8px; background: ${this.step1Filter === 'reels' ? 'var(--accent-primary)' : '#FFFFFF'}; color: ${this.step1Filter === 'reels' ? '#FFFFFF' : 'var(--text-secondary)'}; border: ${this.step1Filter === 'reels' ? 'none' : '1px solid var(--border-color)'}; cursor: pointer; transition: all 0.15s ease;">
                        🎬 Reels Only (${reelsCount})
                    </button>
                    <button type="button" onclick="window['new-automation'].setStep1Filter('all')" style="padding: 0.4rem 0.95rem; font-size: 0.82rem; font-weight: ${this.step1Filter === 'all' ? '800' : '600'}; border-radius: 8px; background: ${this.step1Filter === 'all' ? 'var(--accent-primary)' : '#FFFFFF'}; color: ${this.step1Filter === 'all' ? '#FFFFFF' : 'var(--text-secondary)'}; border: ${this.step1Filter === 'all' ? 'none' : '1px solid var(--border-color)'}; cursor: pointer; transition: all 0.15s ease;">
                        📁 Posts & Reels (${feedCount})
                    </button>
                    <button type="button" onclick="window['new-automation'].setStep1Filter('story')" style="padding: 0.4rem 0.95rem; font-size: 0.82rem; font-weight: ${this.step1Filter === 'story' ? '800' : '600'}; border-radius: 8px; background: ${this.step1Filter === 'story' ? 'var(--accent-primary)' : '#FFFFFF'}; color: ${this.step1Filter === 'story' ? '#FFFFFF' : 'var(--text-secondary)'}; border: ${this.step1Filter === 'story' ? 'none' : '1px solid var(--border-color)'}; cursor: pointer; transition: all 0.15s ease;">
                        ⚡ Stories Only (${storiesCount})
                    </button>
                </div>

                <div style="max-height: 480px; overflow-y: auto; border-radius: 12px; border: 1px solid var(--border-color); padding: 0.85rem; background: #FAF8F5;">
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
        const isStory = this.isStoryTarget();
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
            chipsHtml = `<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">No keywords added yet. Type below and click "+ Add Keyword" (or select "${isStory ? 'Any Story Reply' : 'Any Comment'}" mode).</div>`;
        }

        const step2Title = isStory ? 'Step 2: Story Reply Trigger Keywords' : 'Step 2: Trigger Keyword Configuration';
        const step2Subtitle = isStory 
            ? 'Configure keyword triggers for incoming Instagram Story direct replies.'
            : 'Choose whether to trigger on specific keywords or on every single comment on this Reel.';

        const specificTitle = isStory ? '🎯 Specific Keyword(s) in Story Reply' : '🎯 Specific Keyword(s) Only';
        const specificDesc = isStory
            ? 'Only followers who reply to your story with your chosen keywords (e.g. PLAYBOOK, PDF) receive the automated DM.'
            : 'Only followers who comment your chosen keywords (e.g. PLAYBOOK, PDF) receive the automated DM.';

        const anyTitle = isStory ? '⚡ Any Story Reply (Every Reply)' : '⚡ Any Comment (Every Comment)';
        const anyDesc = isStory
            ? 'Dispatches your automated DM for EVERY reply sent to your story, no matter what they write!'
            : 'Triggers the automated DM for EVERY comment posted on this Reel, no matter what they write!';

        container.innerHTML = `
            <div style="width: 100%;">
                <div style="margin-bottom: 1.15rem;">
                    <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">${step2Title}</h2>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.15rem;">${step2Subtitle}</p>
                </div>

                <!-- 1. TRIGGER MODE SELECTION (SPECIFIC KEYWORDS vs ANY COMMENT/REPLY) -->
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
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.92rem; color: var(--text-primary);">${specificTitle}</div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; line-height: 1.4;">${specificDesc}</div>
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
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.92rem; color: var(--text-primary);">${anyTitle}</div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem; line-height: 1.4;">${anyDesc}</div>
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
                    <!-- ANY COMMENT/REPLY MODE ACTIVE ALERT BANNER -->
                    <div style="padding: 1.25rem; background: #FDF8F6; border: 1.5px solid var(--accent-primary); border-radius: 12px; display: flex; gap: 0.85rem; align-items: center;">
                        <div style="font-size: 1.8rem;">⚡</div>
                        <div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.95rem; color: var(--accent-primary);">${isStory ? 'Universal Story Reply Trigger Enabled' : 'Universal Comment Trigger Enabled'}</div>
                            <div style="font-size: 0.84rem; color: var(--text-primary); margin-top: 0.2rem; line-height: 1.45;">
                                ${isStory 
                                    ? 'InstaAuto will dispatch your automated DM for <strong>ANY reply</strong> sent to your story. No keyword typing required by your followers!'
                                    : 'InstaAuto will dispatch your automated DM for <strong>ANY comment</strong> left on this Reel. No keyword typing required by your followers!'}
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;
    },

    // STEP 3: DM & RESOURCE DISPATCH WITH FOLLOW-FIRST GATE WORKFLOW PREVIEW
    renderStep3(container) {
        const isStory = this.isStoryTarget();
        const actionVal = this.savedActionType || 'link_dm';
        const responseVal = this.savedResponseText || 'Hey! Thanks for replying. Here is your requested resource link 🚀';
        const linkVal = this.savedLinkUrl || 'https://example.com/guide.pdf';
        const promptVal = this.savedFollowPrompt || 'Thanks for reaching out! Please follow @creator.studio first, then reply "I FOLLOWED" in this DM to unlock your link!';

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

                ${isStory ? `
                    <div style="margin-bottom: 1rem; padding: 0.75rem 1rem; background: #FFF9F5; border: 1.5px solid #FDC5B4; border-radius: 10px; display: flex; align-items: center; gap: 0.65rem;">
                        <span style="font-size: 1.15rem;">⚡</span>
                        <div style="font-size: 0.8rem; color: #8F4932; line-height: 1.35;">
                            <strong>Story Automation Active:</strong> Instagram Stories deliver interactions directly to Direct Messages. When a user replies to your story, your automated response is delivered straight to their private Instagram DM inbox!
                        </div>
                    </div>
                ` : ''}

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
                                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.1rem;">
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
                                    <strong style="color: var(--accent-primary);">1. ${isStory ? 'Story Reply' : 'Comment'}:</strong> Follower triggers keywords on your ${isStory ? 'story' : 'Reel'}.
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
                            <textarea id="auto_response_text" rows="3" onchange="window['new-automation'].savedResponseText=this.value" placeholder="e.g. Thanks for replying! Here is your requested resource link..." style="width: 100%; padding: 0.75rem 1.1rem; font-size: 0.9rem; font-family: inherit; font-weight: 500; border-radius: 10px; border: 1px solid #D1C9BE; background: #FAF8F5; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03); outline: none; line-height: 1.45;">${responseVal}</textarea>
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
        const isStory = this.isStoryTarget();
        const delayVal = this.savedDelay !== undefined ? this.savedDelay : 0;
        const replyVal = this.savedPublicReply || 'Sent! Check your DMs 📩';
        const chosen = (this.mediaList || []).find(m => String(m.id) === String(this.selectedMediaId) || String(m.ig_media_id) === String(this.selectedMediaId));
        
        let targetLabel = 'Account-Wide Global Rule (All Reels & Posts)';
        let targetIcon = '🌐';
        let targetThumb = '';
        if (this.selectedMediaId === 'story') {
            targetLabel = 'Every Story (All Current & Future Stories)';
            targetIcon = '⚡';
        } else if (this.selectedMediaId === 'story_mention') {
            targetLabel = 'Story Mentions & Tags';
            targetIcon = '🏷️';
        } else if (chosen) {
            targetThumb = chosen.thumbnail_url || chosen.media_url || '';
            const isMediaStory = chosen.media_product_type === 'STORY' || chosen.media_type === 'STORY';
            targetIcon = isMediaStory ? '⚡' : '🎬';
            targetLabel = `${isMediaStory ? 'Active Story' : 'Target Reel'}: "${chosen.caption ? chosen.caption.slice(0, 45) + '...' : 'Untitled Content'}"`;
        }

        container.innerHTML = `
            <div style="width: 100%;">
                <div style="margin-bottom: 1rem;">
                    <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">Step 4: Pacing & Deployment Review</h2>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.15rem;">${isStory ? 'Protect account health with delay pacing and review your story automation before deploying.' : 'Protect account health with delay pacing and boost post engagement with public comment replies.'}</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; width: 100%;">
                    <!-- DELAY PACING -->
                    <div style="padding: 1.15rem; background: #FAF8F5; border: 1px solid var(--border-color); border-radius: 12px;">
                        <label style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary);">Anti-Spam Delay Pacing</label>
                        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.1rem;">Natural delay before sending DM</div>
                        <select id="auto_delay_seconds" onchange="window['new-automation'].savedDelay=parseInt(this.value)" style="width: 100%; padding: 0.65rem 0.95rem; font-size: 0.88rem; font-weight: 600; border-radius: 8px; border: 1px solid #D1C9BE; background: #FFF; margin-top: 0.5rem; outline: none;">
                            <option value="0" ${delayVal===0?'selected':''}>Instant Dispatch (0 seconds — Recommended)</option>
                            <option value="5" ${delayVal===5?'selected':''}>5 Seconds Delay</option>
                            <option value="15" ${delayVal===15?'selected':''}>15 Seconds Delay</option>
                        </select>
                    </div>

                    <!-- STORY MODE: DIRECT DM NOTICE / FEED MODE: PUBLIC COMMENT REPLY -->
                    ${isStory ? `
                        <div style="padding: 1.15rem; background: #FAF8F5; border: 1px solid var(--border-color); border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="display: flex; align-items: center; gap: 0.4rem;">
                                    <span style="font-size: 1.1rem;">⚡</span>
                                    <label style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary); margin: 0;">Direct DM Delivery (Story Mode)</label>
                                </div>
                                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.35rem; line-height: 1.4;">
                                    Instagram Stories operate purely via Direct Messages. When a user replies to your story, your automated response is delivered straight to their private Instagram DM inbox.
                                </div>
                            </div>
                            <div style="margin-top: 0.65rem; display: inline-flex; align-items: center; gap: 4px; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; color: #15803D; width: fit-content;">
                                ✓ Direct DM Inbox Delivery
                            </div>
                        </div>
                    ` : `
                        <div style="padding: 1.15rem; background: #FAF8F5; border: 1px solid var(--border-color); border-radius: 12px;">
                            <label style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary);">Public Comment Reply (Optional)</label>
                            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.1rem;">Posts public comment reply under post</div>
                            <input type="text" id="auto_public_reply" value="${replyVal}" onchange="window['new-automation'].savedPublicReply=this.value" placeholder="e.g. Sent! Check your DMs 📩" style="width: 100%; padding: 0.65rem 0.95rem; font-size: 0.88rem; font-weight: 500; border-radius: 8px; border: 1px solid #D1C9BE; background: #FFF; margin-top: 0.5rem; outline: none;">
                        </div>
                    `}
                </div>

                <!-- AUTOMATION DEPLOYMENT SUMMARY PREVIEW -->
                <div style="margin-top: 1.25rem; background: #FFFFFF; border: 1.5px solid var(--border-color); border-radius: 12px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.85rem;">
                        ${targetThumb ? `
                            <div style="width: 44px; height: 55px; border-radius: 8px; background-size: cover; background-position: center; background-image: url('${targetThumb}'); border: 1px solid var(--border-color); flex-shrink: 0;"></div>
                        ` : `
                            <div style="width: 44px; height: 44px; border-radius: 10px; background: #FAF2EC; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">${targetIcon}</div>
                        `}
                        <div>
                            <div style="font-size: 0.72rem; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.05em;">READY TO DEPLOY</div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.92rem; color: var(--text-primary);">${targetLabel}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.1rem;">
                                Trigger: <strong>${this.keywordMode === 'any' ? (isStory ? 'Any Story Reply (*)' : 'Universal Comment (*)') : (this.keywordList.join(', ') || this.savedKeywords || 'ANY')}</strong> • Action: <strong>${this.savedActionType || 'link_dm'}</strong>
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; font-weight: 700; color: #15803D; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 0.35rem 0.75rem; border-radius: 6px;">
                        ✓ Ready to Deploy
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
            this.savedResponseText = 'Thanks for reaching out! Here is your requested PDF resource link:';
            this.savedLinkUrl = 'https://example.com/free-guide.pdf';
            this.savedPublicReply = 'Sent to your DMs! Check your inbox 📩';
            App.showToast('Applied "Lead E-Book" preset', 'success');
        } else if (type === 'follow') {
            this.savedKeywords = 'SECRET, LINK, UNLOCK';
            this.keywordList = ['SECRET', 'LINK', 'UNLOCK'];
            this.savedActionType = 'follow_first';
            this.savedFollowPrompt = 'Thanks for reaching out! Please follow @creator.studio first, then reply "I FOLLOWED" in this DM to unlock your link!';
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
            triggerWord = '*'; // Universal trigger for ANY comment or reply
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

        const isStory = this.isStoryTarget();
        let sourceType = 'reel';
        if (this.selectedMediaId === 'story') {
            sourceType = 'story';
        } else if (this.selectedMediaId === 'story_mention') {
            sourceType = 'story_mention';
        } else if (isStory) {
            sourceType = 'story';
        }

        const publicReply = isStory ? null : (this.savedPublicReply || document.getElementById('auto_public_reply')?.value || 'Sent to DMs!');

        const payload = {
            media_id: this.selectedMediaId,
            source_type: sourceType,
            trigger_word: triggerWord,
            action_type: actionType,
            response_text: responseText,
            link_url: this.savedLinkUrl || document.getElementById('auto_link_url')?.value || 'https://example.com/guide.pdf',
            follow_prompt: this.savedFollowPrompt || document.getElementById('auto_follow_prompt')?.value || 'Please follow us first!',
            public_reply: publicReply,
            delay_seconds: this.savedDelay !== undefined ? this.savedDelay : 0,
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
