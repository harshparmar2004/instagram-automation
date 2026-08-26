import React, { useState, useMemo } from 'react';

/**
 * ReelAnalytics - Expanded Reel Analytics & Performance Engine
 * 
 * Features:
 * 1. Slim Stat-Strip: Compact horizontal summary bar occupying minimal vertical height.
 * 2. Multi-Dimensional Filtering System:
 *    - Date Range (Today, Week, Month, Last Month)
 *    - Content Type (Reels, Images, Global Rules)
 *    - Breakout/Trending Filter ("🔥 Trending Only" - Triggers >500 or CTR >65%)
 *    - Automation Status (Active vs Paused)
 *    - Live Search query
 * 3. Deep Sortable & Expandable Performance Table:
 *    - Sort by Triggers, DMs Delivered, Clicks, or CTR %
 *    - Proportional relative volume bar under each row
 *    - 48x48px Reel thumbnail visual
 *    - Prominent rank markers (#1 highlighted with 🏆 badge)
 * 4. Zero Pill/Badge UI Chrome: Text typography and real form controls only.
 * 5. Scoped CTR Logic: Capped accurately at 100% max.
 */

const MOCK_ANALYTICS_DATA = [
  {
    id: '1',
    title: 'Free 2026 AI Growth Playbook PDF 📚 Comment PLAYBOOK',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    mediaType: 'REEL',
    status: 'active',
    dateGroup: 'month',
    triggers: 1450,
    delivered: 1442,
    clicks: 980,
    isTrending: true
  },
  {
    id: '2',
    title: 'How I scaled to 100k followers in 6 months 🚀 Comment LINK',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
    mediaType: 'REEL',
    status: 'active',
    dateGroup: 'month',
    triggers: 920,
    delivered: 915,
    clicks: 580,
    isTrending: true
  },
  {
    id: '3',
    title: 'Top 10 Coding & Design Tools Every Creator Needs 💻 Comment TOOLS',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80',
    mediaType: 'IMAGE',
    status: 'active',
    dateGroup: 'month',
    triggers: 480,
    delivered: 478,
    clicks: 290,
    isTrending: false
  },
  {
    id: '4',
    title: 'Exclusive Creator Masterclass Signup 🎓 Comment VIP',
    thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&auto=format&fit=crop&q=80',
    mediaType: 'REEL',
    status: 'paused',
    dateGroup: 'month',
    triggers: 310,
    delivered: 308,
    clicks: 185,
    isTrending: false
  },
  {
    id: '5',
    title: 'Monetize Audience With Comment-to-DM Automation 💸 Comment AUTO',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=80',
    mediaType: 'REEL',
    status: 'active',
    dateGroup: 'month',
    triggers: 1120,
    delivered: 1115,
    clicks: 790,
    isTrending: true
  },
  {
    id: '6',
    title: '10 Viral Hook Templates for Instagram Reels 🎬 Comment HOOKS',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80',
    mediaType: 'REEL',
    status: 'active',
    dateGroup: 'week',
    triggers: 880,
    delivered: 875,
    clicks: 610,
    isTrending: true
  },
  {
    id: 'global',
    title: 'Account-Wide Global Automation Rule',
    thumbnail: null,
    mediaType: 'GLOBAL',
    status: 'active',
    dateGroup: 'month',
    triggers: 240,
    delivered: 238,
    clicks: 140,
    isTrending: false
  }
];

export default function ReelAnalytics() {
  // FILTER STATES
  const [dateRange, setDateRange] = useState('month'); // today, week, month, last_month
  const [contentType, setContentType] = useState('all'); // all, REEL, IMAGE, GLOBAL
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, paused
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('triggers'); // triggers, delivered, clicks, ctr

  // FILTER & SORT LOGIC
  const filteredData = useMemo(() => {
    let list = [...MOCK_ANALYTICS_DATA];

    // Date range filter
    if (dateRange === 'week') {
      list = list.filter(item => item.dateGroup === 'week' || item.dateGroup === 'month');
    }

    // Content type filter
    if (contentType !== 'all') {
      list = list.filter(item => item.mediaType === contentType);
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(item => item.status === statusFilter);
    }

    // Trending filter
    if (trendingOnly) {
      list = list.filter(item => item.isTrending);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => item.title.toLowerCase().includes(q));
    }

    // Sort logic
    list.sort((a, b) => {
      const aCtr = a.delivered > 0 ? Math.min(100, Math.round((a.clicks / a.delivered) * 100)) : 0;
      const bCtr = b.delivered > 0 ? Math.min(100, Math.round((b.clicks / b.delivered) * 100)) : 0;

      if (sortBy === 'delivered') return b.delivered - a.delivered;
      if (sortBy === 'clicks') return b.clicks - a.clicks;
      if (sortBy === 'ctr') return bCtr - aCtr;
      return b.triggers - a.triggers; // default triggers
    });

    return list;
  }, [dateRange, contentType, statusFilter, trendingOnly, searchQuery, sortBy]);

  // CALC PROPORTIONS
  const maxTriggers = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.triggers)) : 1;

  // SUMMARY STATS
  const totalTriggers = useMemo(() => filteredData.reduce((acc, d) => acc + d.triggers, 0), [filteredData]);
  const totalDelivered = useMemo(() => filteredData.reduce((acc, d) => acc + d.delivered, 0), [filteredData]);
  const totalClicks = useMemo(() => filteredData.reduce((acc, d) => acc + d.clicks, 0), [filteredData]);
  const aggregateCtr = totalDelivered > 0 ? Math.min(100, Math.round((totalClicks / totalDelivered) * 100)) : 0;

  const hasActiveFilters = dateRange !== 'month' || contentType !== 'all' || statusFilter !== 'all' || trendingOnly || searchQuery !== '';

  const clearFilters = () => {
    setDateRange('month');
    setContentType('all');
    setStatusFilter('all');
    setTrendingOnly(false);
    setSearchQuery('');
  };

  return (
    <div style={{ width: '100%', maxWidth: '1480px', margin: '0 auto' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.85rem', letterSpacing: '-0.03em', color: '#2C2A29', margin: 0 }}>
            Reel Analytics
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#736E68', marginTop: '0.2rem' }}>
            Real-time automation performance, conversion rates, and engagement rankings.
          </p>
        </div>

        <button
          onClick={() => window.location.hash = 'activity'}
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
          View Activity Log ↗
        </button>
      </div>

      {/* 1. SLIM STAT-STRIP (COMPACT QUICK-GLANCE HORIZONTAL STRIP) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.25rem',
        width: '100%'
      }}>
        {/* STAT 1 */}
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL TRIGGERS</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginTop: '0.2rem' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#2C2A29' }}>{totalTriggers.toLocaleString()}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E7D32' }}>↑ +14.2%</span>
          </div>
        </div>

        {/* STAT 2 */}
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TODAY'S DISPATCHES</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginTop: '0.2rem' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#2C2A29' }}>142</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E7D32' }}>🟢 Live 24/7</span>
          </div>
        </div>

        {/* STAT 3: CONVERSION TINT */}
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#FDF8F6', border: '1.5px solid #D97757', boxShadow: '0 2px 8px rgba(217,119,87,0.08)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#D97757', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DMS DELIVERED</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginTop: '0.2rem' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#D97757' }}>{totalDelivered.toLocaleString()}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E7D32' }}>✓ 99.4% Delivery</span>
          </div>
        </div>

        {/* STAT 4: CONVERSION TINT */}
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#F0F9FF', border: '1.5px solid #0369A1', boxShadow: '0 2px 8px rgba(3,105,161,0.08)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RESOURCE CLICKS</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginTop: '0.2rem' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#0369A1' }}>{totalClicks.toLocaleString()}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E7D32' }}>🎯 {aggregateCtr}% CTR</span>
          </div>
        </div>
      </div>

      {/* 2. MULTI-DIMENSIONAL FILTER BAR */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '16px',
        background: '#FFFFFF',
        border: '1px solid #E6E1D8',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        
        {/* FILTER CONTROLS ROW */}
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* SEARCH INPUT */}
          <div style={{ flex: 2, minWidth: '220px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reels by title or trigger keyword..."
              style={{
                width: '100%',
                padding: '0.55rem 0.95rem',
                fontSize: '0.85rem',
                fontWeight: 500,
                borderRadius: '10px',
                border: '1px solid #D1C9BE',
                background: '#FAF8F5',
                outline: 'none'
              }}
            />
          </div>

          {/* DATE RANGE FILTER */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.95rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '10px',
                border: '1px solid #D1C9BE',
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="month">This Month (Aug 2026)</option>
              <option value="week">This Week</option>
              <option value="today">Today</option>
              <option value="all">All-Time</option>
            </select>
          </div>

          {/* CONTENT TYPE FILTER */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.95rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '10px',
                border: '1px solid #D1C9BE',
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="all">All Content Types</option>
              <option value="REEL">Reels Only</option>
              <option value="IMAGE">Images Only</option>
              <option value="GLOBAL">Global Rules Only</option>
            </select>
          </div>

          {/* STATUS FILTER */}
          <div style={{ flex: 1, minWidth: '140px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.95rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '10px',
                border: '1px solid #D1C9BE',
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Rules</option>
              <option value="paused">Paused Rules</option>
            </select>
          </div>

          {/* SORT BY CONTROL */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.95rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '10px',
                border: '1px solid #D1C9BE',
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="triggers">Sort by Triggers</option>
              <option value="delivered">Sort by DMs Delivered</option>
              <option value="clicks">Sort by Resource Clicks</option>
              <option value="ctr">Sort by CTR %</option>
            </select>
          </div>

          {/* TRENDING BREAKOUT TOGGLE BUTTON */}
          <button
            type="button"
            onClick={() => setTrendingOnly(!trendingOnly)}
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: trendingOnly ? '#FFFFFF' : '#D97757',
              background: trendingOnly ? '#D97757' : '#FDF8F6',
              border: '1px solid #D97757',
              borderRadius: '10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {trendingOnly ? '✓ 🔥 Trending Only' : '🔥 Show Trending Breakouts'}
          </button>

        </div>

        {/* ACTIVE FILTERS INDICATOR BAR */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: '0.5rem', borderTop: '1px solid #E6E1D8', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#736E68' }}>Active Filters:</span>
              {dateRange !== 'month' && <span style={{ fontWeight: 600, color: '#2C2A29' }}>Range: {dateRange}</span>}
              {contentType !== 'all' && <span style={{ fontWeight: 600, color: '#2C2A29' }}>Type: {contentType}</span>}
              {statusFilter !== 'all' && <span style={{ fontWeight: 600, color: '#2C2A29' }}>Status: {statusFilter}</span>}
              {trendingOnly && <span style={{ fontWeight: 700, color: '#D97757' }}>🔥 Trending Breakouts</span>}
              {searchQuery && <span style={{ fontWeight: 600, color: '#2C2A29' }}>Query: "{searchQuery}"</span>}
            </div>

            <button
              onClick={clearFilters}
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#D97757',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}

      </div>

      {/* 3. DEEP SORTABLE PERFORMANCE LIST */}
      <div style={{ padding: '1.6rem', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', width: '100%' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.35rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.25rem', color: '#2C2A29', margin: 0 }}>
              Top Performing Reels & Posts ({filteredData.length} Items)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#736E68', marginTop: '0.2rem' }}>
              Ranked and sorted performance breakdown with real-time conversion telemetry.
            </p>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: '#FAF8F5', borderRadius: '14px', border: '1px dashed #E6E1D8' }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#2C2A29' }}>No matching reels found</h3>
            <p style={{ fontSize: '0.85rem', color: '#736E68', marginTop: '0.25rem' }}>Try clearing active filters or searching for another keyword.</p>
            <button onClick={clearFilters} style={{ marginTop: '0.85rem', padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 700, background: '#D97757', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Clear Filters</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {filteredData.map((reel, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const ctr = reel.delivered > 0 ? Math.min(100, Math.round((reel.clicks / reel.delivered) * 100)) : 0;
              const proportion = Math.round((reel.triggers / maxTriggers) * 100);

              return (
                <div
                  key={reel.id}
                  style={{
                    padding: '1.1rem 1.35rem',
                    borderRadius: '14px',
                    background: isTop1 ? '#FDF8F6' : '#FAF8F5',
                    border: isTop1 ? '2px solid #D97757' : '1px solid #E6E1D8',
                    boxShadow: isTop1 ? '0 4px 16px rgba(217,119,87,0.12)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    
                    {/* LEFT: RANK BADGE + REEL THUMBNAIL + TITLE */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
                      
                      {/* PROMINENT RANK MARKER */}
                      <div style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 800,
                        fontSize: isTop1 ? '1.1rem' : '0.92rem',
                        color: isTop1 ? '#D97757' : '#736E68',
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: isTop1 ? '#FAF4EE' : '#FFFFFF',
                        border: isTop1 ? '1px solid #F2E3D5' : '1px solid #E6E1D8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isTop1 ? '🏆 #1' : `#${rank}`}
                      </div>

                      {/* 48x48px REEL THUMBNAIL */}
                      {reel.thumbnail ? (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          backgroundImage: `url('${reel.thumbnail}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: '1px solid #E6E1D8',
                          position: 'relative',
                          flexShrink: 0
                        }}>
                          <div style={{ position: 'absolute', bottom: '2px', left: '2px', fontSize: '0.55rem', fontWeight: 800, color: '#FFFFFF', background: 'rgba(0,0,0,0.7)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                            {reel.mediaType}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #FAF8F5 0%, #E6E1D8 100%)',
                          border: '1px solid #E6E1D8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          flexShrink: 0
                        }}>
                          🌐
                        </div>
                      )}

                      {/* TITLE & TRENDING BREAKOUT INDICATOR */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.92rem', color: '#2C2A29', lineHeight: 1.35 }}>
                            {reel.title}
                          </span>
                          {reel.isTrending && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97757' }}>
                              🔥 Breakout
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.15rem' }}>
                          Type: <strong style={{ color: '#2C2A29' }}>{reel.mediaType}</strong> • Status: <strong style={{ color: reel.status === 'active' ? '#2E7D32' : '#736E68' }}>{reel.status === 'active' ? 'Active' : 'Paused'}</strong> • Link Clicks: <strong style={{ color: '#0369A1' }}>{reel.clicks.toLocaleString()} ({ctr}% CTR)</strong>
                        </div>
                      </div>

                    </div>

                    {/* RIGHT: METRICS DISPATCHED */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#D97757' }}>
                        {reel.triggers.toLocaleString()} DMs
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#736E68' }}>
                        Dispatched
                      </div>
                    </div>

                  </div>

                  {/* RELATIVE VOLUME PROPORTION BAR */}
                  <div style={{ width: '100%', height: '6px', background: '#FFFFFF', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E6E1D8' }}>
                    <div style={{
                      width: `${proportion}%`,
                      height: '100%',
                      background: isTop1 ? 'linear-gradient(90deg, #E28263 0%, #D97757 100%)' : '#C1B9AE',
                      borderRadius: '10px',
                      transition: 'width 0.3s ease-in-out'
                    }} />
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
