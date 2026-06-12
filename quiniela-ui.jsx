/* ════════════════════════════════════════
   QUINIELA RUSTRIAN — Shared UI Components
════════════════════════════════════════ */
const { useState, useEffect } = React;

/* ─── AVATAR ─── */
function Avatar({ player, size = 36 }) {
  const bg = `hsl(${player.hue}, 58%, 32%)`;
  const border = `hsl(${player.hue}, 58%, 45%)`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg,
      border: `1.5px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.33, fontWeight: 700,
      fontFamily: 'var(--font-ui)', flexShrink: 0,
      letterSpacing: '-0.01em', userSelect: 'none',
    }}>
      {player.initials}
    </div>
  );
}

/* ─── LIVE DOT ─── */
function LiveDot({ size = 8 }) {
  return <span className="live-dot" style={{ width: size, height: size }} />;
}

/* ─── BADGE ─── */
function Badge({ children, variant = 'muted', style: extra }) {
  return <span className={`badge badge-${variant}`} style={extra}>{children}</span>;
}

/* ─── SEGMENTED CONTROL ─── */
function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--bg-elevated)',
      borderRadius: 'var(--r-full)', padding: 3, gap: 2,
    }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            flex: 1, padding: '7px 10px', borderRadius: 'var(--r-full)',
            border: 'none',
            background: active ? 'var(--accent)' : 'transparent',
            color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)', fontSize: 13,
            fontWeight: active ? 700 : 500,
            cursor: 'pointer',
            transition: 'all var(--dur-normal) var(--ease-smooth)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            whiteSpace: 'nowrap',
          }}>
            {opt.live && <LiveDot size={6} />}
            {opt.label}
            {opt.count != null && (
              <span style={{
                background: active ? 'rgba(0,0,0,0.18)' : 'var(--bg-border)',
                padding: '1px 6px', borderRadius: 10, fontSize: 11,
                color: active ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
                fontWeight: 600,
              }}>{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── SKELETON CARD ─── */
function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="skeleton" style={{ height: 11, width: '35%' }} />
        <div className="skeleton" style={{ height: 11, width: '18%' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
          <div className="skeleton" style={{ height: 10, width: '70%' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 54, height: 54, borderRadius: 10 }} />
          <div className="skeleton" style={{ width: 14, height: 28, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 54, height: 54, borderRadius: 10 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
          <div className="skeleton" style={{ height: 10, width: '70%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 10, width: '55%', margin: '0 auto' }} />
    </div>
  );
}

/* ─── MINI AVATAR STACK ─── */
function MiniAvatarStack({ playerIds, players }) {
  const max = 5;
  const shown = playerIds.slice(0, max);
  const rest  = playerIds.length - shown.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex' }}>
        {shown.map((id, i) => {
          const p = players.find(pl => pl.id === id);
          if (!p) return null;
          return (
            <div key={id} style={{ marginLeft: i > 0 ? -7 : 0, zIndex: shown.length - i, position: 'relative' }}>
              <Avatar player={p} size={22} />
            </div>
          );
        })}
      </div>
      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
        {rest > 0 && `+${rest} `}
        {playerIds.length === 1 ? 'pronosticó' : 'pronosticaron'}
      </span>
    </div>
  );
}

/* ─── SCORE INPUT ─── */
function ScoreInput({ value, onChange }) {
  return (
    <input
      className="score-input"
      type="number" min={0} max={20}
      value={value === '' ? '' : value}
      onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder="–"
    />
  );
}

/* ─── MATCH CARD ─── */
function MatchCard({ match, prediction, onPredictionChange, players, predictedBy, stagger, onViewPredictions }) {
  const { PLAYERS } = window.QData;
  const allPlayers = players || PLAYERS;
  const predicted  = predictedBy || [];
  const pred = prediction || { home: '', away: '' };

  const isLive    = match.status === 'live';
  const isPlayed  = match.status === 'played';
  const isUpcoming = match.status === 'upcoming';

  const cardBorder = isLive
    ? '1px solid rgba(34,197,94,0.30)'
    : '1px solid rgba(255,255,255,0.04)';
  const cardShadow = isLive ? 'var(--sh-live)' : 'var(--sh-card)';

  return (
    <div className={`card fade-up s${stagger || 1}`} style={{
      padding: '14px 16px',
      border: cardBorder,
      boxShadow: cardShadow,
    }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {isLive && <><LiveDot /><span style={{ color:'var(--live)', fontSize:12, fontWeight:700, letterSpacing:'0.06em' }}>EN VIVO {match.minute}'</span></>}
          {isPlayed  && <span style={{ fontSize:11, color:'var(--text-secondary)' }}>🔒 {match.date} · FINAL</span>}
          {isUpcoming && <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{match.date}</span>}
        </div>
        <span style={{
          fontSize:11, color:'var(--text-tertiary)',
          background:'var(--bg-elevated)', padding:'2px 9px', borderRadius:6,
          fontWeight:500,
        }}>{match.phase}</span>
      </div>

      {/* Teams + Score/Inputs */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4, marginBottom:14 }}>
        {/* Home team */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:40, lineHeight:1 }}>{match.home.flag}</span>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', textAlign:'center', lineHeight:1.2 }}>{match.home.name}</span>
        </div>

        {/* Center */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {(isLive || isPlayed) ? (
            <>
              <span style={{ fontFamily:'var(--font-score)', fontSize:52, fontWeight:900, color:'var(--text-primary)', lineHeight:1 }}>{match.score.home}</span>
              <span style={{ fontFamily:'var(--font-score)', fontSize:30, fontWeight:600, color:'var(--text-tertiary)', lineHeight:1, marginTop:2 }}>:</span>
              <span style={{ fontFamily:'var(--font-score)', fontSize:52, fontWeight:900, color:'var(--text-primary)', lineHeight:1 }}>{match.score.away}</span>
            </>
          ) : (
            <>
              <ScoreInput value={pred.home} onChange={v => onPredictionChange?.({ ...pred, home: v })} />
              <span style={{ fontFamily:'var(--font-score)', fontSize:28, fontWeight:600, color:'var(--text-tertiary)' }}>:</span>
              <ScoreInput value={pred.away} onChange={v => onPredictionChange?.({ ...pred, away: v })} />
            </>
          )}
        </div>

        {/* Away team */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:40, lineHeight:1 }}>{match.away.flag}</span>
          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', textAlign:'center', lineHeight:1.2 }}>{match.away.name}</span>
        </div>
      </div>

      {/* Footer */}
      {(isLive || isPlayed) && predicted.length > 0 ? (
        <button
          onClick={onViewPredictions}
          style={{
            width:'100%', background:'none', border:'none', cursor:'pointer',
            borderTop:'1px solid var(--bg-border)',
            paddingTop:10, paddingLeft:0, paddingRight:0, paddingBottom:0,
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}
        >
          <MiniAvatarStack playerIds={predicted} players={allPlayers} />
          <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700, letterSpacing:'-0.01em' }}>Ver →</span>
        </button>
      ) : isUpcoming ? (
        <div style={{ textAlign:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-tertiary)' }}>📍 {match.venue}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ─── EMPTY STATE ─── */
function EmptyState({ emoji = '🦗', title, sub }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'48px 24px', textAlign:'center' }}>
      <span style={{ fontSize:44 }}>{emoji}</span>
      <p style={{ fontSize:15, fontWeight:700, color:'var(--text-secondary)' }}>{title}</p>
      {sub && <p style={{ fontSize:13, color:'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  );
}

/* ─── STAT BLOCK ─── */
function StatBlock({ value, label, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
      <span style={{ fontFamily:'var(--font-score)', fontSize:32, fontWeight:900, lineHeight:1, color: color || 'var(--text-primary)' }}>{value}</span>
      <span style={{ fontSize:11, color:'var(--text-tertiary)', fontWeight:500 }}>{label}</span>
    </div>
  );
}

/* ─── EXPORTS ─── */
Object.assign(window, {
  Avatar, LiveDot, Badge, SegmentedControl,
  SkeletonCard, MiniAvatarStack, ScoreInput, MatchCard,
  EmptyState, StatBlock,
});
