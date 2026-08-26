import React, { useState } from 'react';

/**
 * AboutHandbook - Deep About Section & Comprehensive Meta Developer Handbook Component
 */

export default function AboutHandbook() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const deployedWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/api/webhook`
    : 'https://instaauto.app/api/webhook';

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

  const handleCopyPayload = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(mockPayload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

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
      a: "No! InstaAuto includes an automated background cron worker (`server.js`) that runs silently every 6 hours. It automatically exchanges your token via Meta's `refresh_access_token` endpoint, extending its expiration for another 60 days continuously."
    },
    {
      q: "Why must my Instagram Account be a Business or Creator account?",
      a: "Meta Graph API webhooks require a Facebook Page linked to an Instagram Professional/Business account to trigger automated webhooks for comments and DMs. Personal accounts do not support API webhooks."
    }
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* PAGE HEADER & QUICK DEVELOPER TOOLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', background: '#FFFFFF', padding: '1.75rem', borderRadius: '18px', border: '1px solid #E6E1D8', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.8rem' }}>📘</span>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.85rem', letterSpacing: '-0.03em', color: '#2C2A29', margin: 0 }}>
              About InstaAuto & Meta Developer Handbook
            </h1>
          </div>
          <p style={{ fontSize: '0.95rem', color: '#736E68', marginTop: '0.2rem' }}>
            The definitive developer guide for Meta Graph API webhooks, Instagram comment-to-DM automations, App IDs, secrets, and rate limit rules.
          </p>
        </div>

        {/* QUICK LINK DEVELOPER BUTTONS */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '0.55rem 1rem', fontSize: '0.84rem', fontWeight: 700, color: '#D97757', background: '#FDF8F6', border: '1px solid #D97757', borderRadius: '9px', cursor: 'pointer' }}>
              🔗 Meta App Dashboard
            </button>
          </a>
          <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '0.55rem 1rem', fontSize: '0.84rem', fontWeight: 700, color: '#2C2A29', background: '#FAF8F5', border: '1px solid #E6E1D8', borderRadius: '9px', cursor: 'pointer' }}>
              🛠️ Graph Explorer
            </button>
          </a>
          <a href="https://developers.facebook.com/tools/debug/accesstoken" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '0.55rem 1rem', fontSize: '0.84rem', fontWeight: 700, color: '#2C2A29', background: '#FAF8F5', border: '1px solid #E6E1D8', borderRadius: '9px', cursor: 'pointer' }}>
              🧪 Token Debugger
            </button>
          </a>
        </div>
      </div>

      {/* ZONE 1: WHAT IS INSTAAUTO & 3 CORE PILLARS */}
      <div style={{ padding: '1.75rem', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.35rem', color: '#2C2A29', margin: '0 0 0.65rem 0' }}>
          🚀 What is InstaAuto?
        </h2>
        <p style={{ fontSize: '0.94rem', color: '#2C2A29', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
          <strong>InstaAuto</strong> is a state-of-the-art Instagram Comment-to-DM Automation platform designed for high-growth creators, digital agencies, and businesses. When a follower comments a specific trigger keyword (such as <code>"PLAYBOOK"</code>, <code>"PDF"</code>, or <code>"LINK"</code>) under your Reels or posts, InstaAuto instantly intercepts the webhook and dispatches automated private direct messages, deliverable PDF resources, and follow-verification gates in real-time.
        </p>

        {/* 3 CORE BENEFIT PILLARS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#FAF8F5', border: '1px solid #E6E1D8' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>🎯</div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#2C2A29', margin: '0 0 0.25rem 0' }}>
              10x Higher Lead Conversion
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#736E68', margin: 0, lineHeight: 1.5 }}>
              Convert casual Reel viewers into email subscribers and customers while viewer interest is at its highest peak.
            </p>
          </div>

          <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#FDF8F6', border: '2px solid #D97757' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>🔐</div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#D97757', margin: '0 0 0.25rem 0' }}>
              Follow-First Verification Gate
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#2C2A29', margin: 0, lineHeight: 1.5 }}>
              Require commenters to follow `@creator.studio` before unlocking PDF links, multiplying organic account growth exponentially.
            </p>
          </div>

          <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#FAF8F5', border: '1px solid #E6E1D8' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>🛡️</div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#2C2A29', margin: '0 0 0.25rem 0' }}>
              100% Meta Graph API Compliant
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#736E68', margin: 0, lineHeight: 1.5 }}>
              Operates strictly on official Meta Graph API webhooks with natural delay queue pacing and 60-day auto-refreshing tokens.
            </p>
          </div>
        </div>
      </div>

      {/* ZONE 2: STEP-BY-STEP META DEVELOPER SETUP HANDBOOK */}
      <div style={{ padding: '1.75rem', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.35rem', color: '#2C2A29', margin: '0 0 0.25rem 0' }}>
            🛠️ Step-by-Step Meta Developer Setup Handbook
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#736E68', margin: 0 }}>
            Follow this step-by-step handbook to configure your Meta Developer App, obtain App credentials, and enable live webhooks.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          
          {/* STEP 1 */}
          <div style={{ padding: '1.35rem', borderRadius: '14px', background: '#FAF8F5', border: '1px solid #E6E1D8' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97757', textTransform: 'uppercase', marginBottom: '0.35rem' }}>STEP 1</div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#2C2A29', margin: '0 0 0.65rem 0' }}>
              Create Meta Developer Account & Business App
            </h3>
            <ol style={{ fontSize: '0.85rem', color: '#2C2A29', paddingLeft: '1.2rem', margin: 0, lineHeight: 1.6 }}>
              <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style={{ color: '#D97757', fontWeight: 700 }}>developers.facebook.com</a> and log in.</li>
              <li>Click <strong>My Apps</strong> → <strong>Create App</strong>.</li>
              <li>Select <strong>Business</strong> as the App Type (required for Instagram Graph API access).</li>
              <li>Enter your App Display Name (e.g. <code>InstaAuto Engine</code>) and business email.</li>
            </ol>
          </div>

          {/* STEP 2 */}
          <div style={{ padding: '1.35rem', borderRadius: '14px', background: '#FAF8F5', border: '1px solid #E6E1D8' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97757', textTransform: 'uppercase', marginBottom: '0.35rem' }}>STEP 2</div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#2C2A29', margin: '0 0 0.65rem 0' }}>
              Extract Meta App ID & Meta App Secret
            </h3>
            <ol style={{ fontSize: '0.85rem', color: '#2C2A29', paddingLeft: '1.2rem', margin: 0, lineHeight: 1.6 }}>
              <li>In Meta Dashboard, navigate to <strong>App Settings → Basic</strong>.</li>
              <li>Copy the numeric <strong>App ID</strong> (e.g. <code>9876543210123</code>).</li>
              <li>Click <strong>Show</strong> next to <strong>App Secret</strong>, re-enter your password, and copy the secret.</li>
              <li>Paste both keys in <a href="#setup" style={{ color: '#D97757', fontWeight: 700 }}>Settings & Setup</a>!</li>
            </ol>
          </div>

          {/* STEP 3 */}
          <div style={{ padding: '1.35rem', borderRadius: '14px', background: '#FAF8F5', border: '1px solid #E6E1D8' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97757', textTransform: 'uppercase', marginBottom: '0.35rem' }}>STEP 3</div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#2C2A29', margin: '0 0 0.65rem 0' }}>
              Configure Instagram Graph API & Webhook Callback
            </h3>
            <ol style={{ fontSize: '0.85rem', color: '#2C2A29', paddingLeft: '1.2rem', margin: 0, lineHeight: 1.6 }}>
              <li>In Meta Dashboard, click <strong>Add Product → Instagram Graph API</strong>.</li>
              <li>Go to <strong>Webhooks</strong> tab → click <strong>Subscribe to this Object</strong>.</li>
              <li>Paste your Callback URL: <code>{deployedWebhookUrl}</code>.</li>
              <li>Subscribe to <code>comments</code> and <code>messages</code> webhook fields.</li>
            </ol>
          </div>

        </div>

        {/* WEBHOOK JSON PAYLOAD INSPECTOR / SIMULATOR BOX */}
        <div style={{ padding: '1.25rem', background: '#FAF8F5', border: '1px solid #E6E1D8', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2C2A29', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🧪 Meta Instagram Comment Webhook Payload Format:
            </div>
            <button
              onClick={handleCopyPayload}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, color: '#2C2A29', background: '#FFFFFF', border: '1px solid #D1C9BE', borderRadius: '7px', cursor: 'pointer' }}
            >
              {copiedPayload ? '✓ Copied Payload!' : '📋 Copy Sample JSON'}
            </button>
          </div>

          <pre style={{ margin: 0, padding: '0.85rem 1.1rem', background: '#FFFFFF', border: '1px solid #E6E1D8', borderRadius: '10px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#2C2A29', overflowX: 'auto', lineHeight: 1.45 }}>
            {mockPayload}
          </pre>
        </div>
      </div>

      {/* ZONE 3: TECHNICAL DEEP DIVE & META API RULES */}
      <div style={{ padding: '1.75rem', borderRadius: '18px', background: '#F0F9FF', border: '1px solid #BAE6FD', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.25rem', color: '#0369A1', margin: '0 0 0.85rem 0' }}>
          ⚡ Meta Graph API Technical Specifications & Constraints
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: '#FFFFFF', padding: '1.15rem', borderRadius: '14px', border: '1px solid #E0F2FE' }}>
            <strong style={{ color: '#0369A1', fontSize: '0.92rem', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'block', marginBottom: '0.25rem' }}>
              ⏱️ 7-Day Private Reply Window
            </strong>
            <p style={{ fontSize: '0.84rem', color: '#0369A1', margin: 0, lineHeight: 1.5 }}>
              Meta Graph API rules permit sending 1 private DM response per comment trigger within 7 days of comment creation.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.15rem', borderRadius: '14px', border: '1px solid #E0F2FE' }}>
            <strong style={{ color: '#0369A1', fontSize: '0.92rem', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'block', marginBottom: '0.25rem' }}>
              🔑 60-Day Token Auto-Extension
            </strong>
            <p style={{ fontSize: '0.84rem', color: '#0369A1', margin: 0, lineHeight: 1.5 }}>
              InstaAuto exchanges 1-hour short-lived tokens for 60-day long-lived tokens, refreshing them silently in background every 6 hours.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.15rem', borderRadius: '14px', border: '1px solid #E0F2FE' }}>
            <strong style={{ color: '#0369A1', fontSize: '0.92rem', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'block', marginBottom: '0.25rem' }}>
              🛡️ Rate Limit Safety Pacing
            </strong>
            <p style={{ fontSize: '0.84rem', color: '#0369A1', margin: 0, lineHeight: 1.5 }}>
              Meta caps DMs at 250/hr per account. InstaAuto's delay queue pacing ensures zero risk of account flags or rate blocks.
            </p>
          </div>
        </div>
      </div>

      {/* ZONE 4: FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
      <div style={{ padding: '1.75rem', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.35rem', color: '#2C2A29', margin: '0 0 0.85rem 0' }}>
          ❓ Frequently Asked Developer Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;

            return (
              <div
                key={idx}
                onClick={() => setActiveFaq(isOpen ? null : idx)}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: isOpen ? '#FDF8F6' : '#FAF8F5',
                  border: isOpen ? '2px solid #D97757' : '1px solid #E6E1D8',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: '0.92rem', color: isOpen ? '#D97757' : '#2C2A29' }}>
                  <span>{faq.q}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{isOpen ? '−' : '+'}</span>
                </div>

                {isOpen && (
                  <div style={{ marginTop: '0.65rem', fontSize: '0.86rem', color: '#2C2A29', lineHeight: 1.5, borderTop: '1px solid #F2E3D5', paddingTop: '0.65rem' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
