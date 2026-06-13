import type { UsuarioTipo } from './usuario.model';

export interface AdminJugadorUpdate {
  readonly uid: string;
  readonly nombre: string;
  readonly tipo: UsuarioTipo;
}

export interface AdminPronosticoInput {
  readonly uid: string;
  readonly partidoId: string;
  readonly golesLocal: number;
  readonly golesVisitante: number;
  readonly sinDatos?: boolean;
}
