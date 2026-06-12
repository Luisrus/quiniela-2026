import type { UsuarioTipo } from '../models/usuario.model';

export function esTitular(tipo: UsuarioTipo | undefined): boolean {
  return tipo !== 'invitado';
}
