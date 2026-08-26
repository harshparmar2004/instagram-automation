import React, { useState } from 'react';

/**
 * CreateAutomationFlow - Full-width automation builder with internal scrollable reel picker & Follow-First Gate visual workflow preview
 */

const MOCK_REELS = [
  {
    id: 'global',
    isGlobal: true,
    title: 'Global Account Rule',
    description: 'Applies automatically to ALL active & future reels',
    type: 'GLOBAL',
    views: '125K',
    comments: '3.4K'
  },
  {
    id: '17992019201',
    title: 'Free 2026 AI Growth Playbook PDF 📚',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    type: 'REEL',
    views: '48.5K',
    comments: '1.4K'
  },
  {
    id: '17992019202',
    title: 'How I scaled to 100k followers in 6 months 🚀',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
    type: 'REEL',
    views: '92.1K',
    comments: '2.8K'
  },
  {
    id: '17992019203',
    title: 'Top 10 Coding & Design Tools Every Creator Needs 💻',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80',
    type: 'IMAGE',
    views: '31.2K',
    comments: '890'
  },
  {
    id: '17992019204',
    title: 'Exclusive Creator Masterclass Signup 🎓',
    thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&auto=format&fit=crop&q=80',
    type: 'REEL',
    views: '64.8K',
    comments: '1.9K'
  },
  {
    id: '17992019205',
    title: 'Monetize Your Audience With DMs Masterclass 💸',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=80',
    type: 'REEL',
    views: '112K',
    comments: '4.1K'
  },
  {
    id: '17992019206',
    title: '10 Viral Hook Strategies for Reels 🎬',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80',
    type: 'REEL',
    views: '88.3K',
    comments: '2.3K'
  }
];

export const Step1TargetReel = ({ selectedReelId, onSelectReel }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReels = MOCK_REELS.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.1rem', fontWeight: 800, color: '#2C2A29', margin: 0 }}>
            Step 1: Pick a Target Reel or Post
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#736E68', marginTop: '0.1rem' }}>
            Select which specific content item this comment-to-DM automation rule will monitor.
          </p>
        </div>

        <div style={{ minWidth: '220px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reels..."
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid #D1C9BE',
              background: '#FAF8F5',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>
      </div>

      <div style={{
        maxHeight: '280px',
        overflowY: 'auto',
        borderRadius: '12px',
        border: '1px solid #E6E1D8',
        padding: '0.75rem',
        background: '#FAF8F5'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '0.85rem',
          width: '100%'
        }}>
          {filteredReels.map(reel => {
            const isSelected = selectedReelId === reel.id;

            return (
              <div
                key={reel.id}
                onClick={() => onSelectReel(reel.id)}
                style={{
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #D97757' : '1px solid #E6E1D8',
                  background: isSelected ? '#FDF8F6' : '#FFFFFF',
                  boxShadow: isSelected ? '0 4px 14px rgba(217, 119, 87, 0.16)' : '0 1px 4px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#D97757',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    zIndex: 2,
                    boxShadow: '0 2px 6px rgba(217,119,87,0.3)'
                  }}>
                    ✓
                  </div>
                )}

                {reel.isGlobal ? (
                  <div style={{
                    height: '105px',
                    background: 'linear-gradient(135deg, #FAF8F5 0%, #E6E1D8 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.65rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.3rem', marginBottom: '0.1rem' }}>🌐</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.85rem', color: '#D97757' }}>
                      Global Account Rule
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#736E68', marginTop: '0.1rem' }}>Monitors all current & future posts</div>
                  </div>
                ) : (
                  <div style={{
                    height: '105px',
                    width: '100%',
                    backgroundImage: `url('${reel.thumbnail}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      background: 'rgba(0,0,0,0.65)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px'
                    }}>
                      {reel.type}
                    </div>
                  </div>
                )}

                <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: '#2C2A29',
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {reel.title}
                  </div>

                  {!reel.isGlobal && (
                    <div style={{ fontSize: '0.72rem', color: '#736E68', display: 'flex', gap: '0.6rem', marginTop: '0.35rem', fontWeight: 600 }}>
                      <span>Views: {reel.views}</span>
                      <span>Comments: {reel.comments}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Step2TriggerKeywords = ({ keywords, onChangeKeywords, onApplyPreset }) => {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.15rem', fontWeight: 800, color: '#2C2A29', margin: 0 }}>
          Step 2: Define Trigger Keywords
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#736E68', marginTop: '0.15rem' }}>
          Followers who comment these exact words will trigger the automated DM dispatch.
        </p>
      </div>

      <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.15rem', background: '#FAF8F5', border: '1px solid #E6E1D8', borderRadius: '12px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
          Quick Keyword Presets:
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => onApplyPreset('PLAYBOOK, PDF, GUIDE')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, background: '#FFF', border: '1px solid #E6E1D8', borderRadius: '7px', cursor: 'pointer' }}>
            "PLAYBOOK, PDF, GUIDE" (Lead Magnet)
          </button>
          <button type="button" onClick={() => onApplyPreset('LINK, URL, ACCESS')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, background: '#FFF', border: '1px solid #E6E1D8', borderRadius: '7px', cursor: 'pointer' }}>
            "LINK, URL, ACCESS" (General Link)
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C2A29' }}>Comment Keyword(s)</label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => onChangeKeywords(e.target.value)}
          placeholder="e.g. PLAYBOOK (or comma-separated: PLAYBOOK, PDF, GUIDE)"
          style={{ width: '100%', padding: '0.75rem 1.1rem', fontSize: '0.92rem', fontWeight: 500, borderRadius: '10px', border: '1px solid #D1C9BE', background: '#FAF8F5', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)', outline: 'none' }}
        />
        <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.15rem' }}>Separate multiple trigger keywords with commas. Matching is case-insensitive.</div>
      </div>
    </div>
  );
};

export const Step3DMConfig = ({
  actionType,
  onChangeActionType,
  responseText,
  onChangeResponseText,
  linkUrl,
  onChangeLinkUrl,
  followPrompt,
  onChangeFollowPrompt
}) => {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.15rem', fontWeight: 800, color: '#2C2A29', margin: 0 }}>
          Step 3: Direct Message Dispatch & Resource
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#736E68', marginTop: '0.15rem' }}>
          Configure the automated response message body and deliverable URL sent to followers.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', width: '100%' }}>
        
        {/* ACTION TYPE SELECTOR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C2A29' }}>Automation Action Type</label>
          <select
            value={actionType}
            onChange={(e) => onChangeActionType(e.target.value)}
            style={{ width: '100%', padding: '0.7rem 1rem', fontSize: '0.9rem', fontWeight: 600, borderRadius: '10px', border: '1px solid #D1C9BE', background: '#FAF8F5', outline: 'none' }}
          >
            <option value="link_dm">Send DM with Clickable Deliverable Link</option>
            <option value="follow_first">Ask to Follow First Gate (Follow Verification)</option>
            <option value="direct_dm">Send Direct Text DM (No Link)</option>
          </select>
        </div>

        {/* FOLLOW-FIRST GATE EXPLANATION & WORKFLOW PREVIEW */}
        {actionType === 'follow_first' && (
          <div style={{
            padding: '1rem 1.25rem',
            background: '#FDF8F6',
            border: '2px solid #D97757',
            borderRadius: '14px',
            boxShadow: '0 4px 14px rgba(217,119,87,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔐</span>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.95rem', fontWeight: 800, color: '#D97757', margin: 0 }}>
                Follow-First Gate System Active
              </h3>
            </div>
            
            <p style={{ fontSize: '0.82rem', color: '#2C2A29', lineHeight: 1.45, margin: '0 0 0.85rem 0' }}>
              Followers must <strong>follow @creator.studio</strong> first before receiving your PDF resource. InstaAuto verifies their follow status in DM when they reply!
            </p>

            {/* 4-STEP VISUAL FOLLOW GATE WORKFLOW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', background: '#FFFFFF', padding: '0.85rem', borderRadius: '10px', border: '1px solid #F2E3D5' }}>
              <div style={{ fontSize: '0.78rem' }}>
                <strong style={{ color: '#D97757' }}>1. Comment:</strong> Follower comments trigger word on your Reel.
              </div>
              <div style={{ fontSize: '0.78rem' }}>
                <strong style={{ color: '#D97757' }}>2. Gate DM:</strong> InstaAuto asks follower to follow your account first.
              </div>
              <div style={{ fontSize: '0.78rem' }}>
                <strong style={{ color: '#D97757' }}>3. Follow & Reply:</strong> Follower clicks Follow and replies <em>"I FOLLOWED"</em>.
              </div>
              <div style={{ fontSize: '0.78rem' }}>
                <strong style={{ color: '#2E7D32' }}>4. PDF Unlocked:</strong> Deliverable PDF link is automatically dispatched!
              </div>
            </div>
          </div>
        )}

        {/* FOLLOW PROMPT INPUT (WHEN FOLLOW-FIRST GATE ACTIVE) */}
        {actionType === 'follow_first' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C2A29' }}>Follow Gate Prompt DM Message</label>
            <textarea
              rows={2}
              value={followPrompt}
              onChange={(e) => onChangeFollowPrompt(e.target.value)}
              placeholder="e.g. Thanks for commenting! Please follow @creator.studio first, then reply 'I FOLLOWED' in this DM to unlock your link!"
              style={{ width: '100%', padding: '0.75rem 1.1rem', fontSize: '0.9rem', fontFamily: 'inherit', fontWeight: 500, borderRadius: '10px', border: '1px solid #D1C9BE', background: '#FAF8F5', outline: 'none', lineHeight: 1.4 }}
            />
          </div>
        )}

        {/* MAIN MESSAGE BODY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight 700, color: '#2C2A29' }}>
            {actionType === 'follow_first' ? 'Unlocked Deliverable DM Message Body' : 'DM Message Body'}
          </label>
          <textarea
            rows={3}
            value={responseText}
            onChange={(e) => onChangeResponseText(e.target.value)}
            placeholder="e.g. Thanks for commenting! Here is your requested resource link..."
            style={{ width: '100%', padding: '0.75rem 1.1rem', fontSize: '0.9rem', fontFamily: 'inherit', fontWeight: 500, borderRadius: '10px', border: '1px solid #D1C9BE', background: '#FAF8F5', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)', outline: 'none', lineHeight: 1.45 }}
          />
        </div>

        {/* DELIVERABLE RESOURCE LINK INPUT */}
        {(actionType === 'link_dm' || actionType === 'follow_first') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C2A29' }}>Deliverable Resource URL (PDF / Guide)</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => onChangeLinkUrl(e.target.value)}
              placeholder="https://example.com/playbook-guide.pdf"
              style={{ width: '100%', padding: '0.75rem 1.1rem', fontSize: '0.9rem', fontWeight: 500, borderRadius: '10px', border: '1px solid #D1C9BE', background: '#FAF8F5', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)', outline: 'none' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const Step4PacingReply = ({ delaySeconds, onChangeDelay, publicReply, onChangePublicReply }) => {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.15rem', fontWeight: 800, color: '#2C2A29', margin: 0 }}>
          Step 4: Anti-Spam Pacing & Public Comment Reply
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#736E68', marginTop: '0.15rem' }}>
          Protect account health with delay pacing and boost post engagement with public comment replies.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', width: '100%' }}>
        <div style={{ padding: '1.15rem', background: '#FAF8F5', border: '1px solid #E6E1D8', borderRadius: '12px' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2C2A29' }}>Anti-Spam Delay Pacing</label>
          <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.1rem' }}>Natural delay before sending DM</div>
          <select
            value={delaySeconds}
            onChange={(e) => onChangeDelay(Number(e.target.value))}
            style={{ width: '100%', padding: '0.65rem 0.95rem', fontSize: '0.88rem', fontWeight: 600, borderRadius: '8px', border: '1px solid #D1C9BE', background: '#FFF', marginTop: '0.5rem', outline: 'none' }}
          >
            <option value={0}>Instant Dispatch (0 seconds)</option>
            <option value={5}>5 Seconds Delay (Recommended)</option>
            <option value={15}>15 Seconds Delay</option>
            <option value={30}>30 Seconds Delay</option>
          </select>
        </div>

        <div style={{ padding: '1.15rem', background: '#FAF8F5', border: '1px solid #E6E1D8', borderRadius: '12px' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2C2A29' }}>Public Comment Reply (Optional)</label>
          <div style={{ fontSize: '0.78rem', color: '#736E68', marginTop: '0.1rem' }}>Posts public comment reply under post</div>
          <input
            type="text"
            value={publicReply}
            onChange={(e) => onChangePublicReply(e.target.value)}
            placeholder="e.g. Sent! Check your DMs 📩"
            style={{ width: '100%', padding: '0.65rem 0.95rem', fontSize: '0.88rem', fontWeight: 500, borderRadius: '8px', border: '1px solid #D1C9BE', background: '#FFF', marginTop: '0.5rem', outline: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export const StepperHeader = ({ currentStep, onSelectStep }) => {
  const steps = [
    { number: 1, title: 'Target Reel' },
    { number: 2, title: 'Trigger Keywords' },
    { number: 3, title: 'DM & Resource' },
    { number: 4, title: 'Pacing & Reply' }
  ];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', width: '100%' }}>
        {steps.map(step => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div
              key={step.number}
              onClick={() => onSelectStep(step.number)}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                background: isActive ? '#FFFFFF' : '#FAF8F5',
                border: isActive ? '2px solid #D97757' : '1px solid #E6E1D8',
                boxShadow: isActive ? '0 2px 8px rgba(217,119,87,0.1)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: isCompleted ? '#2E7D32' : (isActive ? '#D97757' : '#E6E1D8'),
                color: isCompleted || isActive ? '#FFFFFF' : '#736E68',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.78rem',
                flexShrink: 0
              }}>
                {isCompleted ? '✓' : step.number}
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#736E68', textTransform: 'uppercase' }}>STEP {step.number}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#2C2A29' }}>{step.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ width: '100%', height: '5px', background: '#E6E1D8', borderRadius: '10px', marginTop: '0.65rem', overflow: 'hidden' }}>
        <div style={{ width: `${(currentStep / 4) * 100}%`, height: '100%', background: '#D97757', transition: 'width 0.3s ease-in-out' }} />
      </div>
    </div>
  );
};

export const StickyActionBar = ({ currentStep, onPrev, onNext, onDeploy, onCancel }) => {
  return (
    <div style={{
      width: '100%',
      background: '#FFFFFF',
      borderTop: '1px solid #E6E1D8',
      padding: '0.85rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
      marginTop: '1rem'
    }}>
      <button type="button" onClick={onCancel} style={{ padding: '0.55rem 1.15rem', fontSize: '0.88rem', fontWeight: 700, color: '#736E68', background: '#FAF8F5', border: '1px solid #E6E1D8', borderRadius: '9px', cursor: 'pointer' }}>
        Cancel
      </button>

      <div style={{ display: 'flex', gap: '0.65rem' }}>
        {currentStep > 1 && (
          <button type="button" onClick={onPrev} style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem', fontWeight: 700, color: '#2C2A29', background: '#FFF', border: '1px solid #D1C9BE', borderRadius: '9px', cursor: 'pointer' }}>
            ← Back
          </button>
        )}

        {currentStep < 4 ? (
          <button type="button" onClick={onNext} style={{ padding: '0.58rem 1.45rem', fontSize: '0.88rem', fontWeight: 800, color: '#FFF', background: '#D97757', border: 'none', borderRadius: '9px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(217,119,87,0.25)' }}>
            Continue to Step {currentStep + 1} →
          </button>
        ) : (
          <button type="button" onClick={onDeploy} style={{ padding: '0.58rem 1.65rem', fontSize: '0.9rem', fontWeight: 800, color: '#FFF', background: '#D97757', border: 'none', borderRadius: '9px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(217,119,87,0.3)' }}>
            🚀 Deploy Automation
          </button>
        )}
      </div>
    </div>
  );
};

export default function CreateAutomationFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedReelId, setSelectedReelId] = useState('global');
  const [keywords, setKeywords] = useState('PLAYBOOK, PDF');
  const [actionType, setActionType] = useState('link_dm');
  const [responseText, setResponseText] = useState('Hey! Here is the free 2026 AI Growth Playbook PDF you requested 🚀');
  const [linkUrl, setLinkUrl] = useState('https://example.com/playbook-guide.pdf');
  const [followPrompt, setFollowPrompt] = useState('Thanks for commenting! Please follow @creator.studio first, then reply "I FOLLOWED" in this DM to unlock your link!');
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [publicReply, setPublicReply] = useState('Sent! Check your DMs 📩');

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleDeploy = () => {
    alert(`Automation Deployed Successfully!`);
  };

  const applyPreset = (type) => {
    if (type === 'follow') {
      setActionType('follow_first');
      setKeywords('SECRET, LINK, UNLOCK');
      setFollowPrompt('Thanks for commenting! Please follow @creator.studio first, then reply "I FOLLOWED" in this DM to unlock your link!');
      setResponseText('🎉 Thank you for following @creator.studio! Here is your requested resource link:');
      setLinkUrl('https://example.com/secret-guide.pdf');
    } else {
      setKeywords('PDF, GUIDE');
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1480px', margin: '0 auto', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E6E1D8', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.03)' }}>
      {/* HEADER */}
      <div style={{ padding: '1.15rem 1.75rem 0.85rem 1.75rem', borderBottom: '1px solid #E6E1D8', background: '#FAF8F5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: '#2C2A29', margin: 0, letterSpacing: '-0.02em' }}>
              Create New Automation
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#736E68', margin: '0.15rem 0 0 0' }}>Set up automated comment-to-DM responses and deliverable links in 4 easy steps.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={() => applyPreset('pdf')} style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 0.75rem', background: '#FFF', border: '1px solid #E6E1D8', borderRadius: '7px', cursor: 'pointer' }}>Lead E-Book</button>
            <button type="button" onClick={() => applyPreset('follow')} style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 0.75rem', background: '#D97757', color: '#FFF', border: 'none', borderRadius: '7px', cursor: 'pointer' }}>Follow First Gate 🔐</button>
          </div>
        </div>

        <StepperHeader currentStep={currentStep} onSelectStep={setCurrentStep} />
      </div>

      {/* BODY */}
      <div style={{ padding: '1.35rem 1.75rem' }}>
        {currentStep === 1 && <Step1TargetReel selectedReelId={selectedReelId} onSelectReel={setSelectedReelId} />}
        {currentStep === 2 && <Step2TriggerKeywords keywords={keywords} onChangeKeywords={setKeywords} onApplyPreset={setKeywords} />}
        {currentStep === 3 && (
          <Step3DMConfig
            actionType={actionType}
            onChangeActionType={setActionType}
            responseText={responseText}
            onChangeResponseText={setResponseText}
            linkUrl={linkUrl}
            onChangeLinkUrl={setLinkUrl}
            followPrompt={followPrompt}
            onChangeFollowPrompt={setFollowPrompt}
          />
        )}
        {currentStep === 4 && <Step4PacingReply delaySeconds={delaySeconds} onChangeDelay={setDelaySeconds} publicReply={publicReply} onChangePublicReply={setPublicReply} />}
      </div>

      {/* STICKY BAR */}
      <StickyActionBar
        currentStep={currentStep}
        onPrev={handlePrev}
        onNext={handleNext}
        onDeploy={handleDeploy}
        onCancel={() => window.location.hash = 'workflows'}
      />
    </div>
  );
}
