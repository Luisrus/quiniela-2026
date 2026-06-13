import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  getDoc,
  query,
  setDoc,
  updateDoc,
  where,
  type CollectionReference,
  type DocumentReference,
  type Query as FirestoreQuery
} from '@angular/fire/firestore';
import { combineLatest, map, of, shareReplay, type Observable } from 'rxjs';

import {
  partidoPronosticoAbierto,
  PRONOSTICO_CIERRE_MINUTOS
} from '../config/pronostico.config';
import type { Partido } from '../models/partido.model';
import {
  buildPronosticoId,
  type Pronostico,
  type PronosticoId,
  type PronosticoInput
} from '../models/pronostico.model';
import { AuthService } from './auth.service';
import { FirestoreErrorService } from './firestore-error.service';

interface StoredPronostico {
  readonly id?: string;
  readonly uid: string;
  readonly partidoId: string;
  readonly golesLocal: number;
  readonly golesVisitante: number;
  readonly frase?: string;
  readonly sinDatos?: boolean;
  readonly puntosGanados?: number | null;
  readonly puntosProvisionales?: number | null;
}

interface StoredPronosticoWithId extends StoredPronostico {
  readonly id: string;
}

@Injectable({
  providedIn: 'root'
})
export class PronosticosService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly errors = inject(FirestoreErrorService);
  private readonly pronosticosCollection = collection(
    this.firestore,
    'pronosticos'
  ) as CollectionReference<StoredPronostico>;
  private pronosticosCache$: Observable<readonly Pronostico[]> | undefined;
  private pronosticosConFraseCache$: Observable<readonly Pronostico[]> | undefined;
  private readonly pronosticosPorUsuarioCache = new Map<string, Observable<readonly Pronostico[]>>();
  private readonly pronosticosPorPartidoCache = new Map<string, Observable<readonly Pronostico[]>>();
  private readonly pronosticosPorPartidosCache = new Map<string, Observable<readonly Pronostico[]>>();

  pronosticos$(): Observable<readonly Pronostico[]> {
    this.pronosticosCache$ ??= this.listenPronosticos(this.pronosticosCollection);
    return this.pronosticosCache$;
  }

  pronosticosConFrase$(): Observable<readonly Pronostico[]> {
    this.pronosticosConFraseCache$ ??= this.createPronosticosConFraseStream();
    return this.pronosticosConFraseCache$;
  }

  pronosticosPorUsuario$(uid: string): Observable<readonly Pronostico[]> {
    const cached = this.pronosticosPorUsuarioCache.get(uid);

    if (cached !== undefined) {
      return cached;
    }

    const pronosticosQuery = query(
      this.pronosticosCollection,
      where('uid', '==', uid)
    );

    const stream$ = this.listenPronosticos(pronosticosQuery);
    this.pronosticosPorUsuarioCache.set(uid, stream$);
    return stream$;
  }

  pronosticosPorPartido$(partidoId: string): Observable<readonly Pronostico[]> {
    const cached = this.pronosticosPorPartidoCache.get(partidoId);

    if (cached !== undefined) {
      return cached;
    }

    const pronosticosQuery = query(
      this.pronosticosCollection,
      where('partidoId', '==', partidoId)
    );

    const stream$ = this.listenPronosticos(pronosticosQuery);
    this.pronosticosPorPartidoCache.set(partidoId, stream$);
    return stream$;
  }

  pronosticosPorPartidos$(partidoIds: readonly string[]): Observable<readonly Pronostico[]> {
    const ids = uniqueStrings(partidoIds);

    if (ids.length === 0) {
      return of([] as readonly Pronostico[]);
    }

    const cacheKey = ids.join('|');
    const cached = this.pronosticosPorPartidosCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const batches = chunkStrings(ids, PRONOSTICO_IN_BATCH);
    const batchStreams = batches.map((batch) => this.pronosticosPorPartidosBatch$(batch));
    const stream$ = batchStreams.length === 1
      ? batchStreams[0]!
      : combineLatest(batchStreams).pipe(
          map((groups) => groups.flat()),
          shareReplay({ bufferSize: 1, refCount: false })
        );

    this.pronosticosPorPartidosCache.set(cacheKey, stream$);
    return stream$;
  }

  pronostico$(uid: string, partidoId: string): Observable<Pronostico | undefined> {
    return this.errors.handleStream(
      docData(this.pronosticoRef(uid, partidoId), { idField: 'id' }).pipe(
        map((value) => value ? this.toPronostico(value as StoredPronosticoWithId) : undefined)
      ),
      undefined,
      'No se pudo cargar el pronóstico. La bola de cristal falló.'
    );
  }

  async guardarMiPronostico(input: PronosticoInput): Promise<boolean> {
    try {
      const uid = this.requireUid();
      const golesLocal = toGoalValue(input.golesLocal);
      const golesVisitante = toGoalValue(input.golesVisitante);
      const frase = (input.frase ?? '').trim().slice(0, 60);
      const partidoAbierto = await this.esPartidoAbierto(input.partidoId);

      if (!partidoAbierto) {
        return false;
      }

      const ref = this.pronosticoRef(uid, input.partidoId);
      const existing = await getDoc(ref);

      if (!existing.exists()) {
        const data: StoredPronostico = {
          uid,
          partidoId: input.partidoId,
          golesLocal,
          golesVisitante,
          ...(frase.length > 0 ? { frase } : {})
        };

        await setDoc(ref, data);
        return true;
      }

      await updateDoc(ref, {
        golesLocal,
        golesVisitante,
        frase
      });
      return true;
    } catch (error: unknown) {
      this.errors.report(pronosticoSaveMessage(error), error);
      return false;
    }
  }

  private async esPartidoAbierto(partidoId: string): Promise<boolean> {
    try {
      const snapshot = await getDoc(this.partidoRef(partidoId));

      if (!snapshot.exists()) {
        this.errors.report('Ese partido no está en la quiniela.', null);
        return false;
      }

      const partido = snapshot.data();

      if (partido === undefined) {
        this.errors.report('Ese partido no está en la quiniela.', null);
        return false;
      }

      const abierto = partidoPronosticoAbierto(partido.fechaInicio, partido.estado);

      if (!abierto) {
        this.errors.report(
          `El plazo cerró: solo se aceptan pronósticos hasta ${PRONOSTICO_CIERRE_MINUTOS} minutos antes del pitido.`,
          null
        );
        return false;
      }

      return true;
    } catch (error: unknown) {
      this.errors.report('No se pudo verificar si el partido sigue abierto.', error);
      return false;
    }
  }

  private listenPronosticos(
    source: FirestoreQuery<StoredPronostico>
  ): Observable<readonly Pronostico[]> {
    return this.errors.handleStream(
      (collectionData(source, { idField: 'id' }) as Observable<readonly StoredPronosticoWithId[]>)
        .pipe(map((items) => items.map((item) => this.toPronostico(item)))),
      [] as readonly Pronostico[],
      'No se pudieron cargar los pronósticos. Nadie trajo la libreta.'
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }

  private createPronosticosConFraseStream(): Observable<readonly Pronostico[]> {
    const pronosticosQuery = query(
      this.pronosticosCollection,
      where('frase', '>', '')
    );

    return this.listenPronosticos(pronosticosQuery);
  }

  private pronosticosPorPartidosBatch$(
    partidoIds: readonly string[]
  ): Observable<readonly Pronostico[]> {
    const cacheKey = partidoIds.join('|');
    const cached = this.pronosticosPorPartidosCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const pronosticosQuery = query(
      this.pronosticosCollection,
      where('partidoId', 'in', [...partidoIds])
    );
    const stream$ = this.listenPronosticos(pronosticosQuery);
    this.pronosticosPorPartidosCache.set(cacheKey, stream$);
    return stream$;
  }

  private partidoRef(partidoId: string): DocumentReference<Partido> {
    return doc(this.firestore, 'partidos', partidoId) as DocumentReference<Partido>;
  }

  private pronosticoRef(
    uid: string,
    partidoId: string
  ): DocumentReference<StoredPronostico> {
    const id = buildPronosticoId(uid, partidoId);
    return doc(this.firestore, 'pronosticos', id) as DocumentReference<StoredPronostico>;
  }

  private toPronostico(value: StoredPronosticoWithId): Pronostico {
    return {
      id: value.id as PronosticoId,
      uid: value.uid,
      partidoId: value.partidoId,
      golesLocal: value.golesLocal,
      golesVisitante: value.golesVisitante,
      frase: value.frase,
      sinDatos: value.sinDatos === true,
      puntosGanados: value.puntosGanados ?? null,
      puntosProvisionales: value.puntosProvisionales ?? null
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

function toGoalValue(value: number): number {
  return Math.trunc(value);
}

function pronosticoSaveMessage(error: unknown): string {
  if (!isFirebaseError(error)) {
    return 'No se pudo guardar tu pronóstico. Se resbaló el balón.';
  }

  if (error.code === 'permission-denied') {
    return 'No se pudo guardar. Si el partido sigue abierto, despliega las reglas: firebase deploy --only firestore:rules';
  }

  if (error.code === 'unauthenticated') {
    return 'Inicia sesión para guardar tu pronóstico.';
  }

  return 'No se pudo guardar tu pronóstico. Se resbaló el balón.';
}

function isFirebaseError(error: unknown): error is { code: string } {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string';
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.trim() !== ''))].sort();
}

const PRONOSTICO_IN_BATCH = 30;

function chunkStrings(values: readonly string[], size: number): readonly string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}
