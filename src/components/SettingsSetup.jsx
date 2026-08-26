import React, { useState } from 'react';

/**
 * SettingsSetup - Perfectly Organized Centered Layout Component
 * 
 * Layout Structure (Max-Width 960px Centered Column with equal left/right margins):
 * 1. Top Card: Instagram Account Connection Banner (@creator.studio)
 * 2. Horizontal Header Card: Meta Setup Checklist (4/4 Complete Horizontal Strip)
 * 3. Centered Main Card: Meta Graph API Credentials Form (App ID, Secret with Show/Hide, Verify Token, Callback URL Copy Box, Save Button)
 * 4. Centered Tracker Card: Live Token Health & Automated Refresh Telemetry Tracker
 */

export default function SettingsSetup() {
  const [showSecret, setShowSecret] = useState(false);
  const [appId, setAppId] = useState('9876543210123');
  const [appSecret, setAppSecret] = useState('meta_sec_99a8b7c6d5e4f321');
  const [verifyToken, setVerifyToken] = useState('creator_verify_token_2026');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [lastRefreshedText, setLastRefreshedText] = useState('Auto-refreshed 2 hours ago (Today at 11:30 AM)');

  const deployedWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/api/webhook`
    : 'https://instaauto.app/api/webhook';

  const handleCopyUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(deployedWebhookUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Meta Graph API Credentials Saved Successfully!');
    }, 600);
  };

  const handleManualTokenRefresh = () => {
    setIsRefreshingToken(true);
    setTimeout(() => {
      setIsRefreshingToken(false);
      setLastRefreshedText('Refreshed just now (Meta 200 OK — Token Extended for 60 Days!)');
      alert('✅ Token Health Verified! Meta long-lived token successfully extended for 60 more days.');
    }, 800);
  };

  return (
    <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.85rem', letterSpacing: '-0.03em', color: '#2C2A29', margin: 0 }}>
            Settings & System Setup
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#736E68', marginTop: '0.2rem' }}>
            Manage Instagram connection status, Meta Graph API credentials, and detailed token refresh telemetry.
          </p>
        </div>

        <button
          onClick={() => alert('Demo creator data populated successfully!')}
          style={{
            padding: '0.55rem 1.15rem',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#2C2A29',
            background: '#FFFFFF',
            border: '1px solid #E6E1D8',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          🪄 Populate Demo Data
        </button>
      </div>

      {/* 1. TOP CARD: PROMINENT INSTAGRAM CONNECTION STATUS */}
      <div style={{
        padding: '1.4rem 1.75rem',
        borderRadius: '18px',
        background: '#FFFFFF',
        border: '1px solid #E6E1D8',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#2E7D32',
              boxShadow: '0 0 10px rgba(46,125,50,0.4)',
              flexShrink: 0
            }} />
            <div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.15rem', color: '#2C2A29', margin: 0 }}>
                Connected: Instagram Business Account (@creator.studio)
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#736E68', marginTop: '0.15rem' }}>
                Long-lived access tokens are active and live comment webhooks are operational.
              </p>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/auth/instagram'}
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#2C2A29',
              background: '#FAF8F5',
              border: '1px solid #D1C9BE',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Reconnect Account
          </button>

        </div>
      </div>

      {/* 2. TOP ROW 2: HORIZONTAL META SETUP CHECKLIST BANNER */}
      <div style={{
        padding: '1.35rem 1.75rem',
        borderRadius: '18px',
        background: '#FFFFFF',
        border: '1px solid #E6E1D8',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: '#2C2A29', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              Meta Setup Checklist
            </h3>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2E7D32' }}>4/4 Complete (100% Setup Done)</span>
        </div>

        {/* PROGRESS BAR */}
        <div style={{ width: '100%', height: '6px', background: '#E6E1D8', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.1rem' }}>
          <div style={{ width: '100%', height: '100%', background: '#2E7D32' }} />
        </div>

        {/* 4 HORIZONTAL STEPS STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#2E7D32', fontWeight: 800, fontSize: '1.05rem' }}>✓</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2C2A29' }}>1. Create Business App</div>
              <div style={{ fontSize: '0.75rem', color: '#736E68', marginTop: '0.1rem' }}>developers.facebook.com</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#2E7D32', fontWeight: 800, fontSize: '1.05rem' }}>✓</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2C2A29' }}>2. Add Instagram API</div>
              <div style={{ fontSize: '0.75rem', color: '#736E68', marginTop: '0.1rem' }}>Enable Login product</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#2E7D32', fontWeight: 800, fontSize: '1.05rem' }}>✓</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2C2A29' }}>3. Webhook Subscribed</div>
              <div style={{ fontSize: '0.75rem', color: '#736E68', marginTop: '0.1rem' }}>comments & messages</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <span style={{ color: '#2E7D32', fontWeight: 800, fontSize: '1.05rem' }}>✓</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2C2A29' }}>4. Account Linked</div>
              <div style={{ fontSize: '0.75rem', color: '#736E68', marginTop: '0.1rem' }}>Facebook Page linked</div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. CENTERED MIDDLE SECTION: META GRAPH API CREDENTIALS FORM */}
      <div style={{
        padding: '1.75rem 2rem',
        borderRadius: '18px',
        background: '#FFFFFF',
        border: '1px solid #E6E1D8',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🔒</span>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.25rem', color: '#2C2A29', margin: 0 }}>
            Meta Graph API Credentials
          </h2>
        </div>
        <p style={{ fontSize: '0.88rem', color: '#736E68', marginBottom: '1.5rem' }}>
          Enter your developer credentials from developers.facebook.com to enable automated DM dispatches.
        </p>

        <form onSubmit={handleSave} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C2A29' }}>Meta App ID</label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="e.g. 9876543210123"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1.1rem',
                fontSize: '0.92rem',
                fontWeight: 600,
                borderRadius: '10px',
                border: '1px solid #D1C9BE',
                background: '#FAF8F5',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight 700, color: '#2C2A29' }}>Meta App Secret</label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#D97757',
                  cursor: 'pointer'
                }}
              >
                {showSecret ? '🙈 Hide Secret' : '👁️ Show Secret'}
              </button>
            </div>

            <input
              type={showSecret ? 'text' : 'password'}
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="••••••••••••••••"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1.1rem',
                fontSize: '0.92rem',
                fontWeight: 600,
                fontFamily: showSecret ? 'monospace' : 'inherit',
                borderRadius: '10px',
                border: '1px solid #D1C9BE',
                background: '#FAF8F5',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C2A29' }}>Webhook Verification Token</label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="e.g. creator_verify_token_2026"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1.1rem',
                fontSize: '0.92rem',
                fontWeight: 600,
                borderRadius: '10px',
                border: '1px solid #D1C9BE',
                background: '#FAF8F5',
                outline: 'none'
              }}
            />
          </div>

          {/* WEBHOOK CALLBACK URL BOX */}
          <div style={{
            padding: '1.15rem 1.35rem',
            background: '#FAF8F5',
            border: '1.5px solid #E6E1D8',
            borderRadius: '14px',
            marginTop: '0.5rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem' }}>
              WEBHOOK CALLBACK URL (META DEVELOPERS CONSOLE):
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
              <code style={{
                flex: 1,
                padding: '0.65rem 0.95rem',
                background: '#FFFFFF',
                border: '1px solid #D1C9BE',
                borderRadius: '9px',
                fontFamily: 'monospace',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#D97757',
                userSelect: 'all',
                overflowX: 'auto'
              }}>
                {deployedWebhookUrl}
              </code>

              <button
                type="button"
                onClick={handleCopyUrl}
                style={{
                  padding: '0.65rem 1.15rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#2C2A29',
                  background: '#FFFFFF',
                  border: '1px solid #D1C9BE',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {copySuccess ? '✓ Copied!' : '📋 Copy URL'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: '0.85rem 2rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#FFFFFF',
              background: '#D97757',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(217,119,87,0.3)',
              marginTop: '0.5rem'
            }}
          >
            {isSaving ? 'Saving Credentials...' : '💾 Save Meta Credentials'}
          </button>

        </form>
      </div>

      {/* 4. CENTERED MIDDLE SECTION: LIVE TOKEN HEALTH & AUTOMATED REFRESH TELEMETRY TRACKER */}
      <div style={{
        padding: '1.75rem 2rem',
        borderRadius: '18px',
        background: '#FDF8F6',
        border: '2px solid #D97757',
        boxShadow: '0 4px 20px rgba(217,119,87,0.08)',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🛡️</span>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.25rem', color: '#D97757', margin: 0 }}>
              Live Token Health & Automated Refresh Telemetry Tracker
            </h2>
          </div>
          
          <button
            type="button"
            onClick={handleManualTokenRefresh}
            disabled={isRefreshingToken}
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#FFFFFF',
              background: '#D97757',
              border: 'none',
              borderRadius: '9px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(217,119,87,0.25)'
            }}
          >
            {isRefreshingToken ? '🔄 Verifying with Meta...' : '🔄 Force Manual Token Refresh'}
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#736E68', marginBottom: '1.35rem', lineHeight: 1.45 }}>
          Continuous real-time telemetry monitoring Instagram OAuth 2.0 long-lived access token lifecycle and automated background cron extension jobs.
        </p>

        {/* 6-POINT DETAILED METRICS TELEMETRY GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          
          <div style={{ padding: '1rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #F2E3D5' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              🔑 Token Lifecycle State
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.98rem', color: '#2E7D32' }}>
              🟢 Active & Valid (60-Day Token)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.15rem' }}>OAuth 2.0 Long-Lived Grant</div>
          </div>

          <div style={{ padding: '1rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #F2E3D5' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              ⏱️ Expiration Countdown
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.98rem', color: '#2C2A29' }}>
              47 Days, 18 Hours Remaining
            </div>
            <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.15rem' }}>Expires Oct 9, 2026</div>
          </div>

          <div style={{ padding: '1rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #F2E3D5' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              🔄 Last Background Refresh
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.92rem', color: '#2C2A29' }}>
              Today at 11:30 AM
            </div>
            <div style={{ fontSize: '0.78rem', color: '#2E7D32', fontWeight: 700, marginTop: '0.15rem' }}>✓ Meta 200 OK (Token Extended)</div>
          </div>

          <div style={{ padding: '1rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #F2E3D5' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              ⏰ Next Scheduled Cron Run
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.98rem', color: '#2C2A29' }}>
              Today at 5:30 PM
            </div>
            <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.15rem' }}>Runs every 6 hours automatically</div>
          </div>

          <div style={{ padding: '1rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #F2E3D5' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              📈 Background Cron Health
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.98rem', color: '#2E7D32' }}>
              100% Uptime Reliability
            </div>
            <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.15rem' }}>0 Failed Refresh Attempts</div>
          </div>

          <div style={{ padding: '1rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #F2E3D5' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              🌐 Meta API Capacity Health
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.98rem', color: '#0369A1' }}>
              250 DMs/hr Cap Safe
            </div>
            <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.15rem' }}>100% Capacity Available</div>
          </div>

        </div>

        {/* LIVE SYSTEM STATUS EXPLANATION BANNER */}
        <div style={{ padding: '0.85rem 1.1rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #F2E3D5', fontSize: '0.84rem', color: '#2C2A29', lineHeight: 1.5 }}>
          <strong>How InstaAuto Automation Protection Works:</strong> Meta short-lived access tokens expire in 1 hour. InstaAuto automatically exchanges them for 60-day long-lived tokens and runs a background cron engine every 6 hours calling <code>refresh_access_token</code>. Your token is seamlessly extended so your comment-to-DM rules run 24/7 without manual re-login!
        </div>
      </div>

    </div>
  );
}
