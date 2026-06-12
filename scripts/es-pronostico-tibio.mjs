export const TIBIO_SUMA_GOLES_MAX = 3;
export const TIBIO_DIFERENCIA_MAX = 1;

export function esPronosticoTibio(pronostico) {
  const suma = pronostico.golesLocal + pronostico.golesVisitante;
  const diferencia = Math.abs(pronostico.golesLocal - pronostico.golesVisitante);

  return suma <= TIBIO_SUMA_GOLES_MAX && diferencia <= TIBIO_DIFERENCIA_MAX;
}
