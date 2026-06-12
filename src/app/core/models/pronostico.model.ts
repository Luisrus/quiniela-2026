export type PronosticoId = `${string}_${string}`;

export interface Pronostico {
  readonly id: PronosticoId;
  readonly uid: string;
  readonly partidoId: string;
  readonly golesLocal: number;
  readonly golesVisitante: number;
  readonly frase?: string;
  readonly puntosGanados: number | null;
  readonly puntosProvisionales?: number | null;
}

export interface PronosticoInput {
  readonly partidoId: string;
  readonly golesLocal: number;
  readonly golesVisitante: number;
  readonly frase?: string;
}

export function buildPronosticoId(uid: string, partidoId: string): PronosticoId {
  return `${uid}_${partidoId}` as PronosticoId;
}
