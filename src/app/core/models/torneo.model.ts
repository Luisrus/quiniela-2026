import type { PartidoFase } from './partido.model';

export interface Torneo {
  readonly id: string;
  readonly nombre: string;
  readonly faseInicio: PartidoFase;
  readonly estado: 'abierto' | 'cerrado';
  readonly participantes: readonly string[]; // uids
}
