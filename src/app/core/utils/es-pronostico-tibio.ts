export interface MarcadorPronostico {
  readonly golesLocal: number;
  readonly golesVisitante: number;
}

/** Suma de goles máxima para considerar un pronóstico "tibio". */
export const TIBIO_SUMA_GOLES_MAX = 3;

/** Diferencia de goles máxima para considerar un pronóstico "tibio". */
export const TIBIO_DIFERENCIA_MAX = 1;

/**
 * Pronóstico tibio: marcadores conservadores tipo 0-0, 1-0, 1-1, 2-1, 2-2, etc.
 */
export function esPronosticoTibio(pronostico: MarcadorPronostico): boolean {
  const suma = pronostico.golesLocal + pronostico.golesVisitante;
  const diferencia = Math.abs(pronostico.golesLocal - pronostico.golesVisitante);

  return suma <= TIBIO_SUMA_GOLES_MAX && diferencia <= TIBIO_DIFERENCIA_MAX;
}
