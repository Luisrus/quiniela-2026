import { calcularPuntosPronostico, type MarcadorQuiniela } from './calcular-puntos';

interface CasoPuntos {
  readonly nombre: string;
  readonly pronostico: MarcadorQuiniela;
  readonly resultado: MarcadorQuiniela;
  readonly puntos: number;
}

const casos: readonly CasoPuntos[] = [
  {
    nombre: 'marcador exacto',
    pronostico: { golesLocal: 2, golesVisitante: 1 },
    resultado: { golesLocal: 2, golesVisitante: 1 },
    puntos: 3
  },
  {
    nombre: 'acierta ganador local',
    pronostico: { golesLocal: 1, golesVisitante: 0 },
    resultado: { golesLocal: 3, golesVisitante: 1 },
    puntos: 1
  },
  {
    nombre: 'acierta ganador visitante',
    pronostico: { golesLocal: 0, golesVisitante: 2 },
    resultado: { golesLocal: 1, golesVisitante: 4 },
    puntos: 1
  },
  {
    nombre: 'acierta empate sin exacto',
    pronostico: { golesLocal: 1, golesVisitante: 1 },
    resultado: { golesLocal: 2, golesVisitante: 2 },
    puntos: 1
  },
  {
    nombre: 'falla resultado',
    pronostico: { golesLocal: 2, golesVisitante: 0 },
    resultado: { golesLocal: 0, golesVisitante: 1 },
    puntos: 0
  },
  {
    nombre: 'marcador incompleto',
    pronostico: { golesLocal: 2, golesVisitante: 1 },
    resultado: { golesLocal: null, golesVisitante: null },
    puntos: 0
  }
];

describe('calcularPuntosPronostico', () => {
  for (const caso of casos) {
    it(`devuelve ${caso.puntos} cuando ${caso.nombre}`, () => {
      expect(calcularPuntosPronostico(caso.pronostico, caso.resultado)).toBe(caso.puntos);
    });
  }
});
