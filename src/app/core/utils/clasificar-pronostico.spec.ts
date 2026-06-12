import {
  clasificarPronostico,
  type ClasificacionPronostico,
  type MarcadorSimple
} from './clasificar-pronostico';

interface CasoClasificacion {
  readonly nombre: string;
  readonly pred: MarcadorSimple;
  readonly real: MarcadorSimple;
  readonly esperado: ClasificacionPronostico;
}

const casos: readonly CasoClasificacion[] = [
  {
    nombre: 'marcador exacto → exacto',
    pred: { golesLocal: 2, golesVisitante: 1 },
    real: { golesLocal: 2, golesVisitante: 1 },
    esperado: 'exacto'
  },
  {
    nombre: 'exacto 0-0 → exacto',
    pred: { golesLocal: 0, golesVisitante: 0 },
    real: { golesLocal: 0, golesVisitante: 0 },
    esperado: 'exacto'
  },
  {
    nombre: 'diff=3 → fail',
    pred: { golesLocal: 0, golesVisitante: 0 },
    real: { golesLocal: 2, golesVisitante: 1 },
    esperado: 'fail'
  },
  {
    nombre: 'diff=4 → fail',
    pred: { golesLocal: 0, golesVisitante: 0 },
    real: { golesLocal: 3, golesVisitante: 1 },
    esperado: 'fail'
  },
  {
    nombre: 'diff=3 un lado → fail',
    pred: { golesLocal: 0, golesVisitante: 0 },
    real: { golesLocal: 3, golesVisitante: 0 },
    esperado: 'fail'
  },
  {
    nombre: 'acertó local, marcador diferente, diff<3 → correcto',
    pred: { golesLocal: 1, golesVisitante: 0 },
    real: { golesLocal: 3, golesVisitante: 1 },
    esperado: 'correcto'
  },
  {
    nombre: 'acertó empate, marcador diferente, diff<3 → correcto',
    pred: { golesLocal: 1, golesVisitante: 1 },
    real: { golesLocal: 2, golesVisitante: 2 },
    esperado: 'correcto'
  },
  {
    nombre: 'resultado incorrecto diff=1 → fallo',
    pred: { golesLocal: 1, golesVisitante: 0 },
    real: { golesLocal: 0, golesVisitante: 1 },
    esperado: 'fallo'
  },
  {
    nombre: 'resultado incorrecto diff=2 → fallo',
    pred: { golesLocal: 2, golesVisitante: 0 },
    real: { golesLocal: 0, golesVisitante: 2 },
    esperado: 'fail'
  }
];

describe('clasificarPronostico', () => {
  for (const caso of casos) {
    it(caso.nombre, () => {
      expect(clasificarPronostico(caso.pred, caso.real)).toBe(caso.esperado);
    });
  }
});
