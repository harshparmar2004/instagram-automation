window.about = {
    activeFaq: null,

    async render(container) {
        const deployedWebhookUrl = `${window.location.protocol}//${window.location.host}/api/webhook`;

        const mockPayload = `{
  "object": "instagram",
  "entry": [{
    "id": "17841400000000000",
    "time": 1774272000,
    "changes": [{
      "field": "comments",
      "value": {
        "id": "17999887766554433",
        "text": "PLAYBOOK",
        "from": {
          "id": "9988776655",
          "username": "sarah_creator"
        },
        "media": {
          "id": "17992019201"
        }
      }
    }]
  }]
}`;

        const faqs = [
            {
                q: "What happens if a commenter is not following @creator.studio yet?",
                a: "When Follow-First Gate is enabled, InstaAuto sends a polite Private DM asking them to follow your account first. Once they click Follow and reply 'I FOLLOWED' in the DM, InstaAuto's state machine automatically verifies their reply and delivers your PDF link!"
            },
            {
                q: "How does InstaAuto prevent Meta spam blocks and rate limits?",
                a: "Meta Graph API enforces a strict rate limit of 250 private replies per hour per account. InstaAuto includes a built-in Queue Worker that enforces delay pacing (e.g. 5 seconds per DM dispatch), keeping your account safely compliant."
            },
            {
                q: "Do I need to manually refresh my Meta Access Tokens every 60 days?",
                a: "No! InstaAuto includes an automated background cron worker (server.js) that runs silently every 6 hours. It automatically exchanges your token via Meta's refresh_access_token endpoint, extending its expiration for another 60 days continuously."
            },
            {
                q: "Why must my Instagram Account be a Business or Creator account?",
                a: "Meta Graph API webhooks require a Facebook Page linked to an Instagram Professional/Business account to trigger automated webhooks for comments and DMs. Personal accounts do not support API webhooks."
            }
        ];

        let faqHtml = '';
        faqs.forEach((faq, idx) => {
            const isOpen = this.activeFaq === idx;
            faqHtml += `
                <div class="faq-item" onclick="window.about.toggleFaq(${idx})" style="padding: 1rem 1.25rem; border-radius: 12px; background: ${isOpen ? '#FDF8F6' : '#FAF8F5'}; border: ${isOpen ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'}; cursor: pointer; transition: all 0.15s ease-in-out;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.92rem; color: ${isOpen ? 'var(--accent-primary)' : 'var(--text-primary)'};">
                        <span>${faq.q}</span>
                        <span style="font-size: 1.1rem; font-weight: 800;">${isOpen ? '−' : '+'}</span>
                    </div>
                    ${isOpen ? `
                        <div style="margin-top: 0.65rem; font-size: 0.86rem; color: var(--text-primary); line-height: 1.5; border-top: 1px solid #F2E3D5; padding-top: 0.65rem;">
                            ${faq.a}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = `
            <div class="view" id="about-view" style="width: 100%; max-width: 1380px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.75rem;">
                
                <!-- PAGE HEADER & QUICK DEVELOPER TOOLS -->
                <div class="card" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1.25rem; padding: 1.75rem; border-radius: 18px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.35rem;">
                            <span style="font-size: 1.8rem;">📘</span>
                            <h1 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.85rem; letter-spacing: -0.03em; color: var(--text-primary); margin: 0;">
                                About InstaAuto & Meta Developer Handbook
                            </h1>
                        </div>
                        <p style="font-size: 0.95rem; color: var(--text-secondary); margin-top: 0.2rem;">
                            The definitive developer guide for Meta Graph API webhooks, Instagram comment-to-DM automations, App IDs, secrets, and rate limit rules.
                        </p>
                    </div>

                    <!-- QUICK LINK DEVELOPER BUTTONS -->
                    <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
                        <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" style="text-decoration: none;">
                            <button class="btn btn-secondary" style="padding: 0.55rem 1rem; font-size: 0.84rem; font-weight: 700; color: var(--accent-primary); border-color: var(--accent-primary);">
                                🔗 Meta App Dashboard
                            </button>
                        </a>
                        <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" style="text-decoration: none;">
                            <button class="btn btn-secondary" style="padding: 0.55rem 1rem; font-size: 0.84rem; font-weight: 700;">
                                🛠️ Graph Explorer
                            </button>
                        </a>
                        <a href="https://developers.facebook.com/tools/debug/accesstoken" target="_blank" rel="noreferrer" style="text-decoration: none;">
                            <button class="btn btn-secondary" style="padding: 0.55rem 1rem; font-size: 0.84rem; font-weight: 700;">
                                🧪 Token Debugger
                            </button>
                        </a>
                    </div>
                </div>

                <!-- ZONE 1: WHAT IS INSTAAUTO -->
                <div class="card" style="padding: 1.75rem; border-radius: 18px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                    <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.35rem; color: var(--text-primary); margin: 0 0 0.65rem 0;">
                        🚀 What is InstaAuto?
                    </h2>
                    <p style="font-size: 0.94rem; color: var(--text-primary); line-height: 1.6; margin: 0 0 1.25rem 0;">
                        <strong>InstaAuto</strong> is a state-of-the-art Instagram Comment-to-DM Automation platform designed for high-growth creators, digital agencies, and businesses. When a follower comments a specific trigger keyword (such as <code>"PLAYBOOK"</code>, <code>"PDF"</code>, or <code>"LINK"</code>) under your Reels or posts, InstaAuto instantly intercepts the webhook and dispatches automated private direct messages, deliverable PDF resources, and follow-verification gates in real-time.
                    </p>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
                        <div style="padding: 1.25rem; border-radius: 14px; background: #FAF8F5; border: 1px solid var(--border-color);">
                            <div style="font-size: 1.4rem; margin-bottom: 0.35rem;">🎯</div>
                            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); margin: 0 0 0.25rem 0;">
                                10x Higher Lead Conversion
                            </h3>
                            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
                                Convert casual Reel viewers into email subscribers and customers while viewer interest is at its highest peak.
                            </p>
                        </div>

                        <div style="padding: 1.25rem; border-radius: 14px; background: #FDF8F6; border: 2px solid var(--accent-primary);">
                            <div style="font-size: 1.4rem; margin-bottom: 0.35rem;">🔐</div>
                            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.05rem; color: var(--accent-primary); margin: 0 0 0.25rem 0;">
                                Follow-First Verification Gate
                            </h3>
                            <p style="font-size: 0.85rem; color: var(--text-primary); margin: 0; line-height: 1.5;">
                                Require commenters to follow @creator.studio before unlocking PDF links, multiplying organic account growth exponentially.
                            </p>
                        </div>

                        <div style="padding: 1.25rem; border-radius: 14px; background: #FAF8F5; border: 1px solid var(--border-color);">
                            <div style="font-size: 1.4rem; margin-bottom: 0.35rem;">🛡️</div>
                            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); margin: 0 0 0.25rem 0;">
                                100% Meta Graph API Compliant
                            </h3>
                            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
                                Operates strictly on official Meta Graph API webhooks with natural delay queue pacing and 60-day auto-refreshing tokens.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- ZONE 2: STEP-BY-STEP HANDBOOK GRID -->
                <div class="card" style="padding: 1.75rem; border-radius: 18px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                    <div style="margin-bottom: 1.5rem;">
                        <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.35rem; color: var(--text-primary); margin: 0 0 0.25rem 0;">
                            🛠️ Step-by-Step Meta Developer Setup Handbook
                        </h2>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0;">
                            Follow this step-by-step handbook to configure your Meta Developer App, obtain App credentials, and enable live webhooks.
                        </p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                        
                        <div style="padding: 1.35rem; border-radius: 14px; background: #FAF8F5; border: 1px solid var(--border-color);">
                            <div style="font-size: 0.75rem; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; margin-bottom: 0.35rem;">STEP 1</div>
                            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); margin: 0 0 0.65rem 0;">
                                Create Meta Developer Account & Business App
                            </h3>
                            <ol style="font-size: 0.85rem; color: var(--text-primary); padding-left: 1.2rem; margin: 0; line-height: 1.6;">
                                <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style="color: var(--accent-primary); font-weight: 700;">developers.facebook.com</a> and log in.</li>
                                <li>Click <strong>My Apps</strong> → <strong>Create App</strong>.</li>
                                <li>Select <strong>Business</strong> as the App Type (required for Instagram Graph API access).</li>
                                <li>Enter your App Display Name (e.g. <code>InstaAuto Engine</code>) and business email.</li>
                            </ol>
                        </div>

                        <div style="padding: 1.35rem; border-radius: 14px; background: #FAF8F5; border: 1px solid var(--border-color);">
                            <div style="font-size: 0.75rem; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; margin-bottom: 0.35rem;">STEP 2</div>
                            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); margin: 0 0 0.65rem 0;">
                                Extract Meta App ID & Meta App Secret
                            </h3>
                            <ol style="font-size: 0.85rem; color: var(--text-primary); padding-left: 1.2rem; margin: 0; line-height: 1.6;">
                                <li>In Meta Dashboard, navigate to <strong>App Settings → Basic</strong>.</li>
                                <li>Copy the numeric <strong>App ID</strong> (e.g. <code>9876543210123</code>).</li>
                                <li>Click <strong>Show</strong> next to <strong>App Secret</strong>, re-enter your password, and copy the secret.</li>
                                <li>Paste both keys in <a href="#setup" onclick="App.navigate('setup')" style="color: var(--accent-primary); font-weight: 700;">Settings & Setup</a>!</li>
                            </ol>
                        </div>

                        <div style="padding: 1.35rem; border-radius: 14px; background: #FAF8F5; border: 1px solid var(--border-color);">
                            <div style="font-size: 0.75rem; font-weight: 800; color: var(--accent-primary); text-transform: uppercase; margin-bottom: 0.35rem;">STEP 3</div>
                            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); margin: 0 0 0.65rem 0;">
                                Configure Instagram Graph API & Webhook Callback
                            </h3>
                            <ol style="font-size: 0.85rem; color: var(--text-primary); padding-left: 1.2rem; margin: 0; line-height: 1.6;">
                                <li>In Meta Dashboard, click <strong>Add Product → Instagram Graph API</strong>.</li>
                                <li>Go to <strong>Webhooks</strong> tab → click <strong>Subscribe to this Object</strong>.</li>
                                <li>Paste your Callback URL: <code>${deployedWebhookUrl}</code>.</li>
                                <li>Subscribe to <code>comments</code> and <code>messages</code> webhook fields.</li>
                            </ol>
                        </div>

                    </div>

                    <!-- WEBHOOK JSON PAYLOAD INSPECTOR -->
                    <div style="padding: 1.25rem; background: #FAF8F5; border: 1px solid var(--border-color); border-radius: 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                            <div style="font-size: 0.8rem; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.04em;">
                                🧪 Meta Instagram Comment Webhook Payload Format:
                            </div>
                            <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(\`${mockPayload}\`); App.showToast('Sample JSON copied to clipboard!', 'success');" style="font-weight: 700;">
                                📋 Copy Sample JSON
                            </button>
                        </div>

                        <pre style="margin: 0; padding: 0.85rem 1.1rem; background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 10px; font-family: monospace; font-size: 0.82rem; color: var(--text-primary); overflow-x: auto; line-height: 1.45;">${mockPayload}</pre>
                    </div>
                </div>

                <!-- ZONE 3: TECHNICAL DEEP DIVE & META API RULES -->
                <div style="padding: 1.75rem; border-radius: 18px; background: #F0F9FF; border: 1px solid #BAE6FD; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
                    <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.25rem; color: #0369A1; margin: 0 0 0.85rem 0;">
                        ⚡ Meta Graph API Technical Specifications & Constraints
                    </h2>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
                        <div style="background: #FFFFFF; padding: 1.15rem; border-radius: 14px; border: 1px solid #E0F2FE;">
                            <strong style="color: #0369A1; font-size: 0.92rem; font-family: 'Plus Jakarta Sans', sans-serif; display: block; margin-bottom: 0.25rem;">
                                ⏱️ 7-Day Private Reply Window
                            </strong>
                            <p style="font-size: 0.84rem; color: #0369A1; margin: 0; line-height: 1.5;">
                                Meta Graph API rules permit sending 1 private DM response per comment trigger within 7 days of comment creation.
                            </p>
                        </div>

                        <div style="background: #FFFFFF; padding: 1.15rem; border-radius: 14px; border: 1px solid #E0F2FE;">
                            <strong style="color: #0369A1; font-size: 0.92rem; font-family: 'Plus Jakarta Sans', sans-serif; display: block; margin-bottom: 0.25rem;">
                                🔑 60-Day Token Auto-Extension
                            </strong>
                            <p style="font-size: 0.84rem; color: #0369A1; margin: 0; line-height: 1.5;">
                                InstaAuto exchanges 1-hour short-lived tokens for 60-day long-lived tokens, refreshing them silently in background every 6 hours.
                            </p>
                        </div>

                        <div style="background: #FFFFFF; padding: 1.15rem; border-radius: 14px; border: 1px solid #E0F2FE;">
                            <strong style="color: #0369A1; font-size: 0.92rem; font-family: 'Plus Jakarta Sans', sans-serif; display: block; margin-bottom: 0.25rem;">
                                🛡️ Rate Limit Safety Pacing
                            </strong>
                            <p style="font-size: 0.84rem; color: #0369A1; margin: 0; line-height: 1.5;">
                                Meta caps DMs at 250/hr per account. InstaAuto's delay queue pacing ensures zero risk of account flags or rate blocks.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- ZONE 4: FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) -->
                <div class="card" style="padding: 1.75rem; border-radius: 18px; background: #FFFFFF; border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                    <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.35rem; color: var(--text-primary); margin: 0 0 0.85rem 0;">
                        ❓ Frequently Asked Developer Questions
                    </h2>

                    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                        ${faqHtml}
                    </div>
                </div>

            </div>
        `;
    },

    toggleFaq(idx) {
        this.activeFaq = this.activeFaq === idx ? null : idx;
        this.render(document.getElementById('view-container'));
    }
};
