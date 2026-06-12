export const usuarioTipos = ['titular', 'invitado'] as const;

export type UsuarioTipo = (typeof usuarioTipos)[number];

export interface Usuario {
  readonly uid: string;
  readonly nombre: string;
  readonly fotoUrl: string | null;
  readonly tipo?: UsuarioTipo;
  readonly equipoFavorito?: string | null;
  readonly puntos: number;
  readonly puntosProvisionales?: number;
  readonly historialPuntos?: readonly { jornadaKey: string; puntos: number }[];
  readonly badges: readonly string[];
  readonly rachaAciertos?: number;
  readonly rachaAciertosMaxima?: number;
  readonly rachaExactos?: number;
  readonly rachaExactosMaxima?: number;
  readonly fcmToken?: string | null;
  readonly esAdmin?: boolean;
}

export interface UsuarioProfileUpdate {
  readonly nombre: string;
  readonly fotoUrl: string | null;
}
