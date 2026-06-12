import type { PartidoEstado } from '../models/partido.model';

/** Minutos antes del pitido en que se cierra el pronóstico. */
export const PRONOSTICO_CIERRE_MINUTOS = 5;

export const PRONOSTICO_CIERRE_MS = PRONOSTICO_CIERRE_MINUTOS * 60 * 1000;

export const PRONOSTICO_CIERRE_AVISO =
  `Tienes hasta ${PRONOSTICO_CIERRE_MINUTOS} minutos antes del pitido para guardar tu pronóstico.`;

interface TimestampLike {
  readonly toMillis?: () => number;
  readonly toDate?: () => Date;
  readonly seconds?: number;
}

export function fechaInicioToMillis(fechaInicio: unknown): number | null {
  if (fechaInicio === null || fechaInicio === undefined) {
    return null;
  }

  if (fechaInicio instanceof Date) {
    return fechaInicio.getTime();
  }

  if (typeof fechaInicio !== 'object') {
    return null;
  }

  const candidate = fechaInicio as TimestampLike;

  if (typeof candidate.toMillis === 'function') {
    return candidate.toMillis();
  }

  if (typeof candidate.toDate === 'function') {
    return candidate.toDate().getTime();
  }

  if (typeof candidate.seconds === 'number') {
    return candidate.seconds * 1000;
  }

  return null;
}

export function partidoPronosticoAbierto(
  fechaInicio: unknown,
  estado: PartidoEstado | null | undefined = 'programado'
): boolean {
  if (estado !== null && estado !== undefined && estado !== 'programado') {
    return false;
  }

  const inicioMs = fechaInicioToMillis(fechaInicio);

  if (inicioMs === null) {
    return false;
  }

  return Date.now() < inicioMs - PRONOSTICO_CIERRE_MS;
}

export function msHastaCierrePronostico(fechaInicio: unknown): number | null {
  const inicioMs = fechaInicioToMillis(fechaInicio);

  if (inicioMs === null) {
    return null;
  }

  return inicioMs - PRONOSTICO_CIERRE_MS - Date.now();
}
