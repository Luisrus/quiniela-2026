import type { Timestamp } from 'firebase/firestore';

export const partidoEstados = [
  'programado',
  'en_juego',
  'finalizado'
] as const;

export type PartidoEstado = (typeof partidoEstados)[number];

export const partidoFases = [
  'grupos',
  'dieciseisavos',
  'octavos',
  'cuartos',
  'semifinales',
  'tercer_lugar',
  'final'
] as const;

export type PartidoFase = (typeof partidoFases)[number];

export interface BanderasPartido {
  readonly local: string;
  readonly visitante: string;
}

export interface Partido {
  readonly id: string;
  readonly footballDataId?: number;
  readonly equipoLocal: string;
  readonly equipoVisitante: string;
  readonly banderas: BanderasPartido;
  readonly fechaInicio: Timestamp;
  readonly estado: PartidoEstado;
  readonly golesLocal: number | null;
  readonly golesVisitante: number | null;
  readonly fase: PartidoFase;
  readonly jornada?: number | string | null;
  readonly puntosCalculados?: boolean;
}
