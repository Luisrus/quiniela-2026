export const RACHAS_INICIALES = {
  rachaAciertos: 0,
  rachaAciertosMaxima: 0,
  rachaExactos: 0,
  rachaExactosMaxima: 0
};

export function rachasFromUsuario(data) {
  return {
    rachaAciertos: numberOrZero(data?.rachaAciertos),
    rachaAciertosMaxima: numberOrZero(data?.rachaAciertosMaxima),
    rachaExactos: numberOrZero(data?.rachaExactos),
    rachaExactosMaxima: numberOrZero(data?.rachaExactosMaxima)
  };
}

export function actualizarRachas(actual, puntosPartido) {
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

function numberOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
