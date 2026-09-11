window.monthlyHistory = {
    selectedMonth: new Date().toISOString().slice(0, 7),
    selectedYear: new Date().getFullYear(),
    calendarData: null,
    currentData: null,
    isCalendarOpen: localStorage.getItem('insta_history_cal_open') !== 'false',
    lastCalendarJson: null,
    lastRenderedDataJson: null,

    async render(container) {
        container.innerHTML = `
            <div class="view" id="history-view" style="width: 100%; max-width: 1480px; margin: 0 auto;">
                <!-- PAGE HEADER -->
                <div class="page-header" style="margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div class="page-title">
                        <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.85rem; letter-spacing: -0.03em;">Monthly History Archive</h1>
                        <p style="font-size: 0.92rem; color: var(--text-secondary); margin-top: 0.2rem;">Long-term monthly performance ledger of Reel views, comments, automated DMs, and conversion link clicks.</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <button class="btn btn-secondary btn-sm" id="btn-toggle-calendar-hdr" style="font-weight: 700; padding: 0.55rem 1.15rem; font-size: 0.88rem; border-radius: 10px; display: flex; align-items: center; gap: 0.4rem; background: #FFFFFF;" onclick="window.monthlyHistory.toggleCalendar()">
                            <span id="hdr-cal-icon">${this.isCalendarOpen ? '▲' : '▼'}</span>
                            <span id="hdr-cal-text">${this.isCalendarOpen ? 'Hide Calendar' : 'Show Calendar'}</span>
                        </button>
                        <button class="btn btn-secondary btn-sm" style="font-weight: 700; padding: 0.55rem 1.15rem; font-size: 0.88rem; border-radius: 10px; display: flex; align-items: center; gap: 0.4rem; background: #FFFFFF;" onclick="window.monthlyHistory.exportCsv()">
                            <span>📥 Export CSV</span>
                        </button>
                        <button class="btn btn-secondary btn-sm" style="font-weight: 700; padding: 0.55rem 1.15rem; font-size: 0.88rem; border-radius: 10px; display: flex; align-items: center; gap: 0.4rem; background: #FFFFFF;" onclick="window.monthlyHistory.refresh(false)">
                            <span>🔄 Refresh</span>
                        </button>
                    </div>
                </div>

                <!-- CALENDAR & MULTI-YEAR NAVIGATION CARD -->
                <div id="history-calendar-card" class="card" style="padding: 1.25rem 1.45rem; border-radius: 16px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 2px 10px rgba(0,0,0,0.02); margin-bottom: 1.5rem; transition: padding 0.25s ease;">
                    <div class="text-center" style="padding: 1rem;"><div class="spinner"></div></div>
                </div>

                <!-- MONTHLY DATA CONTENT -->
                <div id="history-content" style="width: 100%;">
                    <div class="text-center" style="padding: 3rem;"><div class="spinner"></div></div>
                </div>
            </div>
        `;
        await this.loadCalendar();
        await this.loadMonthData(this.selectedMonth);
    },

    toggleCalendar() {
        this.isCalendarOpen = !this.isCalendarOpen;
        try {
            localStorage.setItem('insta_history_cal_open', this.isCalendarOpen ? 'true' : 'false');
        } catch (e) {}

        const gridWrapper = document.getElementById('history-month-grid-wrapper');
        const topBar = document.getElementById('history-calendar-top-bar');
        const card = document.getElementById('history-calendar-card');
        const toggleBtn = document.getElementById('cal-toggle-btn');
        const toggleIcon = document.getElementById('cal-toggle-icon');
        const toggleText = document.getElementById('cal-toggle-text');
        const hdrIcon = document.getElementById('hdr-cal-icon');
        const hdrText = document.getElementById('hdr-cal-text');

        if (gridWrapper) {
            if (this.isCalendarOpen) {
                gridWrapper.style.maxHeight = '220px';
                gridWrapper.style.opacity = '1';
                gridWrapper.style.marginTop = '1rem';
                gridWrapper.style.pointerEvents = 'auto';
            } else {
                gridWrapper.style.maxHeight = '0px';
                gridWrapper.style.opacity = '0';
                gridWrapper.style.marginTop = '0px';
                gridWrapper.style.pointerEvents = 'none';
            }
        }

        if (topBar) {
            topBar.style.borderBottom = this.isCalendarOpen ? '1px solid var(--border-color)' : 'none';
            topBar.style.paddingBottom = this.isCalendarOpen ? '0.85rem' : '0px';
        }

        if (card) {
            card.style.padding = this.isCalendarOpen ? '1.25rem 1.45rem' : '0.95rem 1.45rem';
        }

        if (toggleIcon) toggleIcon.textContent = this.isCalendarOpen ? '▲' : '▼';
        if (toggleText) toggleText.textContent = this.isCalendarOpen ? 'Hide Calendar' : 'Show Calendar';
        if (toggleBtn) {
            toggleBtn.title = this.isCalendarOpen ? 'Collapse 12-Month Calendar' : 'Expand 12-Month Calendar';
            toggleBtn.style.background = this.isCalendarOpen ? '#FFFFFF' : '#FAF8F5';
        }

        if (hdrIcon) hdrIcon.textContent = this.isCalendarOpen ? '▲' : '▼';
        if (hdrText) hdrText.textContent = this.isCalendarOpen ? 'Hide Calendar' : 'Show Calendar';
    },

    async refresh(isSilent = true) {
        if (!isSilent) {
            App.showToast('Refreshing monthly history...', 'info');
        }
        await Promise.all([
            this.loadCalendar(isSilent),
            this.loadMonthData(this.selectedMonth, isSilent)
        ]);
    },

    async loadCalendar(isSilent = false) {
        try {
            const cal = await App.apiCall('GET', '/api/history/calendar');
            const calJson = JSON.stringify(cal);
            const hasChanged = calJson !== this.lastCalendarJson;
            this.calendarData = cal;
            if (cal && cal.years && cal.years.length > 0) {
                if (!cal.years.includes(this.selectedYear)) {
                    this.selectedYear = cal.currentYear || cal.years[0];
                }
            }
            if (!isSilent || hasChanged || !document.getElementById('history-month-grid-wrapper')) {
                this.renderCalendarNav();
            }
        } catch (err) {
            console.error('[History] Error loading calendar:', err);
            const calContainer = document.getElementById('history-calendar-card');
            if (calContainer && !this.calendarData) {
                calContainer.innerHTML = `<div style="color: var(--accent-primary); font-size: 0.85rem;">Failed to load calendar navigation: ${err.message}</div>`;
            }
        }
    },

    renderCalendarNav() {
        const calContainer = document.getElementById('history-calendar-card');
        if (!calContainer || !this.calendarData) return;

        const cal = this.calendarData;
        const years = cal.years || [this.selectedYear];
        const months = (cal.calendarByYear && cal.calendarByYear[this.selectedYear]) || [];

        const [currY, currM] = (this.selectedMonth || '').split('-');
        const dateObj = new Date(parseInt(currY, 10), parseInt(currM, 10) - 1, 1);
        const periodTitle = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        const isCurrent = (this.selectedMonth === cal.currentMonth);

        // Adjust card padding based on open state
        calContainer.style.padding = this.isCalendarOpen ? '1.25rem 1.45rem' : '0.95rem 1.45rem';

        let html = `
            <div style="display: flex; flex-direction: column;">
                
                <!-- TOP BAR: YEAR SELECTOR, STEPPERS, LIVE BADGE & POP-UP TOGGLE -->
                <div id="history-calendar-top-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-bottom: ${this.isCalendarOpen ? '1px solid var(--border-color)' : 'none'}; padding-bottom: ${this.isCalendarOpen ? '0.85rem' : '0px'}; transition: padding-bottom 0.25s ease, border-bottom 0.25s ease;">
                    
                    <!-- YEAR TABS -->
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="font-size: 0.78rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-right: 0.25rem;">
                            Year:
                        </span>
                        ${years.map(y => `
                            <button type="button" class="btn btn-sm" onclick="window.monthlyHistory.selectYear(${y})" style="
                                font-weight: 800; 
                                font-size: 0.82rem; 
                                border-radius: 999px; 
                                padding: 0.35rem 0.95rem; 
                                border: 1.5px solid ${y === this.selectedYear ? 'var(--accent-primary)' : 'var(--border-color)'}; 
                                background: ${y === this.selectedYear ? 'var(--accent-primary)' : '#FAF8F5'}; 
                                color: ${y === this.selectedYear ? '#FFFFFF' : 'var(--text-primary)'};
                                cursor: pointer;
                                transition: all 0.15s ease;
                            ">
                                📅 ${y}
                            </button>
                        `).join('')}
                    </div>

                    <!-- ACTIVE MONTH DISPLAY, PREV/NEXT STEPPER & COLLAPSE BUTTON -->
                    <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.monthlyHistory.stepMonth(-1)" style="font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.82rem;" title="Previous Month">
                            ◀ Prev Month
                        </button>

                        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); min-width: 170px; text-align: center;">
                            ${periodTitle}
                        </div>

                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.monthlyHistory.stepMonth(1)" style="font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.82rem;" title="Next Month">
                            Next Month ▶
                        </button>

                        <!-- STATUS BADGE -->
                        <div>
                            ${isCurrent ? `
                                <span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.75rem; border-radius: 999px; background: #F0FDF4; color: #16A34A; border: 1px solid #BBF7D0; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.02em;">
                                    <span>🟢</span> Live Current Month
                                </span>
                            ` : `
                                <span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.75rem; border-radius: 999px; background: #F8FAFC; color: #475569; border: 1px solid #CBD5E1; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.02em;">
                                    <span>📁</span> Archived Snapshot
                                </span>
                            `}
                        </div>

                        <!-- POP-UP COLLAPSE / EXPAND TOGGLE BUTTON -->
                        <button type="button" id="cal-toggle-btn" class="btn btn-secondary btn-sm" onclick="window.monthlyHistory.toggleCalendar()" style="
                            display: inline-flex; 
                            align-items: center; 
                            gap: 0.4rem; 
                            font-weight: 800; 
                            font-size: 0.82rem; 
                            padding: 0.35rem 0.85rem; 
                            border-radius: 999px; 
                            background: ${this.isCalendarOpen ? '#FFFFFF' : '#FAF8F5'}; 
                            border: 1.5px solid var(--border-color); 
                            color: var(--text-primary); 
                            cursor: pointer; 
                            transition: all 0.2s ease;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                        " title="${this.isCalendarOpen ? 'Collapse 12-Month Calendar' : 'Expand 12-Month Calendar'}">
                            <span id="cal-toggle-icon" style="font-size: 0.72rem;">${this.isCalendarOpen ? '▲' : '▼'}</span>
                            <span id="cal-toggle-text">${this.isCalendarOpen ? 'Hide Calendar' : 'Show Calendar'}</span>
                        </button>
                    </div>
                </div>

                <!-- 12-MONTH CALENDAR GRID (SMOOTH ANIMATED COLLAPSIBLE) -->
                <div id="history-month-grid-wrapper" style="
                    max-height: ${this.isCalendarOpen ? '220px' : '0px'};
                    opacity: ${this.isCalendarOpen ? '1' : '0'};
                    margin-top: ${this.isCalendarOpen ? '1rem' : '0px'};
                    overflow: hidden;
                    pointer-events: ${this.isCalendarOpen ? 'auto' : 'none'};
                    transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, margin-top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                ">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(85px, 1fr)); gap: 0.5rem; width: 100%;">
                        ${months.map(m => {
                            const isSelected = (m.period === this.selectedMonth);
                            const isLive = m.isCurrent;
                            const isFuture = m.isFuture;
                            const hasData = m.hasData;

                            let bg = '#FFFFFF';
                            let border = '1px solid var(--border-color)';
                            let textColor = 'var(--text-primary)';
                            let opacity = '1';
                            let cursor = 'pointer';

                            if (isSelected) {
                                bg = 'var(--accent-primary)';
                                border = '2px solid var(--accent-primary)';
                                textColor = '#FFFFFF';
                            } else if (isFuture) {
                                bg = '#FAF8F5';
                                textColor = 'var(--text-muted)';
                                opacity = '0.55';
                                cursor = 'default';
                            } else if (hasData) {
                                bg = '#FFFFFF';
                                border = '1.5px solid #CBD5E1';
                            } else {
                                bg = '#FAF9F8';
                                textColor = 'var(--text-secondary)';
                            }

                            return `
                                <div onclick="${isFuture ? '' : `window.monthlyHistory.selectMonth('${m.period}')`}" style="
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                    padding: 0.65rem 0.35rem;
                                    border-radius: 12px;
                                    background: ${bg};
                                    border: ${border};
                                    color: ${textColor};
                                    opacity: ${opacity};
                                    cursor: ${cursor};
                                    user-select: none;
                                    transition: all 0.15s ease;
                                    box-shadow: ${isSelected ? '0 4px 12px rgba(217, 119, 87, 0.28)' : 'none'};
                                    text-align: center;
                                ">
                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.88rem;">
                                        ${m.shortName}
                                    </div>
                                    <div style="font-size: 0.68rem; font-weight: 700; margin-top: 0.25rem; display: flex; align-items: center; gap: 0.2rem;">
                                        ${isSelected ? '● View' : (isLive ? '🟢 Live' : (hasData ? `${m.dms > 0 ? `${m.dms} DMs` : 'Data'}` : '—'))}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

            </div>
        `;

        calContainer.innerHTML = html;
        this.lastCalendarJson = JSON.stringify(this.calendarData);
    },

    selectYear(year) {
        this.selectedYear = year;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().toISOString().slice(0, 7);

        if (year === currentYear) {
            this.selectedMonth = currentMonth;
        } else {
            // Find month with data in this year, or default to last month of that year
            const cal = this.calendarData;
            const monthsInYear = (cal && cal.calendarByYear && cal.calendarByYear[year]) || [];
            const withData = monthsInYear.filter(m => m.hasData);
            if (withData.length > 0) {
                this.selectedMonth = withData[withData.length - 1].period;
            } else {
                this.selectedMonth = `${year}-12`;
            }
        }

        this.renderCalendarNav();
        this.loadMonthData(this.selectedMonth);
    },

    selectMonth(period) {
        if (!period || period === this.selectedMonth) return;
        this.selectedMonth = period;
        this.selectedYear = parseInt(period.split('-')[0], 10);
        this.renderCalendarNav();
        this.loadMonthData(period);
    },

    stepMonth(offset) {
        const [yStr, mStr] = (this.selectedMonth || '').split('-');
        let y = parseInt(yStr, 10);
        let m = parseInt(mStr, 10) + offset;

        if (m < 1) {
            m = 12;
            y -= 1;
        } else if (m > 12) {
            m = 1;
            y += 1;
        }

        const newPeriod = `${y}-${String(m).padStart(2, '0')}`;
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Don't step into future months beyond current month
        if (newPeriod > currentMonth) {
            App.showToast('Future months do not have historical data yet.', 'info');
            return;
        }

        this.selectedMonth = newPeriod;
        this.selectedYear = y;
        this.renderCalendarNav();
        this.loadMonthData(newPeriod);
    },

    async loadMonthData(period, isSilent = false) {
        const content = document.getElementById('history-content');
        // ONLY show full spinner on initial empty load when no data exists yet
        if (content && !this.currentData && !isSilent) {
            content.innerHTML = `<div class="text-center" style="padding: 3rem;"><div class="spinner"></div></div>`;
        }

        try {
            const data = await App.apiCall('GET', `/api/history/month?period=${period}`);
            const dataJson = JSON.stringify(data);
            if (isSilent && dataJson === this.lastRenderedDataJson) {
                // Zero DOM modification if data is identical
                return;
            }
            this.currentData = data;
            this.lastRenderedDataJson = dataJson;
            this.renderHistoryView(data);
        } catch (err) {
            console.error('[History] Error fetching month data:', err);
            if (content && !this.currentData) {
                content.innerHTML = `
                    <div class="empty-state">
                        <h3>Error loading monthly history</h3>
                        <p>${err.message}</p>
                        <button class="btn btn-primary" onclick="window.monthlyHistory.loadMonthData('${period}')">Retry</button>
                    </div>
                `;
            }
        }
    },

    exportCsv() {
        if (!this.currentData) {
            App.showToast('No data available to export', 'warning');
            return;
        }

        const period = this.currentData.period || this.selectedMonth;
        const reels = this.currentData.reels || [];

        let csv = 'Reel Title,Type,Status,Views,Comments,DMs Dispatched,Link Clicks,CTR %\n';
        reels.forEach(r => {
            const views = r.views_count || 0;
            const comments = r.comments_count || 0;
            const dms = r.dms_sent || 0;
            const clicks = r.clicks || 0;
            const ctr = dms > 0 ? Math.min(100, Math.round((clicks / dms) * 100)) : 0;
            const statusText = r.status === 'deleted' ? 'Deleted from Page' : 'Live on Page';
            csv += `"${(r.caption || 'Reel').replace(/"/g, '""')}",${r.media_product_type || r.media_type || 'REEL'},${statusText},${views},${comments},${dms},${clicks},${ctr}%\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Monthly_History_${period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    renderHistoryView(data) {
        const content = document.getElementById('history-content');
        if (!content) return;

        const summary = data.summary || {};
        const totalViews = summary.totalViews || 0;
        const totalComments = summary.totalComments || 0;
        const totalDms = summary.totalDms || 0;
        const totalClicks = summary.totalClicks || 0;
        const overallCtr = summary.overallCtr || 0;

        const reels = data.reels || [];
        const isCurrent = data.isCurrentMonth;
        const periodTitle = data.periodTitle || this.selectedMonth;

        let html = '';

        // 1. FOUR TOP STAT CARDS FOR THIS SPECIFIC MONTH
        html += `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; width: 100%;">
                
                <div class="card" style="padding: 1.15rem 1.45rem; border-radius: 14px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 1px 4px rgba(0,0,0,0.02);">
                    <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">MONTHLY REEL VIEWS</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.7rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">
                        ${totalViews.toLocaleString()}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">${isCurrent ? 'Live Instagram views' : 'Archived monthly views'}</div>
                </div>

                <div class="card" style="padding: 1.15rem 1.45rem; border-radius: 14px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 1px 4px rgba(0,0,0,0.02);">
                    <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">MONTHLY COMMENTS</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.7rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">
                        ${totalComments.toLocaleString()}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">Engagement in ${periodTitle}</div>
                </div>

                <div class="card" style="padding: 1.15rem 1.45rem; border-radius: 14px; background: #FAF8F5; border: 1.5px solid var(--accent-primary); box-shadow: 0 2px 10px rgba(217,119,87,0.08);">
                    <div style="font-size: 0.72rem; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.04em;">AUTOMATED DMS DISPATCHED</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.7rem; font-weight: 800; color: var(--accent-primary); margin-top: 0.25rem;">
                        ${totalDms.toLocaleString()}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">DMs sent in ${periodTitle}</div>
                </div>

                <div class="card" style="padding: 1.15rem 1.45rem; border-radius: 14px; background: #F0F9FF; border: 1.5px solid #0369A1; box-shadow: 0 2px 10px rgba(3,105,161,0.08);">
                    <div style="font-size: 0.72rem; font-weight: 800; color: #0369A1; text-transform: uppercase; letter-spacing: 0.04em;">RESOURCE LINK CLICKS</div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.7rem; font-weight: 800; color: #0369A1; margin-top: 0.25rem;">
                        ${totalClicks.toLocaleString()}
                    </div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: #2E7D32; margin-top: 0.15rem;">🎯 ${overallCtr}% Conversion CTR</div>
                </div>

            </div>
        `;

        // 2. BREAKDOWN TABLE
        html += `
            <div class="card" style="padding: 1.6rem; border-radius: 18px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0,0,0,0.03); width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                    <div>
                        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.2rem; color: var(--text-primary); margin: 0;">
                            Performance Breakdown for ${periodTitle}
                        </h3>
                        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.15rem;">
                            ${isCurrent ? 'Real-time performance ledger updated live from Instagram.' : 'Sealed monthly snapshot archived for audit tracking.'}
                        </p>
                    </div>
                    <div>
                        ${isCurrent ? `
                            <span style="font-size: 0.78rem; font-weight: 800; color: #16A34A; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 0.35rem 0.85rem; border-radius: 999px;">
                                🟢 Live Instagram Sync Active
                            </span>
                        ` : `
                            <span style="font-size: 0.78rem; font-weight: 800; color: #475569; background: #F1F5F9; border: 1px solid #CBD5E1; padding: 0.35rem 0.85rem; border-radius: 999px;">
                                📁 Sealed Historical Record
                            </span>
                        `}
                    </div>
                </div>
        `;

        if (reels.length === 0) {
            html += `
                <div style="padding: 3.5rem 1.5rem; text-align: center; background: #FAF8F5; border-radius: 14px; border: 1px dashed var(--border-color);">
                    <div style="font-size: 2.2rem; margin-bottom: 0.65rem;">📅</div>
                    <h4 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.15rem; color: var(--text-primary); margin: 0 0 0.35rem 0;">No Recorded Activity for ${periodTitle}</h4>
                    <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 440px; margin: 0 auto 1.15rem auto;">
                        There were no reels published or comments recorded in this calendar period.
                    </p>
                    <button class="btn btn-primary btn-sm" onclick="window.monthlyHistory.selectMonth('${this.calendarData?.currentMonth || new Date().toISOString().slice(0, 7)}')" style="font-weight: 700; padding: 0.55rem 1.2rem; border-radius: 8px;">
                        Return to Current Live Month
                    </button>
                </div>
            `;
        } else {
            html += `
                <div style="overflow-x: auto; width: 100%;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 1.5px solid var(--border-color); background: #FAF8F5; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 800;">
                                <th style="padding: 0.85rem 1rem;">REEL CONTENT</th>
                                <th style="padding: 0.85rem 1rem; text-align: center;">POST STATUS</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">VIEWS</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">COMMENTS</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">DMS DISPATCHED</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">LINK CLICKS</th>
                                <th style="padding: 0.85rem 1rem; text-align: right;">CONVERSION RATE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reels.map(r => {
                                const views = r.views_count || 0;
                                const comments = r.comments_count || 0;
                                const dms = r.dms_sent || 0;
                                const clicks = r.clicks || 0;
                                const ctr = r.ctr !== undefined ? r.ctr : (dms > 0 ? Math.min(100, Math.round((clicks / dms) * 100)) : 0);
                                const thumbUrl = r.thumbnail_url || r.media_url || '';
                                const isDeleted = r.status === 'deleted';
                                return `
                                    <tr style="border-bottom: 1px solid var(--border-color); ${isDeleted ? 'background: #FAF9F8;' : ''}">
                                        <td style="padding: 0.95rem 1rem;">
                                            <div style="display: flex; gap: 0.85rem; align-items: center;">
                                                ${thumbUrl ? `
                                                    <div style="width: 44px; height: 44px; border-radius: 10px; background-size: cover; background-position: center; background-image: url('${thumbUrl}'); flex-shrink:0; border: 1px solid var(--border-color);"></div>
                                                ` : `
                                                    <div style="width: 44px; height: 44px; border-radius: 10px; background: var(--accent-soft); color: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink:0;">🎬</div>
                                                `}
                                                <div>
                                                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 0.88rem; color: var(--text-primary); line-height: 1.3;">
                                                        ${(r.caption || 'Instagram Post').slice(0, 50)}...
                                                    </div>
                                                    <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); margin-top: 0.15rem;">
                                                        Type: ${r.media_product_type || r.media_type || 'REELS'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: center;">
                                            ${isDeleted ? `
                                                <span style="
                                                    display: inline-flex;
                                                    align-items: center;
                                                    gap: 0.35rem;
                                                    padding: 0.25rem 0.65rem;
                                                    border-radius: 999px;
                                                    background: #FEF2F2;
                                                    color: #DC2626;
                                                    border: 1px solid #FECACA;
                                                    font-size: 0.75rem;
                                                    font-weight: 800;
                                                    letter-spacing: 0.02em;
                                                    white-space: nowrap;
                                                ">
                                                    <span style="font-size: 0.65rem;">🗑️</span> Deleted from Page
                                                </span>
                                            ` : `
                                                <span style="
                                                    display: inline-flex;
                                                    align-items: center;
                                                    gap: 0.35rem;
                                                    padding: 0.25rem 0.65rem;
                                                    border-radius: 999px;
                                                    background: #F0FDF4;
                                                    color: #16A34A;
                                                    border: 1px solid #BBF7D0;
                                                    font-size: 0.75rem;
                                                    font-weight: 800;
                                                    letter-spacing: 0.02em;
                                                    white-space: nowrap;
                                                ">
                                                    <span style="font-size: 0.65rem;">🟢</span> Live on Page
                                                </span>
                                            `}
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">
                                            ${views.toLocaleString()}
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">
                                            ${comments.toLocaleString()}
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 800; font-size: 0.88rem; color: var(--accent-primary);">
                                            ${dms.toLocaleString()} DMs
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 800; font-size: 0.88rem; color: #0369A1;">
                                            ${clicks.toLocaleString()} Clicks
                                        </td>
                                        <td style="padding: 0.95rem 1rem; text-align: right; font-weight: 800; font-size: 0.88rem; color: #2E7D32;">
                                            ${ctr}% CTR
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        html += `</div>`;
        content.innerHTML = html;
    }
};
