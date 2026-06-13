import type { PartidoFase } from '../models/partido.model';

/** Fases eliminatorias visibles en Jugados una vez iniciados octavos. */
export const FASES_DESDE_OCTAVOS: readonly PartidoFase[] = [
  'octavos',
  'cuartos',
  'semifinales',
  'tercer_lugar',
  'final'
];

export function esFaseDesdeOctavos(fase: PartidoFase): boolean {
  return FASES_DESDE_OCTAVOS.includes(fase);
}
