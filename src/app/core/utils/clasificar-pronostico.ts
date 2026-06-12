export type ClasificacionPronostico = 'exacto' | 'fail' | 'correcto' | 'fallo';

export interface MarcadorSimple {
  readonly golesLocal: number;
  readonly golesVisitante: number;
}

/**
 * Clasifica un pronóstico comparándolo con el resultado real.
 *
 * - 'exacto' : marcador idéntico al real (3 pts)
 * - 'fail'   : suma de diferencias absolutas >= 3 (0 pts, gran error)
 * - 'correcto': acertó el resultado ganador/empate pero no el marcador (1 pt)
 * - 'fallo'  : resultado incorrecto, diferencia < 3
 *
 * No retorna puntos — eso es exclusivo del backend. Solo clasifica para UI.
 */
export function clasificarPronostico(
  pred: MarcadorSimple,
  real: MarcadorSimple
): ClasificacionPronostico {
  if (pred.golesLocal === real.golesLocal && pred.golesVisitante === real.golesVisitante) {
    return 'exacto';
  }

  const diff =
    Math.abs(pred.golesLocal - real.golesLocal) +
    Math.abs(pred.golesVisitante - real.golesVisitante);

  if (diff >= 3) {
    return 'fail';
  }

  if (ganador(pred.golesLocal, pred.golesVisitante) === ganador(real.golesLocal, real.golesVisitante)) {
    return 'correcto';
  }

  return 'fallo';
}

type Resultado = 'local' | 'visitante' | 'empate';

function ganador(local: number, visitante: number): Resultado {
  if (local > visitante) {
    return 'local';
  }

  if (local < visitante) {
    return 'visitante';
  }

  return 'empate';
}
