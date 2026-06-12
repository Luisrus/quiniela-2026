/**
 * Puntuación base de la quiniela:
 * - 3 puntos: marcador exacto
 * - 1 punto: acierta ganador o empate sin marcador exacto
 * - 0 puntos: falla ambos
 */
export interface MarcadorQuiniela {
  readonly golesLocal: number | null;
  readonly golesVisitante: number | null;
}

type ResultadoPartido = 'local' | 'visitante' | 'empate';

export function calcularPuntosPronostico(
  pronostico: MarcadorQuiniela,
  resultado: MarcadorQuiniela
): number {
  if (
    !isMarcadorCompleto(pronostico) ||
    !isMarcadorCompleto(resultado)
  ) {
    return 0;
  }

  if (
    pronostico.golesLocal === resultado.golesLocal &&
    pronostico.golesVisitante === resultado.golesVisitante
  ) {
    return 3;
  }

  return ganador(pronostico.golesLocal, pronostico.golesVisitante) ===
    ganador(resultado.golesLocal, resultado.golesVisitante)
    ? 1
    : 0;
}

function isMarcadorCompleto(
  marcador: MarcadorQuiniela
): marcador is { readonly golesLocal: number; readonly golesVisitante: number } {
  return Number.isFinite(marcador.golesLocal) && Number.isFinite(marcador.golesVisitante);
}

function ganador(local: number, visitante: number): ResultadoPartido {
  if (local > visitante) {
    return 'local';
  }

  if (local < visitante) {
    return 'visitante';
  }

  return 'empate';
}
