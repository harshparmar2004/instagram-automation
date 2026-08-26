import React, { useState, useMemo } from 'react';

/**
 * ActivityLeadsLog - Real-Time Activity & Lead Audit Log Component
 * 
 * Key Features:
 * 1. Compact Status Summary Strip (Top KPI strip):
 *    - Total Activity, Delivered (Green), Sent (Blue), Link Clicked (Teal), Failed (Red)
 * 2. Multi-Dimensional Filter System:
 *    - Status, Date Range, Action Type, Trigger Keyword, and Live Search
 * 3. Informative Rows (Zero Pill Badges):
 *    - Followers' Instagram Profile Avatars (36x36px) instead of generic icon placeholders
 *    - Plain colored text + status dots (🟢 Delivered, 🔵 Sent, 🔴 Failed)
 *    - Visually prominent conversion highlight for "🎯 Deliverable Link Clicked ✓" with soft blue background tint box
 * 4. Paginated Audit Navigation:
 *    - Clear pagination controls (Page X of Y, Prev/Next buttons)
 */

const MOCK_LEADS_ACTIVITY = [
  {
    id: 'ev-1',
    username: 'sarah_creator',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    commentText: 'PLAYBOOK, PDF, AI',
    triggerWord: 'PLAYBOOK, PDF, AI',
    actionType: 'link_dm',
    actionTaken: 'Sent Link',
    linkClicked: true,
    status: 'delivered',
    timeAgo: '10 min ago',
    dateGroup: 'today'
  },
  {
    id: 'ev-2',
    username: 'dev_alex',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    commentText: 'TOOLS, WEBSITE',
    triggerWord: 'TOOLS, WEBSITE',
    actionType: 'link_dm',
    actionTaken: 'Sent Link',
    linkClicked: false,
    status: 'sent',
    timeAgo: '25 min ago',
    dateGroup: 'today'
  },
  {
    id: 'ev-3',
    username: 'tech_founder',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    commentText: 'PLAYBOOK, PDF, AI',
    triggerWord: 'PLAYBOOK, PDF, AI',
    actionType: 'link_dm',
    actionTaken: 'Sent Link',
    linkClicked: true,
    status: 'delivered',
    timeAgo: '1 hour ago',
    dateGroup: 'today'
  },
  {
    id: 'ev-4',
    username: 'marketing_pro',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    commentText: 'GUIDE, SCALING',
    triggerWord: 'GUIDE, SCALING',
    actionType: 'follow_first',
    actionTaken: 'Asked to Follow',
    linkClicked: false,
    status: 'sent',
    timeAgo: '2 hours ago',
    dateGroup: 'today'
  },
  {
    id: 'ev-5',
    username: 'growth_hacker',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    commentText: 'PLAYBOOK, PDF, AI',
    triggerWord: 'PLAYBOOK, PDF, AI',
    actionType: 'link_dm',
    actionTaken: 'Sent Link',
    linkClicked: true,
    status: 'delivered',
    timeAgo: '4 hours ago',
    dateGroup: 'today'
  },
  {
    id: 'ev-6',
    username: 'design_master',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    commentText: 'TOOLS, WEBSITE',
    triggerWord: 'TOOLS, WEBSITE',
    actionType: 'direct_dm',
    actionTaken: 'Sent Text DM',
    linkClicked: false,
    status: 'failed',
    timeAgo: '1 day ago',
    dateGroup: 'week'
  }
];

export default function ActivityLeadsLog() {
  // FILTER STATES
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // FILTER LOGIC
  const filteredEvents = useMemo(() => {
    let list = [...MOCK_LEADS_ACTIVITY];

    if (statusFilter !== 'all') {
      if (statusFilter === 'clicked') {
        list = list.filter(e => e.linkClicked);
      } else {
        list = list.filter(e => e.status === statusFilter);
      }
    }

    if (dateFilter !== 'all') {
      list = list.filter(e => e.dateGroup === dateFilter);
    }

    if (actionFilter !== 'all') {
      list = list.filter(e => e.actionType === actionFilter);
    }

    if (triggerFilter !== 'all') {
      list = list.filter(e => e.triggerWord === triggerFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => e.username.toLowerCase().includes(q) || e.commentText.toLowerCase().includes(q));
    }

    return list;
  }, [statusFilter, dateFilter, actionFilter, triggerFilter, searchQuery]);

  // PAGINATION MATH
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage]);

  const hasActiveFilters = statusFilter !== 'all' || dateFilter !== 'all' || actionFilter !== 'all' || triggerFilter !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setDateFilter('all');
    setActionFilter('all');
    setTriggerFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    let csv = 'Username,Comment Text,Trigger Keyword,Action Taken,Status,Link Clicked,Time\n';
    filteredEvents.forEach(e => {
      csv += `"${e.username}","${e.commentText.replace(/"/g, '""')}","${e.triggerWord}","${e.actionTaken}",${e.status},${e.linkClicked ? 'Yes' : 'No'},"${e.timeAgo}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Leads_Activity_Log_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1480px', margin: '0 auto' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.85rem', letterSpacing: '-0.03em', color: '#2C2A29', margin: 0 }}>
            Activity & Captured Leads
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#736E68', marginTop: '0.2rem' }}>
            Real-time audit log of follower comment triggers, DM dispatches, and link clicks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            onClick={handleExportCsv}
            style={{
              padding: '0.58rem 1.35rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              color: '#FFFFFF',
              background: '#D97757',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(217,119,87,0.25)'
            }}
          >
            Export CSV Leads
          </button>
          <button
            onClick={() => setCurrentPage(1)}
            style={{
              padding: '0.58rem 1.15rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#2C2A29',
              background: '#FFFFFF',
              border: '1px solid #E6E1D8',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Refresh Log
          </button>
        </div>
      </div>

      {/* 1. SLIM STATUS SUMMARY STRIP */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.25rem',
        width: '100%'
      }}>
        {/* TOTAL ACTIVITY */}
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL ACTIVITY</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#2C2A29', marginTop: '0.2rem' }}>
            1,450
          </div>
          <div style={{ fontSize: '0.75rem', color: '#736E68', marginTop: '0.1rem' }}>Recorded events</div>
        </div>

        {/* DELIVERED */}
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#F4FBF7', border: '1.5px solid #2E7D32', boxShadow: '0 2px 8px rgba(46,125,50,0.08)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2E7D32', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DELIVERED</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#2E7D32', marginTop: '0.2rem' }}>
            1,280
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E7D32', marginTop: '0.1rem' }}>🟢 Successful DMs</div>
        </div>

        {/* SENT */}
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#F0F7FF', border: '1.5px solid #0284C7', boxShadow: '0 2px 8px rgba(2,132,199,0.08)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SENT (PENDING)</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#0284C7', marginTop: '0.2rem' }}>
            140
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284C7', marginTop: '0.1rem' }}>🔵 In Flight</div>
        </div>

        {/* LINK CLICKED */}
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#F0F9FF', border: '1.5px solid #0369A1', boxShadow: '0 2px 8px rgba(3,105,161,0.08)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RESOURCE CLICKS</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#0369A1', marginTop: '0.2rem' }}>
            890
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369A1', marginTop: '0.1rem' }}>🎯 Conversions</div>
        </div>

        {/* FAILED */}
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#FEF2F2', border: '1.5px solid #DC2626', boxShadow: '0 2px 8px rgba(220,38,38,0.08)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FAILED DISPATCHES</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#DC2626', marginTop: '0.2rem' }}>
            30
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', marginTop: '0.1rem' }}>🔴 Account limit / privacy</div>
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
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* SEARCH INPUT */}
          <div style={{ flex: 2, minWidth: '220px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by username or comment text..."
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

          {/* STATUS FILTER */}
          <div style={{ flex: 1, minWidth: '140px' }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.55rem 0.95rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '10px', border: '1px solid #D1C9BE', background: '#FFFFFF', outline: 'none' }}
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered Only</option>
              <option value="sent">Sent Only</option>
              <option value="clicked">Clicked Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>

          {/* DATE FILTER */}
          <div style={{ flex: 1, minWidth: '140px' }}>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.55rem 0.95rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '10px', border: '1px solid #D1C9BE', background: '#FFFFFF', outline: 'none' }}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
            </select>
          </div>

          {/* ACTION TYPE FILTER */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.55rem 0.95rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '10px', border: '1px solid #D1C9BE', background: '#FFFFFF', outline: 'none' }}
            >
              <option value="all">All Action Types</option>
              <option value="link_dm">Sent Link</option>
              <option value="follow_first">Asked to Follow</option>
              <option value="direct_dm">Sent Text DM</option>
            </select>
          </div>

          {/* TRIGGER KEYWORD FILTER */}
          <div style={{ flex: 1, minWidth: '160px' }}>
            <select
              value={triggerFilter}
              onChange={(e) => { setTriggerFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.55rem 0.95rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '10px', border: '1px solid #D1C9BE', background: '#FFFFFF', outline: 'none' }}
            >
              <option value="all">All Keywords</option>
              <option value="PLAYBOOK, PDF, AI">PLAYBOOK, PDF, AI</option>
              <option value="TOOLS, WEBSITE">TOOLS, WEBSITE</option>
              <option value="GUIDE, SCALING">GUIDE, SCALING</option>
            </select>
          </div>

        </div>

        {/* ACTIVE FILTERS INDICATOR BAR */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: '0.5rem', borderTop: '1px solid #E6E1D8', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#736E68' }}>Active Filters:</span>
              {statusFilter !== 'all' && <span style={{ fontWeight: 600, color: '#2C2A29' }}>Status: {statusFilter}</span>}
              {dateFilter !== 'all' && <span style={{ fontWeight: 600, color: '#2C2A29' }}>Date: {dateFilter}</span>}
              {actionFilter !== 'all' && <span style={{ fontWeight: 600, color: '#2C2A29' }}>Action: {actionFilter}</span>}
              {triggerFilter !== 'all' && <span style={{ fontWeight: 600, color: '#2C2A29' }}>Trigger: {triggerFilter}</span>}
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

      {/* 3. LOG ROWS WITH FOLLOWER AVATARS & PROMINENT CONVERSION HIGHLIGHT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', marginBottom: '1.25rem' }}>
        {paginatedEvents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E6E1D8' }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#2C2A29' }}>No matching leads found</h3>
            <p style={{ fontSize: '0.85rem', color: '#736E68', marginTop: '0.25rem' }}>Try clearing filters or adjusting your search phrase.</p>
            <button onClick={clearFilters} style={{ marginTop: '0.85rem', padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 700, background: '#D97757', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Clear Filters</button>
          </div>
        ) : (
          paginatedEvents.map(ev => {
            // ZERO PILL STATUS PLAIN TEXT & DOT
            let statusText = '🟢 Delivered';
            let statusColor = '#2E7D32';

            if (ev.status === 'sent') {
              statusText = '🔵 Sent';
              statusColor = '#0284C7';
            } else if (ev.status === 'failed') {
              statusText = '🔴 Failed';
              statusColor = '#DC2626';
            }

            return (
              <div
                key={ev.id}
                style={{
                  padding: '1.1rem 1.35rem',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E6E1D8',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                {/* FOLLOWER AVATAR + USERNAME + COMMENT DETAILS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}>
                  
                  {/* FOLLOWER INSTAGRAM AVATAR IMAGE (36x36px) */}
                  <img
                    src={ev.avatar}
                    alt={ev.username}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid #E6E1D8',
                      flexShrink: 0
                    }}
                  />

                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.92rem', fontWeight: 700, color: '#2C2A29' }}>
                      @{ev.username} <span style={{ fontWeight: 400, color: '#736E68' }}>commented</span> <span style={{ fontFamily: 'monospace', color: '#D97757', fontWeight: 800 }}>"{ev.commentText}"</span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#736E68', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <span>Action: <strong>{ev.actionTaken}</strong></span>

                      {/* PROMINENT CONVERSION HIGHLIGHT BOX */}
                      {ev.linkClicked && (
                        <span style={{
                          color: '#0369A1',
                          fontWeight: 800,
                          background: '#F0F9FF',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '6px',
                          border: '1px solid #BAE6FD'
                        }}>
                          🎯 Deliverable Link Clicked ✓
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* RIGHT: STATUS PLAIN TEXT & TIME AGO */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: statusColor }}>
                    {statusText}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.15rem', fontWeight: 500 }}>
                    {ev.timeAgo}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 4. AUDIT PAGINATION SYSTEM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E6E1D8' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#736E68' }}>
          Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredEvents.length} Total Leads)
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: currentPage === 1 ? '#C1B9AE' : '#2C2A29',
              background: '#FFF',
              border: '1px solid #E6E1D8',
              borderRadius: '8px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ← Previous
          </button>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: currentPage === totalPages ? '#C1B9AE' : '#2C2A29',
              background: '#FFF',
              border: '1px solid #E6E1D8',
              borderRadius: '8px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next →
          </button>
        </div>
      </div>

    </div>
  );
}
