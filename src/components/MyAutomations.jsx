import React, { useState } from 'react';

/**
 * MyAutomations — Clean Typography React Component (Zero Pill/Badge UI Chrome)
 * 
 * Removes all rounded pills, colored chips, and fake button badges.
 * All metadata reads purely as plain text with clean typography, labels, and weight.
 * Only real actionable buttons (e.g. "+ Create Automation", "Edit Rule") look like buttons.
 */

const DEFAULT_AUTOMATIONS = [
  {
    id: 1,
    isGlobal: false,
    mediaType: 'Instagram Reel',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
    caption: 'Free 2026 AI Growth Playbook PDF 🚀 Comment "PLAYBOOK" to get instant access!',
    permalink: 'https://instagram.com/p/example1',
    triggerKeywords: ['PLAYBOOK', 'PDF', 'AI'],
    actionType: 'link_dm',
    actionLabel: 'Send Resource Link in DM',
    delaySeconds: 10,
    linkUrl: 'https://example.com/ai-playbook.pdf',
    dmMessage: 'Hey there! 👋 Here is your free copy of the 2026 AI Growth Playbook PDF. Click below to read & download!',
    publicReply: 'Check your DMs! 📩',
    isActive: true,
    stats: {
      views: 48500,
      comments: 1420,
      dmsSent: 1150,
      clicks: 680,
      ctr: 59
    }
  },
  {
    id: 2,
    isGlobal: true,
    mediaType: 'All Posts & Reels',
    caption: 'Global Rule — Automatically triggers across all active posts & reels on account.',
    permalink: null,
    triggerKeywords: ['INFO', 'HELP', 'SUPPORT'],
    actionType: 'direct_dm',
    actionLabel: 'Send Direct Text DM (No Link)',
    delaySeconds: 0,
    linkUrl: null,
    dmMessage: 'Hey! Thanks for reaching out to Creator Studio. How can our team assist you today?',
    publicReply: 'Replied in DMs! 📥',
    isActive: true,
    stats: {
      views: 124000,
      comments: 3200,
      dmsSent: 2890,
      clicks: 0,
      ctr: 0
    }
  }
];

export default function MyAutomations({ 
  automations = DEFAULT_AUTOMATIONS, 
  onToggleRule, 
  onEditRule, 
  onDeleteRule,
  onCreateNew 
}) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [copiedId, setCopiedId] = useState(null);

  const filtered = automations.filter(item => {
    const matchesSearch = !search || 
      item.caption.toLowerCase().includes(search.toLowerCase()) ||
      item.triggerKeywords.some(k => k.toLowerCase().includes(search.toLowerCase())) ||
      (item.linkUrl && item.linkUrl.toLowerCase().includes(search.toLowerCase()));
    
    const matchesAction = !actionFilter || item.actionType === actionFilter;
    return matchesSearch && matchesAction;
  });

  const sortedRules = [...filtered].sort((a, b) => {
    if (sortBy === 'dms') return b.stats.dmsSent - a.stats.dmsSent;
    if (sortBy === 'clicks') return b.stats.clicks - a.stats.clicks;
    return b.id - a.id;
  });

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={styles.wrapper}>
      {/* PAGE HEADER */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>My Automations</h1>
          <p style={styles.subtitle}>Manage and analyze active Instagram Reel comment-to-DM rules.</p>
        </div>
        <button style={styles.primaryBtn} onClick={onCreateNew}>
          + Create Automation
        </button>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div style={styles.filterBar}>
        <input 
          type="text" 
          placeholder="Search reels by keyword, link, or caption..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />

        <select 
          value={actionFilter} 
          onChange={(e) => setActionFilter(e.target.value)}
          style={styles.selectInput}
        >
          <option value="">All Action Types</option>
          <option value="link_dm">Send Link DM</option>
          <option value="direct_dm">Send Text DM</option>
          <option value="follow_first">Follow First Gate</option>
        </select>

        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          style={styles.selectInput}
        >
          <option value="recent">Sort by Most Recent</option>
          <option value="dms">Sort by DMs Sent</option>
          <option value="clicks">Sort by Link Clicks</option>
        </select>

        <div style={styles.countText}>{sortedRules.length} Active Automations</div>
      </div>

      {/* RULES LIST — FULL SCREEN 3-SECTION ROWS (NO PILLS / BADGES) */}
      <div style={styles.rulesList}>
        {sortedRules.map(rule => (
          <div key={rule.id} style={styles.ruleCard}>
            
            {/* TOP CARD HEADER BAR */}
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderTitle}>
                <span style={styles.ruleIdText}>AUTOMATION RULE #{rule.id}</span>
                <span style={{ fontSize: '13px', color: '#E6E1D8' }}>•</span>
                <span style={rule.isActive ? styles.statusTextActive : styles.statusTextPaused}>
                  Status: {rule.isActive ? 'Active & Listening' : 'Paused'}
                </span>
              </div>
              
              <div style={styles.cardHeaderActions}>
                <button 
                  onClick={() => onToggleRule && onToggleRule(rule.id)}
                  style={styles.actionBtn}
                >
                  {rule.isActive ? 'Pause' : 'Activate'}
                </button>
                <button 
                  onClick={() => onEditRule && onEditRule(rule.id)}
                  style={styles.actionBtn}
                >
                  Edit Rule
                </button>
                <button 
                  onClick={() => onDeleteRule && onDeleteRule(rule.id)}
                  style={styles.dangerBtn}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* 3-SECTION FULL WIDTH ROW */}
            <div style={styles.rowGrid}>
              
              {/* 1. TRIGGER SOURCE (LEFT SECTION) */}
              <div style={styles.colSection1}>
                <div style={styles.sectionLabel}>1. TRIGGER SOURCE</div>
                
                {rule.isGlobal ? (
                  <div>
                    <div style={styles.globalTextTitle}>Global Account Rule</div>
                    <div style={styles.globalTextSub}>Applies automatically across all active posts & reels</div>
                  </div>
                ) : (
                  <div style={styles.mediaContainer}>
                    {rule.thumbnailUrl && (
                      <img src={rule.thumbnailUrl} alt="Reel thumbnail" style={styles.thumbImg} />
                    )}
                    <div>
                      <div style={styles.typeText}>{rule.mediaType}</div>
                      <div style={styles.mediaCaptionText}>{rule.caption}</div>
                    </div>
                  </div>
                )}

                {rule.permalink && (
                  <a href={rule.permalink} target="_blank" rel="noreferrer" style={styles.linkAnchor}>
                    View Post on Instagram ↗
                  </a>
                )}
              </div>

              {/* 2. TRIGGER & ACTION (MIDDLE SECTION) */}
              <div style={styles.colSection2}>
                <div style={styles.sectionLabel}>2. TRIGGER & ACTION</div>
                
                <div style={styles.textBlock}>
                  <span style={styles.fieldLabel}>Trigger Keywords: </span>
                  <span style={styles.fieldValueBold}>
                    {rule.triggerKeywords.map(k => `"${k}"`).join(' or ')}
                  </span>
                </div>

                <div style={styles.textBlock}>
                  <span style={styles.fieldLabel}>Action: </span>
                  <span style={styles.fieldValueBold}>{rule.actionLabel}</span>
                  {rule.delaySeconds ? (
                    <span style={styles.fieldValueMuted}> (with {rule.delaySeconds}s delay)</span>
                  ) : null}
                </div>

                {rule.linkUrl && (
                  <div style={styles.textBlock}>
                    <span style={styles.fieldLabel}>Deliverable URL: </span>
                    <div style={styles.urlLine}>
                      <a href={rule.linkUrl} target="_blank" rel="noreferrer" style={styles.urlText}>
                        {rule.linkUrl}
                      </a>
                      <button 
                        onClick={() => handleCopy(rule.linkUrl, rule.id)}
                        style={styles.copyBtn}
                      >
                        {copiedId === rule.id ? 'Copied ✓' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. AUTOMATED DM (RIGHT SECTION) */}
              <div style={styles.colSection3}>
                <div style={styles.sectionLabel}>3. AUTOMATED DM</div>
                
                <div style={styles.textBlock}>
                  <span style={styles.fieldLabel}>Direct Message Sent:</span>
                  <p style={styles.dmProse}>"{rule.dmMessage}"</p>
                </div>

                {rule.publicReply && (
                  <div style={styles.textBlock}>
                    <span style={styles.fieldLabel}>Public Comment Reply: </span>
                    <span style={{ fontSize: '14px', color: '#2C2A29', fontWeight: 600 }}>"{rule.publicReply}"</span>
                  </div>
                )}
              </div>

            </div>

            {/* SUMMARY FOOTER — CLEAN TYPOGRAPHY (NO BOXES) */}
            <div style={styles.summaryFooter}>
              <div style={styles.footerMetrics}>
                <span style={styles.metricItem}><span style={styles.fieldLabel}>Views:</span> <strong>{rule.stats.views.toLocaleString()}</strong></span>
                <span style={styles.metricDot}>•</span>
                <span style={styles.metricItem}><span style={styles.fieldLabel}>Comments:</span> <strong>{rule.stats.comments.toLocaleString()}</strong></span>
                <span style={styles.metricDot}>•</span>
                <span style={styles.metricItem}><span style={styles.fieldLabel}>DMs Sent:</span> <strong style={{ color: '#D97757' }}>{rule.stats.dmsSent.toLocaleString()}</strong></span>
                <span style={styles.metricDot}>•</span>
                <span style={styles.metricItem}><span style={styles.fieldLabel}>Link Clicks:</span> <strong style={{ color: '#2E7D32' }}>{rule.stats.clicks.toLocaleString()} ({rule.stats.ctr}% CTR)</strong></span>
              </div>

              <div style={styles.footerArchive}>
                <span style={{ fontSize: '13px', color: '#96918A', fontStyle: 'normal' }}>History:</span>
                <select style={styles.selectArchive}>
                  <option value="current">Current Month (Aug 2026)</option>
                  <option value="prev">July 2026</option>
                </select>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

// INLINE STYLES FOR REACT COMPONENT — NO PILL BADGES / NO UI CHROME
const styles = {
  wrapper: {
    width: '100%',
    maxWidth: '1440px',
    margin: '0 auto',
    padding: '24px 32px',
    fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
    backgroundColor: '#FAF8F5',
    minHeight: '100vh',
    boxSizing: 'border-box'
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#2C2A29',
    margin: 0,
    letterSpacing: '-0.03em'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B6762',
    marginTop: '4px',
    margin: 0
  },
  primaryBtn: {
    backgroundColor: '#D97757',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(217, 119, 87, 0.25)'
  },
  filterBar: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E6E1D8',
    borderRadius: '14px',
    padding: '12px 20px',
    marginBottom: '28px'
  },
  searchInput: {
    flex: 3,
    backgroundColor: '#FAF8F5',
    border: '1px solid #E6E1D8',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '14px',
    outline: 'none',
    color: '#2C2A29'
  },
  selectInput: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    border: '1px solid #E6E1D8',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '14px',
    outline: 'none',
    color: '#2C2A29',
    fontWeight: 600
  },
  countText: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#D97757'
  },
  rulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  ruleCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E6E1D8',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(44, 42, 41, 0.03)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    backgroundColor: '#FAF8F5',
    borderBottom: '1px solid #E6E1D8'
  },
  cardHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  ruleIdText: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#2C2A29',
    letterSpacing: '0.04em'
  },
  statusTextActive: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#2E7D32'
  },
  statusTextPaused: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#6B6762'
  },
  cardHeaderActions: {
    display: 'flex',
    gap: '8px'
  },
  actionBtn: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E6E1D8',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#2C2A29',
    cursor: 'pointer'
  },
  dangerBtn: {
    backgroundColor: '#FEE2E2',
    border: '1px solid rgba(220,38,38,0.2)',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#DC2626',
    cursor: 'pointer'
  },
  rowGrid: {
    display: 'grid',
    gridTemplateColumns: '280px 1.2fr 1.2fr',
    minHeight: '200px'
  },
  colSection1: {
    padding: '24px',
    borderRight: '1px solid #E6E1D8',
    backgroundColor: '#FAF8F5',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  colSection2: {
    padding: '24px',
    borderRight: '1px solid #E6E1D8',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  colSection3: {
    padding: '24px',
    backgroundColor: '#FAF8F5',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#D97757',
    letterSpacing: '0.06em',
    marginBottom: '10px'
  },
  globalTextTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#D97757'
  },
  globalTextSub: {
    fontSize: '13px',
    color: '#6B6762',
    marginTop: '4px'
  },
  mediaContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  thumbImg: {
    width: '100%',
    height: '110px',
    borderRadius: '10px',
    objectFit: 'cover',
    border: '1px solid #E6E1D8'
  },
  typeText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#96918A',
    textTransform: 'uppercase',
    marginBottom: '2px'
  },
  mediaCaptionText: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#2C2A29',
    lineHeight: '1.4'
  },
  linkAnchor: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#D97757',
    textDecoration: 'none',
    marginTop: '12px',
    display: 'inline-block'
  },
  textBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#96918A',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  fieldValueBold: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#2C2A29'
  },
  fieldValueMuted: {
    fontSize: '14px',
    color: '#6B6762',
    fontWeight: 500
  },
  urlLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '2px'
  },
  urlText: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#D97757',
    textDecoration: 'none',
    wordBreak: 'break-all'
  },
  copyBtn: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E6E1D8',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#D97757',
    cursor: 'pointer',
    flexShrink: 0
  },
  dmProse: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2C2A29',
    lineHeight: '1.5',
    margin: '4px 0 0 0'
  },
  summaryFooter: {
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E6E1D8',
    padding: '12px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  footerMetrics: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    fontSize: '13px',
    color: '#2C2A29'
  },
  metricItem: {
    fontSize: '13px'
  },
  metricDot: {
    color: '#E6E1D8'
  },
  footerArchive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  selectArchive: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E6E1D8',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#2C2A29',
    outline: 'none'
  }
};
