export const apuestaDiaResultados = ['esperando_aceptacion', 'rechazada', 'pendiente', 'ganada', 'perdida', 'empatada'] as const;

export type ApuestaDiaResultado = (typeof apuestaDiaResultados)[number];

export interface ApuestaDia {
  /** `${retadorUid}_${jornadaKey}` */
  readonly id: string;
  /** Clave de jornada, p.ej. "J1", "J2", "J3". Solo grupos. */
  readonly jornadaKey: string;
  /** UID del usuario que hizo la apuesta. */
  readonly retador: string;
  /** UID del usuario al que le apuesta. */
  readonly retado: string;
  /** Si es true, el perdedor pierde 1 punto real y el ganador lo gana. */
  readonly porUnPuntoReal: boolean;
  /** Texto de la apuesta si no es por un punto (ej: 'Una cerveza'). */
  readonly apuestaTexto?: string;
  /** Estado de la apuesta. El script lo resuelve al cerrar la jornada. */
  readonly resultado: ApuestaDiaResultado;
}

export function buildApuestaDiaId(retadorUid: string, jornadaKey: string): string {
  return `${retadorUid}_${jornadaKey}`;
}
