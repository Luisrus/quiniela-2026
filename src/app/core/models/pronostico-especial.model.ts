export const pronosticoEspecialTipos = [
  'campeon',
  'goleador',
  'balon_oro',
  'guante_oro',
  'octavos'
] as const;

export type PronosticoEspecialTipo = (typeof pronosticoEspecialTipos)[number];

export interface PronosticoEspecial {
  readonly uid: string;
  readonly tipo: PronosticoEspecialTipo;
  readonly valor: string;
}

export interface PremioEspecialMeta {
  readonly tipo: PronosticoEspecialTipo;
  readonly emoji: string;
  readonly titulo: string;
  readonly descripcion: string;
}

export const OCTAVOS_EQUIPOS_LIMITE = 16;

/**
 * Documento en `config/torneo` que el admin actualiza al terminar el torneo.
 * Cuando ambos campos son null, el torneo sigue en curso y no se muestran badges.
 */
export interface ConfigTorneo {
  readonly campeonReal: string | null;
  readonly goleadorReal: string | null;
  readonly balonOroReal: string | null;
  readonly guanteOroReal: string | null;
}

export const PREMIOS_ESPECIALES: readonly PremioEspecialMeta[] = [
  {
    tipo: 'campeon',
    emoji: '🏆',
    titulo: 'Campeón del mundo',
    descripcion: 'El equipo que levantará la Copa del Mundo.'
  },
  {
    tipo: 'balon_oro',
    emoji: '🥇',
    titulo: 'Balón de Oro',
    descripcion: 'Se otorga al mejor jugador del torneo.'
  },
  {
    tipo: 'goleador',
    emoji: '👟',
    titulo: 'Bota de Oro',
    descripcion: 'Se entrega al máximo goleador de la competición.'
  },
  {
    tipo: 'guante_oro',
    emoji: '🧤',
    titulo: 'Guante de Oro',
    descripcion: 'Reconoce al mejor portero del torneo.'
  }
];

export const PREMIOS_ESPECIALES_TIPOS: readonly PronosticoEspecialTipo[] = PREMIOS_ESPECIALES.map(
  (premio) => premio.tipo
);

export function buildPronosticoEspecialId(uid: string, tipo: PronosticoEspecialTipo): string {
  return `${uid}_${tipo}`;
}

export function isPronosticoEspecialTipo(value: string): value is PronosticoEspecialTipo {
  return (pronosticoEspecialTipos as readonly string[]).includes(value);
}

export function parseOctavosValor(valor: string): readonly string[] {
  if (!valor.trim()) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(valor);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

export function serializeOctavosEquipos(equipos: readonly string[]): string {
  return JSON.stringify([...equipos]);
}

export function valorMaxLengthForTipo(tipo: PronosticoEspecialTipo): number {
  return tipo === 'octavos' ? 500 : 100;
}
