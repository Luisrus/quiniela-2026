import type { ReaccionTargetTipo } from '../../core/models/reaccion.model';

export type UiMatchStatus = 'live' | 'played' | 'upcoming';
export type UiScoreValue = number | '';
export type UiSheetTab = 'preds' | 'comments';

export interface UiPlayer {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly hue: number;
  readonly points: number;
  readonly badges: readonly string[];
  readonly streak: number;
  readonly exactStreak: number;
  readonly medals: readonly string[];
  readonly fav: string;
  readonly position: number;
  readonly photoUrl: string | null;
  readonly esTitular: boolean;
}

export interface UiTeam {
  readonly name: string;
  /** URL del escudo/bandera (football-data.org o fallback). */
  readonly flag: string;
}

export interface UiMatchScore {
  readonly home: number;
  readonly away: number;
}

export interface UiMatch {
  readonly id: string;
  readonly home: UiTeam;
  readonly away: UiTeam;
  readonly status: UiMatchStatus;
  readonly minute: number | null;
  readonly score: UiMatchScore | null;
  readonly phase: string;
  readonly date: string;
  readonly venue: string;
}

export interface UiPrediction {
  readonly home: UiScoreValue;
  readonly away: UiScoreValue;
}

export interface UiPredictionResult {
  readonly player: UiPlayer;
  readonly pred: UiPrediction;
  readonly pts: number | null;
  readonly phrase: string;
  readonly targetTipo?: ReaccionTargetTipo;
  readonly targetId?: string;
}

export interface UiReactionCount {
  readonly emoji: string;
  readonly count: number;
  readonly active: boolean;
}

export interface UiComment {
  readonly id: string;
  readonly playerId: string;
  readonly text: string;
  readonly ts: number;
}

export interface UiFeedItem {
  readonly result: UiPredictionResult;
  readonly match: UiMatch;
}
