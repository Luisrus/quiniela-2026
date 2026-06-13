import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  orderBy,
  query,
  serverTimestamp,
  where,
  type CollectionReference,
  type DocumentReference,
  type FieldValue
} from '@angular/fire/firestore';
import { shareReplay, type Observable } from 'rxjs';

import type { Comentario, ComentarioInput } from '../models/comentario.model';
import { AuthService } from './auth.service';
import { FirestoreErrorService } from './firestore-error.service';

interface StoredComentario {
  readonly id?: string;
  readonly uid: string;
  readonly partidoId: string;
  readonly texto: string;
  readonly creadoEn: Comentario['creadoEn'];
}

interface CreateComentario {
  readonly uid: string;
  readonly partidoId: string;
  readonly texto: string;
  readonly creadoEn: FieldValue;
}

interface StoredComentarioWithId extends StoredComentario {
  readonly id: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComentariosService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly errors = inject(FirestoreErrorService);
  private readonly comentariosCollection = collection(
    this.firestore,
    'comentarios'
  ) as CollectionReference<StoredComentario>;
  private readonly comentariosPorPartidoCache = new Map<string, Observable<readonly Comentario[]>>();

  comentariosPorPartido$(partidoId: string): Observable<readonly Comentario[]> {
    const cached = this.comentariosPorPartidoCache.get(partidoId);

    if (cached !== undefined) {
      return cached;
    }

    const comentariosQuery = query(
      this.comentariosCollection,
      where('partidoId', '==', partidoId),
      orderBy('creadoEn', 'asc')
    );

    const stream$ = this.errors.handleStream(
      collectionData(comentariosQuery, { idField: 'id' }) as Observable<readonly Comentario[]>,
      [] as readonly Comentario[],
      'No se pudieron cargar los comentarios del partido. Silencio incómodo.'
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.comentariosPorPartidoCache.set(partidoId, stream$);
    return stream$;
  }

  async crearComentario(input: ComentarioInput): Promise<string> {
    const uid = this.requireUid();
    const texto = input.texto.trim();

    if (texto.length === 0 || texto.length > 120) {
      return '';
    }

    const data: CreateComentario = {
      uid,
      partidoId: input.partidoId,
      texto,
      creadoEn: serverTimestamp()
    };
    try {
      const created = await addDoc(collection(this.firestore, 'comentarios'), data);

      return created.id;
    } catch (error: unknown) {
      this.errors.report('No se pudo mandar el comentario. Se fue a saque de banda.', error);
      return '';
    }
  }

  async borrarComentario(id: string): Promise<void> {
    try {
      await deleteDoc(this.comentarioRef(id));
    } catch (error: unknown) {
      this.errors.report('No se pudo borrar el comentario. Ya lo vio la tribuna.', error);
    }
  }

  private comentarioRef(id: string): DocumentReference<StoredComentarioWithId> {
    return doc(this.firestore, 'comentarios', id) as DocumentReference<StoredComentarioWithId>;
  }

  private requireUid(): string {
    const profile = this.auth.userProfile();

    if (profile === undefined || profile === null) {
      throw new Error('Usuario no autenticado.');
    }

    return profile.uid;
  }
}
