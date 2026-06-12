export interface RachasUsuario {
  readonly rachaAciertos: number;
  readonly rachaAciertosMaxima: number;
  readonly rachaExactos: number;
  readonly rachaExactosMaxima: number;
}

export const RACHAS_INICIALES: RachasUsuario = {
  rachaAciertos: 0,
  rachaAciertosMaxima: 0,
  rachaExactos: 0,
  rachaExactosMaxima: 0
};

export function rachasFromUsuario(data: Partial<RachasUsuario> | undefined): RachasUsuario {
  return {
    rachaAciertos: numberOrZero(data?.rachaAciertos),
    rachaAciertosMaxima: numberOrZero(data?.rachaAciertosMaxima),
    rachaExactos: numberOrZero(data?.rachaExactos),
    rachaExactosMaxima: numberOrZero(data?.rachaExactosMaxima)
  };
}

/**
 * Actualiza rachas tras cerrar un partido en el que el usuario tenía pronóstico.
 * - rachaAciertos: +1 si puntos >= 1, se rompe en 0
 * - rachaExactos: +1 solo con 3 pts, se rompe con 0 o 1 pt
 */
export function actualizarRachas(actual: RachasUsuario, puntosPartido: number): RachasUsuario {
  const rachaAciertos = puntosPartido >= 1 ? actual.rachaAciertos + 1 : 0;
  const rachaExactos = puntosPartido === 3
    ? actual.rachaExactos + 1
    : puntosPartido <= 1
      ? 0
      : actual.rachaExactos;

  return {
    rachaAciertos,
    rachaAciertosMaxima: Math.max(actual.rachaAciertosMaxima, rachaAciertos),
    rachaExactos,
    rachaExactosMaxima: Math.max(actual.rachaExactosMaxima, rachaExactos)
  };
}

function numberOrZero(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
