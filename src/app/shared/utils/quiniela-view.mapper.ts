import { resolveCrestUrl } from '../../core/config/equipos-crest.config';
import type { Partido, PartidoFase } from '../../core/models/partido.model';
import type { Pronostico } from '../../core/models/pronostico.model';
import type { Reaccion, ReaccionTargetTipo } from '../../core/models/reaccion.model';
import { esTitular } from '../../core/utils/usuario-tipo.util';
import type { Usuario } from '../../core/models/usuario.model';
import type {
  UiMatch,
  UiMatchScore,
  UiPlayer,
  UiPrediction,
  UiPredictionResult,
  UiReactionCount
} from '../models/quiniela-view.model';

const emptyPrediction: UiPrediction = { home: '', away: '' };

const phaseLabels: Readonly<Record<PartidoFase, string>> = {
  grupos: 'Grupos',
  dieciseisavos: 'Dieciseisavos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semifinales: 'Semifinales',
  tercer_lugar: 'Tercer lugar',
  final: 'Final'
};

export function toUiPlayer(usuario: Usuario, position: number): UiPlayer {
  return {
    id: usuario.uid,
    name: usuario.nombre,
    initials: initialsFor(usuario.nombre),
    hue: hueFor(usuario.uid),
    points: usuario.puntos,
    badges: usuario.badges,
    streak: usuario.rachaAciertos ?? 0,
    exactStreak: usuario.rachaExactos ?? 0,
    medals: [],
    fav: resolveCrestUrl(usuario.equipoFavorito ?? ''),
    position,
    photoUrl: normalizePhotoUrl(usuario.fotoUrl),
    esTitular: esTitular(usuario.tipo)
  };
}

export function toUiMatch(partido: Partido): UiMatch {
  const score = scoreFor(partido);

  return {
    id: partido.id,
    home: {
      name: partido.equipoLocal,
      flag: resolveCrestUrl(partido.equipoLocal, partido.banderas.local)
    },
    away: {
      name: partido.equipoVisitante,
      flag: resolveCrestUrl(partido.equipoVisitante, partido.banderas.visitante)
    },
    status: partido.estado === 'en_juego' || (partido.estado === 'programado' && partido.fechaInicio.toMillis() <= Date.now())
      ? 'live'
      : partido.estado === 'finalizado'
        ? 'played'
        : 'upcoming',
    minute: null,
    score,
    phase: phaseLabels[partido.fase],
    date: formatMatchDate(partido.fechaInicio.toDate()),
    venue: ''
  };
}

export function toUiPrediction(pronostico: Pronostico | undefined): UiPrediction {
  if (pronostico === undefined) {
    return emptyPrediction;
  }

  return {
    home: pronostico.golesLocal,
    away: pronostico.golesVisitante
  };
}

export function toPredictionResult(
  pronostico: Pronostico,
  player: UiPlayer
): UiPredictionResult {
  return {
    player,
    pred: {
      home: pronostico.golesLocal,
      away: pronostico.golesVisitante
    },
    pts: pronostico.puntosGanados,
    phrase: pronostico.frase ?? '',
    targetTipo: 'pronostico',
    targetId: pronostico.id
  };
}

export function groupPredictedBy(
  pronosticos: readonly Pronostico[]
): Readonly<Record<string, readonly string[]>> {
  const grouped: Record<string, string[]> = {};

  for (const pronostico of pronosticos) {
    grouped[pronostico.partidoId] = [
      ...(grouped[pronostico.partidoId] ?? []),
      pronostico.uid
    ];
  }

  return grouped;
}

export function countReactions(
  reacciones: readonly Reaccion[],
  targetTipo: ReaccionTargetTipo,
  targetId: string,
  currentUid: string,
  emojis: readonly string[]
): readonly UiReactionCount[] {
  return emojis.map((emoji) => {
    const targetReacciones = reacciones.filter((reaccion) =>
      reaccion.targetTipo === targetTipo &&
      reaccion.targetId === targetId &&
      reaccion.emoji === emoji
    );

    return {
      emoji,
      count: targetReacciones.length,
      active: targetReacciones.some((reaccion) => reaccion.uid === currentUid)
    };
  });
}

export function currentReaction(
  reacciones: readonly Reaccion[],
  targetTipo: ReaccionTargetTipo,
  targetId: string,
  currentUid: string
): string | null {
  return reacciones.find((reaccion) =>
    reaccion.targetTipo === targetTipo &&
    reaccion.targetId === targetId &&
    reaccion.uid === currentUid
  )?.emoji ?? null;
}

export function playerMap(
  players: readonly UiPlayer[]
): ReadonlyMap<string, UiPlayer> {
  return new Map(players.map((player) => [player.id, player]));
}

function scoreFor(partido: Partido): UiMatchScore | null {
  if (partido.golesLocal === null || partido.golesVisitante === null) {
    return null;
  }

  return {
    home: partido.golesLocal,
    away: partido.golesVisitante
  };
}

function normalizePhotoUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (trimmed === undefined || trimmed === '') {
    return null;
  }

  return trimmed;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  const first = parts[0]?.charAt(0) ?? 'U';
  const second = parts.length > 1 ? parts[1]?.charAt(0) : '';

  return `${first}${second}`.toUpperCase();
}

function hueFor(value: string): number {
  let hash = 0;

  for (const char of value) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash) % 360;
}

function formatMatchDate(date: Date): string {
  return new Intl.DateTimeFormat('es-GT', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
