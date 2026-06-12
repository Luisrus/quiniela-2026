import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  query,
  setDoc,
  where,
  type CollectionReference,
  type DocumentReference,
  type Query as FirestoreQuery
} from '@angular/fire/firestore';
import { map, type Observable } from 'rxjs';

import {
  buildReaccionId,
  type Reaccion,
  type ReaccionId,
  type ReaccionInput,
  type ReaccionTargetTipo
} from '../models/reaccion.model';
import { AuthService } from './auth.service';
import { FirestoreErrorService } from './firestore-error.service';

interface StoredReaccion {
  readonly id?: string;
  readonly uid: string;
  readonly targetTipo: ReaccionTargetTipo;
  readonly targetId: string;
  readonly emoji: string;
}

interface StoredReaccionWithId extends StoredReaccion {
  readonly id: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReaccionesService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly errors = inject(FirestoreErrorService);
  private readonly reaccionesCollection = collection(
    this.firestore,
    'reacciones'
  ) as CollectionReference<StoredReaccion>;

  reacciones$(): Observable<readonly Reaccion[]> {
    return this.listenReacciones(this.reaccionesCollection);
  }

  reaccionesPorTarget$(
    targetTipo: ReaccionTargetTipo,
    targetId: string
  ): Observable<readonly Reaccion[]> {
    const reaccionesQuery = query(
      this.reaccionesCollection,
      where('targetTipo', '==', targetTipo),
      where('targetId', '==', targetId)
    );

    return this.listenReacciones(reaccionesQuery);
  }

  reaccionesPorUsuario$(uid: string): Observable<readonly Reaccion[]> {
    const reaccionesQuery = query(
      this.reaccionesCollection,
      where('uid', '==', uid)
    );

    return this.listenReacciones(reaccionesQuery);
  }

  miReaccion$(
    targetTipo: ReaccionTargetTipo,
    targetId: string
  ): Observable<Reaccion | undefined> {
    const uid = this.requireUid();

    return this.errors.handleStream(
      docData(this.reaccionRef(uid, targetTipo, targetId), { idField: 'id' }).pipe(
        map((value) => value ? this.toReaccion(value as StoredReaccionWithId) : undefined)
      ),
      undefined,
      'No se pudo cargar tu reacción. Se quedó en la tribuna.'
    );
  }

  async crearMiReaccion(input: ReaccionInput): Promise<void> {
    const uid = this.requireUid();
    const data: StoredReaccion = {
      uid,
      targetTipo: input.targetTipo,
      targetId: input.targetId,
      emoji: input.emoji
    };

    try {
      await setDoc(this.reaccionRef(uid, input.targetTipo, input.targetId), data);
    } catch (error: unknown) {
      this.errors.report('No se pudo guardar la reacción. El estadio no hizo ruido.', error);
    }
  }

  async borrarMiReaccion(
    targetTipo: ReaccionTargetTipo,
    targetId: string
  ): Promise<void> {
    const uid = this.requireUid();
    try {
      await deleteDoc(this.reaccionRef(uid, targetTipo, targetId));
    } catch (error: unknown) {
      this.errors.report('No se pudo borrar la reacción. El grito se quedó pegado.', error);
    }
  }

  private listenReacciones(
    source: FirestoreQuery<StoredReaccion>
  ): Observable<readonly Reaccion[]> {
    return this.errors.handleStream(
      (collectionData(source, { idField: 'id' }) as Observable<readonly StoredReaccionWithId[]>)
        .pipe(map((items) => items.map((item) => this.toReaccion(item)))),
      [] as readonly Reaccion[],
      'No se pudieron cargar las reacciones. La ola se quedó sentada.'
    );
  }

  private reaccionRef(
    uid: string,
    targetTipo: ReaccionTargetTipo,
    targetId: string
  ): DocumentReference<StoredReaccion> {
    const id = buildReaccionId(uid, targetTipo, targetId);
    return doc(this.firestore, 'reacciones', id) as DocumentReference<StoredReaccion>;
  }

  private toReaccion(value: StoredReaccionWithId): Reaccion {
    return {
      id: value.id as ReaccionId,
      uid: value.uid,
      targetTipo: value.targetTipo,
      targetId: value.targetId,
      emoji: value.emoji
    };
  }

  private requireUid(): string {
    const profile = this.auth.userProfile();

    if (profile === undefined || profile === null) {
      throw new Error('Usuario no autenticado.');
    }

    return profile.uid;
  }
}
