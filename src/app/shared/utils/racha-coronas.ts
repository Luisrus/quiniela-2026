export type CoronasCantidad = 0 | 1 | 2 | 3;

/** 1 corona desde 2 aciertos, 2 desde 4, 3 desde 6. */
export function coronasPorRacha(racha: number): CoronasCantidad {
  if (racha < 2) {
    return 0;
  }

  if (racha < 4) {
    return 1;
  }

  if (racha < 6) {
    return 2;
  }

  return 3;
}
