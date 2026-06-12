/* ════════════════════════════════════════
   QUINIELA RUSTRIAN — Social Layer
   MatchDetailSheet: pronósticos + reacciones + comentarios
════════════════════════════════════════ */
const { useState, useEffect, useRef } = React;

/* ─── BOTTOM SHEET SHELL ───────────────────────────────── */
function BottomSheet({ onClose, title, children }) {
  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0,
        background:'rgba(0,0,0,0.65)',
        zIndex:200,
        animation:'backdrop-in 220ms ease both',
      }} />
      <div style={{
        position:'fixed', bottom:0, left:'50%',
        transform:'translateX(-50%)',
        width:'100%', maxWidth:430,
        maxHeight:'88dvh',
        background:'var(--bg-surface)',
        borderRadius:'20px 20px 0 0',
        zIndex:201,
        display:'flex', flexDirection:'column',
        overflow:'hidden',
        animation:'sheet-up 320ms var(--ease-spring) both',
      }}>
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 6px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--bg-border)' }} />
        </div>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'2px 20px 14px', flexShrink:0 }}>
          <div>{title}</div>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:'50%', flexShrink:0,
            background:'var(--bg-elevated)', border:'none',
            color:'var(--text-secondary)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:16, marginTop:2,
            transition:'background var(--dur-fast)',
          }}>✕</button>
        </div>
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {children}
        </div>
      </div>
    </>
  );
}

/* ─── PREDICTION ROW WITH REACTIONS ────────────────────── */
const PRED_EMOJIS = ['🔥','🎯','😂','🤡','😭','👑'];

function PredRow({ result, isPlayed, userId, predRx, myReact, onReact }) {
  const { player, pred, pts } = result;
  const isMe   = player.id === userId;
  const ptColor = pts === 3 ? 'var(--pt-exact)' : pts === 1 ? 'var(--pt-correct)' : 'var(--pt-miss)';
  const rxMap  = predRx[player.id] || {};

  return (
    <div style={{ padding:'11px 0', borderBottom:'1px solid var(--bg-border)' }}>
      {/* Name row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
        <Avatar player={player} size={34} />
        <span style={{ flex:1, fontWeight:isMe?700:600, fontSize:14, color:isMe?'var(--accent)':'var(--text-primary)' }}>
          {player.name}{isMe?' · tú':''}
        </span>
        {/* Predicted score */}
        <span style={{ fontFamily:'var(--font-score)', fontSize:22, fontWeight:800, color:'var(--text-secondary)', letterSpacing:'-0.01em' }}>
          {pred.home}–{pred.away}
        </span>
        {/* Points badge (played only) */}
        {isPlayed && pts != null && (
          <div style={{ minWidth:32, textAlign:'right' }}>
            <div style={{ fontFamily:'var(--font-score)', fontSize:26, fontWeight:900, color:ptColor, lineHeight:1 }}>{pts}</div>
            <div style={{ fontSize:9, color:'var(--text-tertiary)', fontWeight:600 }}>pts</div>
          </div>
        )}
        {!isPlayed && (
          <span style={{ fontSize:10, color:'var(--text-tertiary)', background:'var(--bg-elevated)', padding:'2px 7px', borderRadius:6, fontWeight:500 }}>
            ❓
          </span>
        )}
      </div>

      {/* Quick-reaction row */}
      <div style={{ display:'flex', gap:5, paddingLeft:44, flexWrap:'wrap' }}>
        {PRED_EMOJIS.map(emoji => {
          const cnt    = rxMap[emoji] || 0;
          const active = myReact === emoji;
          const show   = cnt > 0 || active;
          return (
            <button key={emoji} onClick={() => onReact(player.id, emoji)} style={{
              padding:'3px 8px', borderRadius:20, border:'none',
              background: active ? 'var(--accent-muted)' : show ? 'var(--bg-elevated)' : 'rgba(255,255,255,0.03)',
              outline: active ? '1.5px solid var(--accent)' : 'none',
              fontSize:13, cursor:'pointer', opacity: show ? 1 : 0.4,
              display:'inline-flex', alignItems:'center', gap:3,
              color:'var(--text-primary)',
              transition:'all 140ms',
            }}>
              {emoji}
              {cnt > 0 && <span style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)' }}>{cnt}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── COMMENT BUBBLE ───────────────────────────────────── */
function CommentItem({ comment, players, userId, isNew }) {
  const player = players.find(p => p.id === comment.playerId);
  if (!player) return null;
  const isMe = comment.playerId === userId;

  const elapsed = (() => {
    const d = Date.now() - comment.ts;
    if (d < 60000)   return 'ahora';
    if (d < 3600000) return `${Math.floor(d/60000)}min`;
    if (d < 86400000) return `${Math.floor(d/3600000)}h`;
    return `${Math.floor(d/86400000)}d`;
  })();

  return (
    <div className={isNew ? 'comment-enter' : ''} style={{
      display:'flex',
      flexDirection: isMe ? 'row-reverse' : 'row',
      gap:8, alignItems:'flex-end',
      marginBottom:12,
    }}>
      {!isMe && <Avatar player={player} size={28} />}
      <div style={{ maxWidth:'74%' }}>
        {!isMe && (
          <p style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:3, marginLeft:4, fontWeight:600 }}>
            {player.name}
          </p>
        )}
        <div style={{
          padding:'9px 13px',
          background: isMe ? 'var(--accent-muted)' : 'var(--bg-elevated)',
          border: isMe ? '1px solid rgba(180,240,64,0.20)' : '1px solid rgba(255,255,255,0.04)',
          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          fontSize:13, color:'var(--text-primary)', lineHeight:1.45,
        }}>
          {comment.text}
        </div>
        <p style={{ fontSize:10, color:'var(--text-tertiary)', marginTop:3, textAlign:isMe?'right':'left', paddingLeft:isMe?0:4 }}>
          {elapsed}
        </p>
      </div>
    </div>
  );
}

/* ─── MAIN SHEET ───────────────────────────────────────── */
function MatchDetailSheet({ match, userId, onClose, initialTab }) {
  const { PLAYERS, PREDICTIONS, calcPoints, PRED_REACTIONS: defaultPRx, COMMENTS: defaultCmts } = window.QData;

  const isPlayed = match.status === 'played';
  const isLive   = match.status === 'live';

  const [tab,      setTab]      = useState(initialTab || 'preds');
  const [predRx,   setPredRx]   = useState(defaultPRx[match.id] || {});
  const [myPredRx, setMyPredRx] = useState({});
  const [comments, setComments] = useState(defaultCmts[match.id] || []);
  const [input,    setInput]    = useState('');
  const [newIds,   setNewIds]   = useState(new Set());
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (tab === 'comments' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (tab === 'comments') setTimeout(() => inputRef.current?.focus(), 150);
  }, [tab]);

  /* Build predictions list */
  const matchPreds = PLAYERS
    .map(player => {
      const pred = PREDICTIONS[player.id]?.[match.id];
      const pts  = (isPlayed && pred) ? calcPoints(pred, match.score) : null;
      return { player, pred, pts };
    })
    .filter(r => r.pred != null)
    .sort((a, b) => {
      if (isPlayed) return b.pts - a.pts;
      return a.player.position - b.player.position;
    });

  /* Per-prediction reaction handler */
  const handlePredReact = (playerId, emoji) => {
    const cur = myPredRx[playerId];
    const newMy = { ...myPredRx };
    const newRx = { ...predRx, [playerId]: { ...(predRx[playerId] || {}) } };
    if (cur === emoji) {
      delete newMy[playerId];
      newRx[playerId][emoji] = Math.max(0, (newRx[playerId][emoji] || 0) - 1);
    } else {
      if (cur) newRx[playerId][cur] = Math.max(0, (newRx[playerId][cur] || 0) - 1);
      newMy[playerId] = emoji;
      newRx[playerId][emoji] = (newRx[playerId][emoji] || 0) + 1;
    }
    setMyPredRx(newMy);
    setPredRx(newRx);
  };

  /* Submit comment */
  const submitComment = () => {
    const text = input.trim();
    if (!text) return;
    const id = `cnew_${Date.now()}`;
    const c = { id, playerId: userId, text, ts: Date.now() };
    setComments(prev => [...prev, c]);
    setNewIds(prev => new Set([...prev, id]));
    setInput('');
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  };

  const me = PLAYERS.find(p => p.id === userId);

  /* Sheet title */
  const title = (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:24, lineHeight:1 }}>{match.home.flag}</span>
        <span style={{ fontFamily:'var(--font-score)', fontSize:26, fontWeight:900, letterSpacing:'-0.01em' }}>
          {(isLive || isPlayed) ? `${match.score.home} : ${match.score.away}` : 'vs'}
        </span>
        <span style={{ fontSize:24, lineHeight:1 }}>{match.away.flag}</span>
        {isLive && (
          <span style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(34,197,94,.12)', padding:'3px 8px', borderRadius:10 }}>
            <LiveDot size={6} />
            <span style={{ fontSize:11, color:'var(--live)', fontWeight:700 }}>{match.minute}'</span>
          </span>
        )}
      </div>
      <p style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:3 }}>
        {match.phase} · {isPlayed ? '🔒 FINAL' : match.date}
      </p>
    </div>
  );

  /* Tab pill */
  const TabBtn = ({ id, label, count }) => {
    const active = tab === id;
    return (
      <button onClick={() => setTab(id)} style={{
        flex:1, padding:'10px 4px',
        background:'none', border:'none',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        fontFamily:'var(--font-ui)', fontSize:13, fontWeight:active?700:500,
        cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        marginBottom:-1,
        transition:'all 200ms',
      }}>
        {label}
        <span style={{
          background: active ? 'var(--accent-muted)' : 'var(--bg-elevated)',
          color: active ? 'var(--accent)' : 'var(--text-tertiary)',
          padding:'1px 6px', borderRadius:10, fontSize:11, fontWeight:700,
        }}>{count}</span>
      </button>
    );
  };

  return (
    <BottomSheet onClose={onClose} title={title}>
      {/* Tab bar */}
      <div style={{ display:'flex', padding:'0 20px', flexShrink:0, borderBottom:'1px solid var(--bg-border)' }}>
        <TabBtn id="preds"    label="Pronósticos" count={matchPreds.length} />
        <TabBtn id="comments" label="Comentarios" count={comments.length} />
      </div>

      {/* ── PREDICTIONS TAB ── */}
      {tab === 'preds' && (
        <div style={{ flex:1, overflowY:'auto', padding:'4px 20px 24px' }}>
          {matchPreds.length === 0
            ? <EmptyState emoji="🦦" title="Nadie ha pronosticado aún" sub="Sé el primero en la pestaña de Partidos" />
            : matchPreds.map(result => (
                <PredRow
                  key={result.player.id}
                  result={result}
                  isPlayed={isPlayed}
                  userId={userId}
                  predRx={predRx}
                  myReact={myPredRx[result.player.id]}
                  onReact={handlePredReact}
                />
              ))
          }
        </div>
      )}

      {/* ── COMMENTS TAB ── */}
      {tab === 'comments' && (
        <>
          <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'14px 20px 8px' }}>
            {comments.length === 0
              ? <EmptyState emoji="🤫" title="Silencio total" sub="Rompe el hielo, di algo" />
              : comments.map(c => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    players={PLAYERS}
                    userId={userId}
                    isNew={newIds.has(c.id)}
                  />
                ))
            }
          </div>
          {/* Input bar */}
          <div style={{
            padding:'10px 16px',
            paddingBottom:'max(10px, env(safe-area-inset-bottom, 10px))',
            borderTop:'1px solid var(--bg-border)',
            display:'flex', gap:8, alignItems:'center',
            background:'var(--bg-surface)', flexShrink:0,
          }}>
            {me && <Avatar player={me} size={30} />}
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
              placeholder="Escribe algo..."
              style={{
                flex:1, padding:'9px 14px',
                background:'var(--bg-elevated)',
                border:'1px solid var(--bg-border)',
                borderRadius:'var(--r-full)',
                color:'var(--text-primary)',
                fontFamily:'var(--font-ui)', fontSize:13, outline:'none',
                transition:'border-color var(--dur-fast)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e  => e.target.style.borderColor = 'var(--bg-border)'}
            />
            <button
              onClick={submitComment}
              disabled={!input.trim()}
              style={{
                width:36, height:36, borderRadius:'50%', border:'none',
                background: input.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
                color: input.trim() ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
                cursor: input.trim() ? 'pointer' : 'default',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18, flexShrink:0,
                transition:'all 150ms var(--ease-smooth)',
                transform: input.trim() ? 'scale(1)' : 'scale(0.9)',
              }}
            >↑</button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

Object.assign(window, { MatchDetailSheet });
