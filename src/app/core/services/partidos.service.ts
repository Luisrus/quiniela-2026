import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  docData,
  documentId,
  Firestore,
  getCountFromServer,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  type CollectionReference,
  type DocumentReference,
  type Query as FirestoreQuery
} from '@angular/fire/firestore';
import {
  combineLatest,
  from,
  map,
  of,
  shareReplay,
  switchMap,
  type Observable
} from 'rxjs';

import { FASES_DESDE_OCTAVOS } from '../config/partido-fases.config';
import type { Partido, PartidoEstado, PartidoFase } from '../models/partido.model';
import { dayKeyBounds, todayDayKey, uniqueStrings } from '../utils/partido-dia.util';
import { FirestoreErrorService } from './firestore-error.service';

const DOCUMENT_ID_BATCH = 30;
const ESTADOS_OCTAVOS_INICIADO: readonly PartidoEstado[] = ['en_juego', 'finalizado'];

@Injectable({
  providedIn: 'root'
})
export class PartidosService {
  private readonly firestore = inject(Firestore);
  private readonly errors = inject(FirestoreErrorService);
  private readonly partidosCollection = collection(
    this.firestore,
    'partidos'
  ) as CollectionReference<Partido>;
  private readonly octavosIniciadosCache$ = this.createOctavosIniciadosStream();
  private readonly primerDiaTorneoCache$ = this.createPrimerDiaTorneoStream();
  private partidosCompletosCache$: Observable<readonly Partido[]> | null = null;
  private readonly partidosPorEstadoCache = new Map<string, Observable<readonly Partido[]>>();
  private readonly partidosPorIdsCache = new Map<string, Observable<readonly Partido[]>>();
  private readonly partidosPorDiaCache = new Map<string, Observable<readonly Partido[]>>();
  private readonly conteoPorEstadoCache = new Map<string, Observable<number>>();
  private partidosJugadosCache$: Observable<readonly Partido[]> | null = null;
  private conteoJugadosCache$: Observable<number> | null = null;

  /** Solo admin: escucha la colección completa. */
  partidos$(): Observable<readonly Partido[]> {
    if (this.partidosCompletosCache$ === null) {
      this.partidosCompletosCache$ = this.createPartidosCompletosStream();
    }

    return this.partidosCompletosCache$;
  }

  octavosIniciados$(): Observable<boolean> {
    return this.octavosIniciadosCache$;
  }

  partidosPorEstado$(
    estado: PartidoEstado,
    direction: 'asc' | 'desc' = 'asc'
  ): Observable<readonly Partido[]> {
    const cacheKey = `${estado}_${direction}`;

    return this.getOrCreatePartidosPorEstado(cacheKey, () =>
      this.listenPartidosQuery(
        query(
          this.partidosCollection,
          where('estado', '==', estado),
          orderBy('fechaInicio', direction)
        )
      )
    );
  }

  /** Jugados: todos los finalizados antes de octavos; desde octavos solo fases eliminatorias. */
  partidosJugados$(): Observable<readonly Partido[]> {
    if (this.partidosJugadosCache$ === null) {
      this.partidosJugadosCache$ = this.octavosIniciados$().pipe(
        switchMap((desdeOctavos) =>
          desdeOctavos
            ? this.partidosFinalizadosDesdeOctavos$()
            : this.partidosPorEstado$('finalizado', 'desc')
        ),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.partidosJugadosCache$;
  }

  conteoPorEstado$(estado: PartidoEstado): Observable<number> {
    const cacheKey = estado;

    return this.getOrCreateConteo(cacheKey, () =>
      this.countQuery(
        query(this.partidosCollection, where('estado', '==', estado))
      )
    );
  }

  conteoJugados$(): Observable<number> {
    if (this.conteoJugadosCache$ === null) {
      this.conteoJugadosCache$ = this.octavosIniciados$().pipe(
        switchMap((desdeOctavos) =>
          desdeOctavos
            ? this.countQuery(
                query(
                  this.partidosCollection,
                  where('estado', '==', 'finalizado'),
                  where('fase', 'in', [...FASES_DESDE_OCTAVOS])
                )
              )
            : this.conteoPorEstado$('finalizado')
        ),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.conteoJugadosCache$;
  }

  hayPartidoEnVivo$(): Observable<boolean> {
    return this.conteoPorEstado$('en_juego').pipe(map((count) => count > 0));
  }

  partidosPorIds$(ids: readonly string[]): Observable<readonly Partido[]> {
    const uniqueIds = uniqueStrings(ids);

    if (uniqueIds.length === 0) {
      return of([] as readonly Partido[]);
    }

    const cacheKey = uniqueIds.slice().sort().join('|');
    const cached = this.partidosPorIdsCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const batches = chunkStrings(uniqueIds, DOCUMENT_ID_BATCH);
    const stream$ = combineLatest(
      batches.map((batch) =>
        this.listenPartidosQuery(
          query(this.partidosCollection, where(documentId(), 'in', batch))
        )
      )
    ).pipe(
      map((groups) => groups.flat()),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.partidosPorIdsCache.set(cacheKey, stream$);
    return stream$;
  }

  partidosPorDia$(dayKey: string): Observable<readonly Partido[]> {
    const cached = this.partidosPorDiaCache.get(dayKey);

    if (cached !== undefined) {
      return cached;
    }

    const { start, end } = dayKeyBounds(dayKey);
    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(end);
    const stream$ = this.listenPartidosQuery(
      query(
        this.partidosCollection,
        where('fechaInicio', '>=', startTs),
        where('fechaInicio', '<', endTs),
        orderBy('fechaInicio', 'asc')
      )
    );

    this.partidosPorDiaCache.set(dayKey, stream$);
    return stream$;
  }

  primerDiaTorneo$(): Observable<string | undefined> {
    return this.primerDiaTorneoCache$;
  }

  partidosPorFase$(fase: PartidoFase): Observable<readonly Partido[]> {
    const partidosQuery = query(
      this.partidosCollection,
      where('fase', '==', fase),
      orderBy('fechaInicio', 'asc')
    );

    return this.listenPartidosQuery(partidosQuery);
  }

  partido$(id: string): Observable<Partido | undefined> {
    return this.errors.handleStream(
      docData(this.partidoRef(id), { idField: 'id' }) as Observable<Partido | undefined>,
      undefined,
      'No se pudo cargar ese partido. El árbitro lo mandó al túnel.'
    );
  }

  private partidosFinalizadosDesdeOctavos$(): Observable<readonly Partido[]> {
    return this.getOrCreatePartidosPorEstado('finalizado_desde_octavos_desc', () =>
      this.listenPartidosQuery(
        query(
          this.partidosCollection,
          where('estado', '==', 'finalizado'),
          where('fase', 'in', [...FASES_DESDE_OCTAVOS]),
          orderBy('fechaInicio', 'desc')
        )
      )
    );
  }

  private createPartidosCompletosStream(): Observable<readonly Partido[]> {
    const partidosQuery = query(
      this.partidosCollection,
      orderBy('fechaInicio', 'asc')
    );

    return this.listenPartidosQuery(partidosQuery);
  }

  private createOctavosIniciadosStream(): Observable<boolean> {
    const octavosQuery = query(
      this.partidosCollection,
      where('fase', '==', 'octavos'),
      where('estado', 'in', [...ESTADOS_OCTAVOS_INICIADO]),
      limit(1)
    );

    return this.errors.handleStream(
      (collectionData(octavosQuery, { idField: 'id' }) as Observable<readonly Partido[]>).pipe(
        map((partidos) => partidos.length > 0)
      ),
      false,
      'No se pudo detectar la fase de octavos.'
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }

  private createPrimerDiaTorneoStream(): Observable<string | undefined> {
    const primerPartidoQuery = query(
      this.partidosCollection,
      orderBy('fechaInicio', 'asc'),
      limit(1)
    );

    return this.errors.handleStream(
      (collectionData(primerPartidoQuery, { idField: 'id' }) as Observable<readonly Partido[]>).pipe(
        map((partidos) => {
          const first = partidos[0];

          if (first === undefined) {
            return undefined;
          }

          return dayKeyFromPartido(first);
        })
      ),
      undefined,
      'No se pudo cargar el calendario del torneo.'
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }

  private getOrCreatePartidosPorEstado(
    cacheKey: string,
    factory: () => Observable<readonly Partido[]>
  ): Observable<readonly Partido[]> {
    const cached = this.partidosPorEstadoCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const stream$ = factory();
    this.partidosPorEstadoCache.set(cacheKey, stream$);
    return stream$;
  }

  private getOrCreateConteo(
    cacheKey: string,
    factory: () => Observable<number>
  ): Observable<number> {
    const cached = this.conteoPorEstadoCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const stream$ = factory().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.conteoPorEstadoCache.set(cacheKey, stream$);
    return stream$;
  }

  private listenPartidosQuery(
    partidosQuery: FirestoreQuery<Partido>
  ): Observable<readonly Partido[]> {
    return this.errors.handleStream(
      collectionData(partidosQuery, { idField: 'id' }) as Observable<readonly Partido[]>,
      [] as readonly Partido[],
      'No se pudieron cargar los partidos. La pelota no llegó.'
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }

  private countQuery(partidosQuery: FirestoreQuery<Partido>): Observable<number> {
    return from(getCountFromServer(partidosQuery)).pipe(
      map((snapshot) => snapshot.data().count)
    );
  }

  private partidoRef(id: string): DocumentReference<Partido> {
    return doc(this.firestore, 'partidos', id) as DocumentReference<Partido>;
  }
}

function dayKeyFromPartido(partido: Partido): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala'
  }).format(partido.fechaInicio.toDate());
}

function chunkStrings(values: readonly string[], size: number): readonly string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}
