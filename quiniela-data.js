/* ════════════════════════════════════════
   QUINIELA RUSTRIAN — Mock Data
   Estructura lista para reemplazar con
   signals/observables de Firestore
════════════════════════════════════════ */

window.QData = (function () {

  /* ─── JUGADORES ─── */
  const PLAYERS = [
    { id:'guero',    name:'El Güero',  initials:'GÜ', hue:142, points:47, streak:5, exactStreak:3, medals:['🏆'], fav:'🇲🇽', position:1 },
    { id:'beto',     name:'Tío Beto',  initials:'TB', hue:217, points:43, streak:3, exactStreak:2, medals:['🥇'], fav:'🇦🇷', position:2 },
    { id:'rodrigo',  name:'El Profe',  initials:'RP', hue:271, points:38, streak:2, exactStreak:1, medals:['🥈'], fav:'🇧🇷', position:3 },
    { id:'ana',      name:'Ana',       initials:'AN', hue: 25, points:35, streak:2, exactStreak:1, medals:[],     fav:'🇪🇸', position:4 },
    { id:'memo',     name:'Memo',      initials:'MM', hue:190, points:31, streak:1, exactStreak:0, medals:[],     fav:'🇫🇷', position:5 },
    { id:'juan',     name:'Juan',      initials:'JU', hue: 82, points:28, streak:2, exactStreak:1, medals:[],     fav:'🇲🇽', position:6, isMe:true },
    { id:'pao',      name:'Pao',       initials:'PA', hue:320, points:24, streak:1, exactStreak:0, medals:[],     fav:'🇺🇸', position:7 },
    { id:'lupe',     name:'Lupe',      initials:'LU', hue: 52, points:22, streak:0, exactStreak:0, medals:[],     fav:'🇲🇽', position:8 },
    { id:'fer',      name:'Fer',       initials:'FE', hue:163, points:18, streak:1, exactStreak:0, medals:[],     fav:'🇩🇪', position:9 },
    { id:'dieguito', name:'Dieguito',  initials:'DJ', hue: 34, points:12, streak:0, exactStreak:0, medals:[],     fav:'🇦🇷', position:10 },
  ];

  /* ─── PARTIDOS ─── */
  const MATCHES = [
    // EN VIVO
    { id:'m1', home:{name:'México',    flag:'🇲🇽'}, away:{name:'Argentina', flag:'🇦🇷'}, status:'live',     minute:67, score:{home:1,away:1}, phase:'Grupo C', date:'Hoy · 18:00', venue:'SoFi Stadium, Los Ángeles' },
    { id:'m2', home:{name:'Brasil',    flag:'🇧🇷'}, away:{name:'Alemania',  flag:'🇩🇪'}, status:'live',     minute:31, score:{home:0,away:0}, phase:'Grupo E', date:'Hoy · 21:00', venue:'Estadio Azteca, CDMX' },
    // PRÓXIMOS
    { id:'m3', home:{name:'España',    flag:'🇪🇸'}, away:{name:'Francia',   flag:'🇫🇷'}, status:'upcoming', minute:null, score:null, phase:'Grupo D', date:'Mañana · 18:00', venue:'MetLife Stadium, NY' },
    { id:'m4', home:{name:'USA',       flag:'🇺🇸'}, away:{name:'Inglaterra',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}, status:'upcoming', minute:null, score:null, phase:'Grupo A', date:'Mañana · 21:00', venue:'AT&T Stadium, Dallas' },
    { id:'m5', home:{name:'Portugal',  flag:'🇵🇹'}, away:{name:'Marruecos', flag:'🇲🇦'}, status:'upcoming', minute:null, score:null, phase:'Grupo F', date:'Jun 14 · 15:00', venue:"Levi's Stadium, SF" },
    // JUGADOS
    { id:'m6', home:{name:'Uruguay',   flag:'🇺🇾'}, away:{name:'Corea Sur', flag:'🇰🇷'}, status:'played', minute:null, score:{home:2,away:0}, phase:'Grupo B', date:'Ayer', venue:'BMO Field, Toronto' },
    { id:'m7', home:{name:'Francia',   flag:'🇫🇷'}, away:{name:'Bélgica',   flag:'🇧🇪'}, status:'played', minute:null, score:{home:3,away:1}, phase:'Grupo D', date:'Ayer', venue:'Gillette Stadium, Boston' },
  ];

  /* ─── QUIÉN YA PRONOSTICÓ ─── */
  const PREDICTED_BY = {
    m1: ['guero','beto','rodrigo','ana','juan','pao'],
    m2: ['guero','beto','ana','memo'],
    m6: ['guero','beto','rodrigo','ana','memo','juan','pao','lupe','fer','dieguito'],
    m7: ['guero','beto','rodrigo','ana','memo','juan','pao','lupe','fer','dieguito'],
  };

  /* ─── PRONÓSTICOS (por jugador, por partido) ─── */
  const PREDICTIONS = {
    juan:    { m1:{home:2,away:1}, m6:{home:2,away:0}, m7:{home:2,away:2} },
    guero:   { m1:{home:1,away:2}, m6:{home:2,away:0}, m7:{home:3,away:1} },
    beto:    { m1:{home:0,away:1}, m6:{home:1,away:0}, m7:{home:2,away:1} },
    rodrigo: { m1:{home:2,away:2}, m6:{home:3,away:1}, m7:{home:2,away:0} },
    ana:     { m1:{home:1,away:1}, m6:{home:1,away:1}, m7:{home:4,away:1} },
    memo:    { m1:{home:2,away:0}, m6:{home:0,away:1}, m7:{home:2,away:1} },
    pao:     {                     m6:{home:2,away:1}, m7:{home:1,away:0} },
    lupe:    {                     m6:{home:1,away:0}, m7:{home:2,away:1} },
    fer:     {                     m6:{home:2,away:0}, m7:{home:3,away:2} },
    dieguito:{                     m6:{home:0,away:0}, m7:{home:1,away:1} },
  };

  /* ─── FRASES ─── */
  const PHRASES = {
    juan:    ['Siempre con México 🇲🇽', 'Confié en el VAR', 'Era penalti, juro'],
    guero:   ['Datos puros 📊', 'Leí la quiniela, no el fútbol', 'Ya sé más que el DT'],
    beto:    ['Con los años viene la sabiduría', 'Sin presión, sin prisa', 'El fútbol es lo mío'],
    rodrigo: ['Enseño mates, no magia', 'Probabilidad pura', 'El profe siempre tiene razón'],
    ana:     ['Me lo dijo el horóscopo ♓', 'Corazonada top tier', 'Vibras correctas 🌙'],
    memo:    ['Lo del empate fue trampa', 'Mala fe del portero', 'Siguiente vez sí'],
    pao:     ['No entiendo pero apunto', 'Suerte aleatoria', 'Un día de estos'],
    lupe:    ['Apoyo al corazón 💚', 'Hay más partidos', 'La fe mueve montañas'],
    fer:     ['Datos de Bundesliga aplican globalmente', 'Wissenschaft ⚗️', 'Portero incorrecto'],
    dieguito:['Primer Mundial que sigo', 'Aprendiendo', 'Igual fue bueno verlo'],
  };

  /* ─── REACCIONES ─── */
  const REACTIONS = {
    m6: { '🔥':7, '😱':3, '🎯':5, '😭':2, '👑':4 },
    m7: { '🔥':9, '😂':6, '🎯':4, '😤':3, '🤡':2 },
  };

  const MY_REACTIONS_DEFAULT = { m6:'🔥', m7:'🎯' };

  /* ─── COMENTARIOS POR PARTIDO ─── */
  const now = Date.now();
  const COMMENTS = {
    m1: [
      { id:'c01', playerId:'guero',    text:'México tiene que meter el segundo, necesitan los 3 puntos 🔥', ts: now - 480000 },
      { id:'c02', playerId:'ana',      text:'El gol fue hermoso pero no me fío... puede regresar Argentina 😬', ts: now - 300000 },
      { id:'c03', playerId:'beto',     text:'Alguien dijo VAR? 👀 Hubo un agarre en el área', ts: now - 90000 },
    ],
    m2: [
      { id:'c04', playerId:'memo',     text:'Brasil sin ideas primer tiempo, esto pinta empate 😴', ts: now - 600000 },
      { id:'c05', playerId:'fer',      text:'Alemania en bloque bajo, esto es táctico. Vienen los 3 puntos', ts: now - 180000 },
    ],
    m6: [
      { id:'c06', playerId:'guero',    text:'Eso fue demasiado fácil, Uruguay sin rival 💀', ts: now - 86400000 },
      { id:'c07', playerId:'memo',     text:'Corea no llegó ni al área... tremendo fallo mío en el pronóstico 💸', ts: now - 84000000 },
      { id:'c08', playerId:'rodrigo',  text:'Estadísticamente era el resultado más probable. Les dije 😌', ts: now - 82000000 },
      { id:'c09', playerId:'dieguito', text:'Oigan... ¿eso del segundo gol no era offside?', ts: now - 79200000 },
    ],
    m7: [
      { id:'c10', playerId:'guero',    text:'3-1 exacto 🎯🎯🎯 Lean mis pronósticos la próxima vez primos', ts: now - 86400000 },
      { id:'c11', playerId:'lupe',     text:'Mbappé imparable como siempre 🇫🇷❤️', ts: now - 83000000 },
      { id:'c12', playerId:'juan',     text:'El Güero: 1 / todos los demás: 0. Toca pagar 😭', ts: now - 80000000 },
    ],
  };

  /* ─── REACCIONES POR PRONÓSTICO (matchId > playerId > emoji > count) ─── */
  const PRED_REACTIONS = {
    m6: {
      guero:    { '🔥':3, '🎯':2 },
      juan:     { '🎯':4, '💪':1 },
      memo:     { '🤡':3, '😂':2 },
      rodrigo:  { '🔥':1 },
      dieguito: { '🤡':5, '😭':3 },
    },
    m7: {
      guero:    { '🔥':5, '🎯':4, '👑':3 },
      beto:     { '💪':2 },
      ana:      { '🎯':1 },
      dieguito: { '🤡':4, '😭':2 },
    },
  };

  /* ─── CALC PUNTOS ─── */
  function calcPoints(pred, actual) {
    if (!pred || !actual) return null;
    if (pred.home === actual.home && pred.away === actual.away) return 3;
    const pw = pred.home > pred.away ? 'H' : pred.home < pred.away ? 'A' : 'D';
    const aw = actual.home > actual.away ? 'H' : actual.home < actual.away ? 'A' : 'D';
    return pw === aw ? 1 : 0;
  }

  return { PLAYERS, MATCHES, PREDICTED_BY, PREDICTIONS, PHRASES, REACTIONS, MY_REACTIONS_DEFAULT, COMMENTS, PRED_REACTIONS, calcPoints };
})();
