/* ════════════════════════════════════════
   QUINIELA RUSTRIAN — App Screens (4)
════════════════════════════════════════ */
const { useState, useEffect, useRef } = React;

/* ══════════════════════════════════════
   1. PARTIDOS
══════════════════════════════════════ */
function PartidosScreen({ predictions, onPredictionChange, userId }) {
  const { MATCHES, PREDICTED_BY, PLAYERS } = window.QData;
  const [tab,          setTab]          = useState('live');
  const [loading,      setLoading]      = useState(true);
  const [sheetMatchId, setSheetMatchId] = useState(null);
  const sheetMatch = sheetMatchId ? MATCHES.find(m => m.id === sheetMatchId) : null;

  const live     = MATCHES.filter(m => m.status === 'live');
  const upcoming = MATCHES.filter(m => m.status === 'upcoming');
  const played   = MATCHES.filter(m => m.status === 'played');

  const tabMap = { live, upcoming, played };
  const filtered = tabMap[tab] || [];

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, [tab]);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'18px 20px 10px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
        <div>
          <p style={{ fontSize:11, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.10em', marginBottom:3, fontWeight:600 }}>FIFA World Cup 2026</p>
          <h1 style={{ fontSize:23, fontWeight:800, lineHeight:1.1, letterSpacing:'-0.02em' }}>Quiniela Rustrian</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
          {live.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(34,197,94,.12)', padding:'4px 10px', borderRadius:20 }}>
              <LiveDot size={7} />
              <span style={{ fontSize:11, color:'var(--live)', fontWeight:700 }}>{live.length} EN VIVO</span>
            </div>
          )}
        </div>
      </div>

      {/* Segmented control */}
      <div style={{ padding:'0 20px 14px', flexShrink:0 }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value:'live',     label:'En Vivo',  live:true,  count:live.length },
            { value:'upcoming', label:'Próximos',             count:upcoming.length },
            { value:'played',   label:'Jugados',              count:played.length },
          ]}
        />
      </div>

      {/* Cards list */}
      <div style={{ flex:1, overflowY:'auto', padding:'2px 20px 20px', display:'flex', flexDirection:'column', gap:12 }}>
        {loading
          ? [1,2,3].map(i => <SkeletonCard key={i} />)
          : filtered.length === 0
            ? <EmptyState emoji="🦦" title="Nada por aquí" sub="Revisa otra pestaña, primo" />
            : filtered.map((match, i) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  stagger={i + 1}
                  prediction={predictions[match.id]}
                  onPredictionChange={p => onPredictionChange(match.id, p)}
                  predictedBy={PREDICTED_BY[match.id] || []}
                  players={PLAYERS}
                  onViewPredictions={() => setSheetMatchId(match.id)}
                />
              ))
        }
      </div>

      {sheetMatch && (
        <MatchDetailSheet match={sheetMatch} userId={userId} onClose={() => setSheetMatchId(null)} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   2. TABLA DE POSICIONES
══════════════════════════════════════ */
function TablaScreen({ userId }) {
  const { PLAYERS } = window.QData;
  const sorted = [...PLAYERS].sort((a,b) => b.points - a.points);

  const RANK_ICONS = { 1:'👑', 2:'🥈', 3:'🥉' };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'18px 20px 14px', flexShrink:0 }}>
        <h1 style={{ fontSize:23, fontWeight:800, letterSpacing:'-0.02em' }}>Tabla</h1>
        <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:3 }}>Mundial 2026 · 6 partidos jugados</p>
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
        {sorted.map((player, i) => {
          const pos   = i + 1;
          const isMe  = player.id === userId;
          const isTop = pos <= 3;

          let rowBg     = 'var(--bg-surface)';
          let rowBorder = '1px solid transparent';
          let rowShadow = 'var(--sh-card)';

          if (isMe)       { rowBg = 'var(--accent-muted)'; rowBorder = '1px solid rgba(180,240,64,0.25)'; rowShadow = 'var(--sh-accent)'; }
          else if (pos===1){ rowBg = 'var(--bg-elevated)';  rowShadow = 'var(--sh-gold)'; }
          else if (isTop) { rowBg = 'var(--bg-elevated)'; }

          return (
            <div key={player.id} className={`card fade-up s${Math.min(i+1,10)}`} style={{
              padding:'12px 14px',
              background: rowBg,
              border: rowBorder,
              boxShadow: rowShadow,
              display:'flex', alignItems:'center', gap:12,
            }}>
              {/* Position */}
              <div style={{
                width:30, flexShrink:0, textAlign:'center',
                fontFamily: isTop ? 'var(--font-ui)' : 'var(--font-score)',
                fontSize: isTop ? 22 : 18,
                fontWeight:800,
                color: pos===1 ? 'var(--gold)' : pos<=3 ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              }}>
                {RANK_ICONS[pos] || pos}
              </div>

              {/* Avatar */}
              <Avatar player={player} size={40} />

              {/* Name + badges */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                  <span style={{
                    fontWeight: isMe ? 700 : 600, fontSize:15,
                    color: isMe ? 'var(--accent)' : pos===1 ? 'var(--text-primary)' : 'var(--text-primary)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {player.name}{isMe ? ' · tú' : ''}
                  </span>
                </div>
                <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap', alignItems:'center' }}>
                  {player.streak >= 3 && (
                    <Badge variant="gold" style={{ fontSize:10 }}>👑 {player.streak} racha</Badge>
                  )}
                  {player.exactStreak >= 2 && (
                    <Badge variant="accent" style={{ fontSize:10 }}>🎯 {player.exactStreak} exactos</Badge>
                  )}
                  {player.medals.filter(m => m !== '👑').map((m,mi) => (
                    <Badge key={mi} variant="muted" style={{ fontSize:11 }}>{m}</Badge>
                  ))}
                  <span style={{ fontSize:12 }}>{player.fav}</span>
                </div>
              </div>

              {/* Points */}
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div
                  className={pos===1 ? 'gold-glow' : ''}
                  style={{
                    fontFamily:'var(--font-score)', fontSize:32, fontWeight:900, lineHeight:1,
                    color: pos===1 ? 'var(--gold)' : isMe ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                >{player.points}</div>
                <div style={{ fontSize:10, color:'var(--text-tertiary)', marginTop:1, fontWeight:600 }}>pts</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   3. RESULTADOS  ← pantalla prioritaria
══════════════════════════════════════ */
function ResultadosScreen({ userId }) {
  const { MATCHES, PLAYERS, PREDICTIONS, PHRASES, REACTIONS: defaultRx, MY_REACTIONS_DEFAULT, calcPoints } = window.QData;

  const played = MATCHES.filter(m => m.status === 'played');
  const [selId,      setSelId]      = useState(played[0]?.id || null);
  const [reactions,  setReactions]  = useState(defaultRx);
  const [myReact,    setMyReact]    = useState(MY_REACTIONS_DEFAULT);
  const [sheetTab,   setSheetTab]   = useState(null);

  const activeMatch = played.find(m => m.id === selId) || played[0];

  if (!activeMatch) return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'18px 20px 14px' }}><h1 style={{ fontSize:23, fontWeight:800 }}>Resultados</h1></div>
      <EmptyState emoji="⏰" title="Aún no termina ningún partido" sub="Vuelve cuando el árbitro pite 3 veces" />
    </div>
  );

  /* Calcular resultados del partido activo */
  const matchResults = PLAYERS
    .map(player => {
      const pred   = PREDICTIONS[player.id]?.[activeMatch.id];
      const pts    = pred != null ? calcPoints(pred, activeMatch.score) : null;
      const phrase = PHRASES[player.id]?.[played.indexOf(activeMatch) % (PHRASES[player.id]?.length || 1)] || '';
      return { player, pred, pts, phrase };
    })
    .filter(r => r.pred != null)
    .sort((a, b) => b.pts - a.pts);

  const maxPts = matchResults.length ? Math.max(...matchResults.map(r => r.pts)) : 0;
  const getTag = (result) => {
    if (result.pts === 3) return { label:'🎯 Exacto', accent:'gold' };
    if (result.pts === 0 && maxPts > 0) return { label:'🤡 Fail del día', accent:'danger' };
    return null;
  };

  /* Reactions */
  const EMOJI_SET = ['🔥','😱','🎯','😭','👑','😂','🤡','😤'];
  const matchRx   = reactions[activeMatch.id] || {};

  const handleReact = (emoji) => {
    const cur = myReact[activeMatch.id];
    const newMy = { ...myReact };
    const newRx = { ...reactions, [activeMatch.id]: { ...matchRx } };
    if (cur === emoji) {
      delete newMy[activeMatch.id];
      newRx[activeMatch.id][emoji] = Math.max(0, (newRx[activeMatch.id][emoji] || 0) - 1);
    } else {
      if (cur) newRx[activeMatch.id][cur] = Math.max(0, (newRx[activeMatch.id][cur] || 0) - 1);
      newMy[activeMatch.id] = emoji;
      newRx[activeMatch.id][emoji] = (newRx[activeMatch.id][emoji] || 0) + 1;
    }
    setMyReact(newMy);
    setReactions(newRx);
  };

  const ptColor = (pts) =>
    pts === 3 ? 'var(--pt-exact)' :
    pts === 1 ? 'var(--pt-correct)' :
    'var(--pt-miss)';

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'18px 20px 10px', flexShrink:0 }}>
        <h1 style={{ fontSize:23, fontWeight:800, letterSpacing:'-0.02em' }}>Resultados</h1>
      </div>

      {/* Match selector chips */}
      <div style={{ paddingLeft:20, paddingRight:20, paddingBottom:14, flexShrink:0, display:'flex', gap:8, overflowX:'auto' }}>
        {played.map(m => {
          const active = m.id === activeMatch.id;
          return (
            <button key={m.id} onClick={() => setSelId(m.id)} style={{
              flexShrink:0, padding:'6px 14px', borderRadius:'var(--r-full)',
              border:'none',
              background: active ? 'var(--accent)' : 'var(--bg-elevated)',
              color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
              fontFamily:'var(--font-ui)', fontSize:12, fontWeight: active ? 700 : 500,
              cursor:'pointer', whiteSpace:'nowrap',
              transition:'all var(--dur-normal)',
            }}>
              {m.home.flag} {m.home.name} {m.score?.home}–{m.score?.away} {m.away.flag} {m.away.name}
            </button>
          );
        })}
      </div>

      {/* Big Score Card */}
      <div style={{ margin:'0 20px', marginBottom:14, flexShrink:0, background:'var(--bg-surface)', borderRadius:'var(--r-lg)', padding:'16px 20px' }}>
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:20 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:44, lineHeight:1 }}>{activeMatch.home.flag}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginTop:5 }}>{activeMatch.home.name}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-score)', fontSize:60, fontWeight:900, lineHeight:1, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>
              {activeMatch.score.home}<span style={{ color:'var(--text-tertiary)', fontSize:40, margin:'0 4px' }}>:</span>{activeMatch.score.away}
            </div>
            <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:4 }}>🔒 {activeMatch.date} · FINAL · {activeMatch.phase}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:44, lineHeight:1 }}>{activeMatch.away.flag}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginTop:5 }}>{activeMatch.away.name}</div>
          </div>
        </div>
        {/* Discussion buttons */}
        <div style={{ display:'flex', gap:8, marginTop:14, justifyContent:'center' }}>
          <button onClick={() => setSheetTab('preds')} style={{
            padding:'6px 14px', borderRadius:'var(--r-full)',
            border:'1px solid var(--bg-border)',
            background:'var(--bg-elevated)', color:'var(--text-secondary)',
            fontFamily:'var(--font-ui)', fontSize:12, fontWeight:600, cursor:'pointer',
            display:'flex', alignItems:'center', gap:5, transition:'all 150ms',
          }}>📊 Pronósticos</button>
          <button onClick={() => setSheetTab('comments')} style={{
            padding:'6px 14px', borderRadius:'var(--r-full)',
            border:'1px solid rgba(180,240,64,0.25)',
            background:'var(--accent-muted)', color:'var(--accent)',
            fontFamily:'var(--font-ui)', fontSize:12, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', gap:5, transition:'all 150ms',
          }}>💬 Comentar</button>
        </div>
      </div>

      {/* Predictions list + Reactions */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 20px 20px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {matchResults.map((result, i) => {
            const isMe  = result.player.id === userId;
            const tag   = getTag(result);
            return (
              <div key={result.player.id} className={`card fade-up s${Math.min(i+1,10)}`} style={{
                padding:'11px 14px',
                border: isMe ? '1px solid rgba(180,240,64,0.25)' : '1px solid transparent',
                background: isMe ? 'var(--accent-muted)' : 'var(--bg-surface)',
                display:'flex', alignItems:'center', gap:11,
              }}>
                <Avatar player={result.player} size={38} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                    <span style={{ fontWeight:isMe?700:600, fontSize:14, color: isMe ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {result.player.name}{isMe ? ' · tú' : ''}
                    </span>
                    {tag && (
                      <span style={{
                        fontSize:11, padding:'2px 7px', borderRadius:5, fontWeight:600,
                        background: tag.accent==='gold' ? 'var(--gold-muted)' : 'var(--danger-muted)',
                        color: tag.accent==='gold' ? 'var(--gold)' : 'var(--danger)',
                      }}>{tag.label}</span>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-secondary)' }}>
                    <span style={{ fontFamily:'var(--font-score)', fontSize:15, fontWeight:700, color:'var(--text-secondary)' }}>
                      {result.pred.home}–{result.pred.away}
                    </span>
                    <span style={{ color:'var(--text-tertiary)' }}>·</span>
                    <span style={{ fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{result.phrase}</span>
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--font-score)', fontSize:30, fontWeight:900, lineHeight:1, color:ptColor(result.pts) }}>{result.pts}</div>
                  <div style={{ fontSize:10, color:'var(--text-tertiary)', fontWeight:600 }}>pts</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reactions */}
        <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--bg-border)' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Reacciones</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {EMOJI_SET.map(emoji => {
              const cnt    = reactions[activeMatch.id]?.[emoji] || 0;
              const active = myReact[activeMatch.id] === emoji;
              if (cnt === 0 && !active) return null;
              return (
                <button key={emoji} onClick={() => handleReact(emoji)}
                  className={`reaction-btn${active ? ' active' : ''}`}>
                  <span style={{ fontSize:18 }}>{emoji}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)' }}>{cnt}</span>
                </button>
              );
            })}
            {/* Add reaction */}
            {EMOJI_SET.filter(e => !((reactions[activeMatch.id]?.[e] || 0) > 0)).slice(0,3).map(emoji => (
              <button key={`add-${emoji}`} onClick={() => handleReact(emoji)}
                className="reaction-btn" style={{ opacity:.55 }}>
                <span style={{ fontSize:18 }}>{emoji}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {sheetTab && (
        <MatchDetailSheet
          match={activeMatch}
          userId={userId}
          initialTab={sheetTab}
          onClose={() => setSheetTab(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   4. PERFIL
══════════════════════════════════════ */
function PerfilScreen({ userId }) {
  const { PLAYERS, MATCHES, PREDICTIONS, calcPoints } = window.QData;
  const player = PLAYERS.find(p => p.id === userId) || PLAYERS[0];

  const played = MATCHES.filter(m => m.status === 'played');
  const history = played.map(m => {
    const pred = PREDICTIONS[player.id]?.[m.id];
    const pts  = pred != null ? calcPoints(pred, m.score) : null;
    return { match:m, pred, pts };
  }).filter(h => h.pred != null);

  const exactCount   = history.filter(h => h.pts === 3).length;
  const correctCount = history.filter(h => h.pts === 1).length;

  const ptColor = (pts) =>
    pts === 3 ? 'var(--pt-exact)' :
    pts === 1 ? 'var(--pt-correct)' :
    'var(--pt-miss)';

  const pos = [...PLAYERS].sort((a,b) => b.points - a.points).findIndex(p => p.id === player.id) + 1;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Hero */}
      <div style={{
        padding:'24px 20px 20px', flexShrink:0,
        background:'var(--bg-surface)',
        borderBottom:'1px solid var(--bg-border)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:14,
      }}>
        <div style={{ position:'relative' }}>
          <Avatar player={player} size={80} />
          {player.streak >= 3 && (
            <span className="gold-glow" style={{ position:'absolute', bottom:-4, right:-4, fontSize:22 }}>👑</span>
          )}
        </div>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.02em' }}>{player.name}</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:3 }}>
            {player.fav} · #{pos} en la quiniela
          </p>
        </div>
        {/* Stats */}
        <div style={{ display:'flex', gap:28, alignItems:'flex-end' }}>
          <StatBlock value={player.points} label="Puntos"  color="var(--gold)" />
          <StatBlock value={`${player.streak}🔥`} label="Racha" />
          <StatBlock value={exactCount}    label="Exactos" color="var(--accent)" />
          <StatBlock value={correctCount}  label="Correctos" />
        </div>
      </div>

      {/* History + Wrapped */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px 24px' }}>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12, color:'var(--text-primary)' }}>Mis pronósticos</h3>

        {history.length === 0 ? (
          <EmptyState emoji="🦦" title="Aún no tienes pronósticos" sub="Ve a Partidos y lanza tus predicciones" />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {history.map(({ match, pred, pts }, i) => (
              <div key={match.id} className={`card fade-up s${Math.min(i+1,6)}`} style={{ padding:'11px 14px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ display:'flex', gap:-4 }}>
                  <span style={{ fontSize:28 }}>{match.home.flag}</span>
                  <span style={{ fontSize:28, marginLeft:-6 }}>{match.away.flag}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>
                    {match.home.name} <span style={{ color:'var(--text-tertiary)' }}>vs</span> {match.away.name}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)', display:'flex', gap:8 }}>
                    <span>Final: <b style={{ fontFamily:'var(--font-score)', fontSize:13 }}>{match.score.home}–{match.score.away}</b></span>
                    <span style={{ color:'var(--text-tertiary)' }}>·</span>
                    <span>Pronóstico: <b style={{ fontFamily:'var(--font-score)', fontSize:13 }}>{pred.home}–{pred.away}</b></span>
                  </div>
                </div>
                <div style={{ fontFamily:'var(--font-score)', fontSize:28, fontWeight:900, color:ptColor(pts), lineHeight:1 }}>{pts}</div>
                <div style={{ fontSize:10, color:'var(--text-tertiary)', fontWeight:600, alignSelf:'flex-end', paddingBottom:1 }}>pts</div>
              </div>
            ))}
          </div>
        )}

        {/* Wrapped card */}
        <div style={{
          marginTop:24, padding:20, textAlign:'center',
          background:'linear-gradient(135deg, rgba(180,240,64,0.08) 0%, rgba(245,197,66,0.08) 100%)',
          border:'1px solid rgba(180,240,64,0.15)',
          borderRadius:'var(--r-lg)',
        }}>
          <div style={{ fontSize:32, marginBottom:8 }}>⚡</div>
          <p style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Season Wrapped 2026</p>
          <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:16 }}>Tu resumen completo del torneo</p>
          <button className="btn-primary" style={{ width:'100%' }}>Ver mi Wrapped →</button>
        </div>
      </div>
    </div>
  );
}

/* ─── EXPORTS ─── */
Object.assign(window, { PartidosScreen, TablaScreen, ResultadosScreen, PerfilScreen });
