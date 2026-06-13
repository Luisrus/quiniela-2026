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
import { combineLatest, map, of, shareReplay, type Observable } from 'rxjs';

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
  private readonly reaccionesPorTargetCache = new Map<string, Observable<readonly Reaccion[]>>();
  private readonly reaccionesPorUsuarioCache = new Map<string, Observable<readonly Reaccion[]>>();
  private readonly reaccionesPorTargetsCache = new Map<string, Observable<readonly Reaccion[]>>();
  private readonly reaccionesPorBatchCache = new Map<string, Observable<readonly Reaccion[]>>();

  reaccionesPorTarget$(
    targetTipo: ReaccionTargetTipo,
    targetId: string
  ): Observable<readonly Reaccion[]> {
    const cacheKey = `${targetTipo}:${targetId}`;
    const cached = this.reaccionesPorTargetCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const reaccionesQuery = query(
      this.reaccionesCollection,
      where('targetTipo', '==', targetTipo),
      where('targetId', '==', targetId)
    );

    const stream$ = this.listenReacciones(reaccionesQuery);
    this.reaccionesPorTargetCache.set(cacheKey, stream$);
    return stream$;
  }

  reaccionesPorTargets$(
    targetTipo: ReaccionTargetTipo,
    targetIds: readonly string[]
  ): Observable<readonly Reaccion[]> {
    const ids = uniqueStrings(targetIds);

    if (ids.length === 0) {
      return of([] as readonly Reaccion[]);
    }

    const cacheKey = `${targetTipo}:${ids.join('|')}`;
    const cached = this.reaccionesPorTargetsCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const batches = chunkArray(ids, 10);
    const batchStreams = batches.map((batch) => {
      const batchKey = `${targetTipo}:batch:${batch.join('|')}`;
      const cachedBatch = this.reaccionesPorBatchCache.get(batchKey);

      if (cachedBatch !== undefined) {
        return cachedBatch;
      }

      const batchQuery = query(
        this.reaccionesCollection,
        where('targetTipo', '==', targetTipo),
        where('targetId', 'in', batch)
      );
      const batchStream$ = this.listenReacciones(batchQuery);
      this.reaccionesPorBatchCache.set(batchKey, batchStream$);
      return batchStream$;
    });

    const stream$ =
      batchStreams.length === 1
        ? batchStreams[0]
        : combineLatest(batchStreams).pipe(
            map((groups) => groups.flat()),
            shareReplay({ bufferSize: 1, refCount: true })
          );

    this.reaccionesPorTargetsCache.set(cacheKey, stream$);
    return stream$;
  }

  reaccionesPorUsuario$(uid: string): Observable<readonly Reaccion[]> {
    const cached = this.reaccionesPorUsuarioCache.get(uid);

    if (cached !== undefined) {
      return cached;
    }

    const reaccionesQuery = query(
      this.reaccionesCollection,
      where('uid', '==', uid)
    );

    const stream$ = this.listenReacciones(reaccionesQuery);
    this.reaccionesPorUsuarioCache.set(uid, stream$);
    return stream$;
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
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }));
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

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.trim() !== ''))].sort();
}

function chunkArray<T>(values: readonly T[], size: number): readonly (readonly T[])[] {
  const chunks: T[][] = [];

  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size) as T[]);
  }

  return chunks;
}
