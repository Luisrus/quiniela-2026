import type { Timestamp } from 'firebase/firestore';

export interface Comentario {
  readonly id: string;
  readonly uid: string;
  readonly partidoId: string;
  readonly texto: string;
  readonly creadoEn: Timestamp;
}

export interface ComentarioInput {
  readonly partidoId: string;
  readonly texto: string;
}
