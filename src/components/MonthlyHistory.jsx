import React, { useState, useMemo } from 'react';

/**
 * MonthlyHistory - Historical Archive & Month-Over-Month Performance Ledger Component
 * 
 * How Monthly History Works:
 * 1. Month Selector: Allows creators to toggle between calendar months (e.g., Aug 2026, Jul 2026, Jun 2026).
 * 2. Slim Monthly Stat-Strip: Compact horizontal summary bar displaying month-level totals:
 *    - Monthly Reel Views
 *    - Monthly Comments Generated
 *    - Automated DMs Dispatched
 *    - Deliverable Link Clicks & Conversion CTR % (Scoped Math)
 * 3. Historical Performance Ledger Table:
 *    - Per-reel breakdown for the selected month
 *    - 48x48px Reel thumbnail visual
 *    - Views, Comments, DMs Sent, Clicks, and Conversion CTR %
 * 4. Export CSV Action: 1-click data export for month-end reporting.
 * 5. Zero Pill/Badge Chrome: Text typography and real form controls only.
 */

const MOCK_MONTHLY_ARCHIVE = {
  '2026-08': {
    label: 'August 2026',
    views: 248500,
    comments: 7420,
    dms: 4890,
    clicks: 3120,
    reels: [
      {
        id: '1',
        title: 'Free 2026 AI Growth Playbook PDF 📚 Comment PLAYBOOK',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
        type: 'REEL',
        views: 98500,
        comments: 3200,
        dms: 2150,
        clicks: 1460
      },
      {
        id: '2',
        title: 'How I scaled to 100k followers in 6 months 🚀 Comment LINK',
        thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
        type: 'REEL',
        views: 82000,
        comments: 2400,
        dms: 1540,
        clicks: 980
      },
      {
        id: '3',
        title: 'Top 10 Coding & Design Tools Every Creator Needs 💻 Comment TOOLS',
        thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80',
        type: 'IMAGE',
        views: 42000,
        comments: 1100,
        dms: 780,
        clicks: 440
      },
      {
        id: '4',
        title: 'Exclusive Creator Masterclass Signup 🎓 Comment VIP',
        thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&auto=format&fit=crop&q=80',
        type: 'REEL',
        views: 26000,
        comments: 720,
        dms: 420,
        clicks: 240
      }
    ]
  },
  '2026-07': {
    label: 'July 2026',
    views: 194000,
    comments: 5800,
    dms: 3620,
    clicks: 2180,
    reels: [
      {
        id: '1',
        title: 'Free 2026 AI Growth Playbook PDF 📚 Comment PLAYBOOK',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
        type: 'REEL',
        views: 74000,
        comments: 2300,
        dms: 1480,
        clicks: 920
      },
      {
        id: '2',
        title: 'How I scaled to 100k followers in 6 months 🚀 Comment LINK',
        thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
        type: 'REEL',
        views: 68000,
        comments: 1950,
        dms: 1210,
        clicks: 740
      },
      {
        id: '3',
        title: 'Top 10 Coding & Design Tools Every Creator Needs 💻 Comment TOOLS',
        thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80',
        type: 'IMAGE',
        views: 52000,
        comments: 1550,
        dms: 930,
        clicks: 520
      }
    ]
  },
  '2026-06': {
    label: 'June 2026',
    views: 142000,
    comments: 4100,
    dms: 2540,
    clicks: 1420,
    reels: [
      {
        id: '1',
        title: 'Free 2026 AI Growth Playbook PDF 📚 Comment PLAYBOOK',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
        type: 'REEL',
        views: 85000,
        comments: 2600,
        dms: 1620,
        clicks: 940
      },
      {
        id: '2',
        title: 'How I scaled to 100k followers in 6 months 🚀 Comment LINK',
        thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
        type: 'REEL',
        views: 57000,
        comments: 1500,
        dms: 920,
        clicks: 480
      }
    ]
  }
};

export default function MonthlyHistory() {
  const [selectedMonthKey, setSelectedMonthKey] = useState('2026-08');

  const currentMonthData = MOCK_MONTHLY_ARCHIVE[selectedMonthKey] || MOCK_MONTHLY_ARCHIVE['2026-08'];

  // SCOPED CTR MATH
  const overallCtr = currentMonthData.dms > 0 ? Math.min(100, Math.round((currentMonthData.clicks / currentMonthData.dms) * 100)) : 0;

  const handleExportCsv = () => {
    let csv = 'Reel Title,Type,Views,Comments,DMs Dispatched,Link Clicks,CTR %\n';
    currentMonthData.reels.forEach(r => {
      const ctr = r.dms > 0 ? Math.min(100, Math.round((r.clicks / r.dms) * 100)) : 0;
      csv += `"${r.title.replace(/"/g, '""')}",${r.type},${r.views},${r.comments},${r.dms},${r.clicks},${ctr}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monthly_History_${selectedMonthKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1480px', margin: '0 auto' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.85rem', letterSpacing: '-0.03em', color: '#2C2A29', margin: 0 }}>
            Monthly History Archive
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#736E68', marginTop: '0.2rem' }}>
            Historical performance ledger of monthly Reel views, comments, automated DMs, and link conversions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#736E68' }}>Select Month:</span>
          <select
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              borderRadius: '10px',
              border: '1px solid #D1C9BE',
              background: '#FFFFFF',
              color: '#2C2A29',
              outline: 'none',
              minWidth: '160px'
            }}
          >
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
            <option value="2026-06">June 2026</option>
          </select>

          <button
            onClick={handleExportCsv}
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
            Export CSV
          </button>
        </div>
      </div>

      {/* 1. SLIM MONTHLY STAT-STRIP */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.5rem',
        width: '100%'
      }}>
        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MONTHLY REEL VIEWS</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#2C2A29', marginTop: '0.2rem' }}>
            {currentMonthData.views.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#736E68', marginTop: '0.1rem' }}>in {currentMonthData.label}</div>
        </div>

        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MONTHLY COMMENTS</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#2C2A29', marginTop: '0.2rem' }}>
            {currentMonthData.comments.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#736E68', marginTop: '0.1rem' }}>in {currentMonthData.label}</div>
        </div>

        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#FDF8F6', border: '1.5px solid #D97757', boxShadow: '0 2px 8px rgba(217,119,87,0.08)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#D97757', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AUTOMATED DMS DISPATCHED</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#D97757', marginTop: '0.2rem' }}>
            {currentMonthData.dms.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#736E68', marginTop: '0.1rem' }}>in {currentMonthData.label}</div>
        </div>

        <div style={{ padding: '0.75rem 1.15rem', borderRadius: '12px', background: '#F0F9FF', border: '1.5px solid #0369A1', boxShadow: '0 2px 8px rgba(3,105,161,0.08)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RESOURCE LINK CLICKS</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: '#0369A1', marginTop: '0.2rem' }}>
            {currentMonthData.clicks.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E7D32', marginTop: '0.1rem' }}>🎯 {overallCtr}% Conversion CTR</div>
        </div>
      </div>

      {/* 2. HISTORICAL PERFORMANCE LEDGER TABLE */}
      <div style={{ padding: '1.6rem', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #E6E1D8', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', width: '100%' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.2rem', color: '#2C2A29', margin: 0 }}>
            Performance Breakdown for {currentMonthData.label}
          </h3>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E6E1D8', background: '#FAF8F5', fontSize: '0.72rem', textTransform: 'uppercase', color: '#736E68', fontWeight: 800 }}>
                <th style={{ padding: '0.85rem 1rem' }}>Reel Content</th>
                <th style={{ padding: '0.85rem 1rem' }}>Views</th>
                <th style={{ padding: '0.85rem 1rem' }}>Comments</th>
                <th style={{ padding: '0.85rem 1rem' }}>DMs Dispatched</th>
                <th style={{ padding: '0.85rem 1rem' }}>Link Clicks</th>
                <th style={{ padding: '0.85rem 1rem' }}>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {currentMonthData.reels.map(r => {
                const ctr = r.dms > 0 ? Math.min(100, Math.round((r.clicks / r.dms) * 100)) : 0;

                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #E6E1D8' }}>
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          backgroundImage: `url('${r.thumbnail}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          flexShrink: 0,
                          border: '1px solid #E6E1D8'
                        }} />
                        <div>
                          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: '#2C2A29', lineHeight: 1.3 }}>
                            {r.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#736E68', marginTop: '0.15rem' }}>
                            Type: {r.type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 700, fontSize: '0.88rem', color: '#2C2A29' }}>{r.views.toLocaleString()}</td>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 700, fontSize: '0.88rem', color: '#2C2A29' }}>{r.comments.toLocaleString()}</td>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 800, fontSize: '0.88rem', color: '#D97757' }}>{r.dms.toLocaleString()} DMs</td>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 800, fontSize: '0.88rem', color: '#0369A1' }}>{r.clicks.toLocaleString()} Clicks</td>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 700, fontSize: '0.88rem', color: '#2E7D32' }}>{ctr}% CTR</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
