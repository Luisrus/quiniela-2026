import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  limit,
  orderBy,
  query,
  where,
  type CollectionReference
} from '@angular/fire/firestore';
import { of, shareReplay, switchMap, type Observable } from 'rxjs';

import type { Medalla, MedallaTipo } from '../models/medalla.model';
import { MEDALLA_LABELS } from '../models/medalla.model';
import { FirestoreErrorService } from './firestore-error.service';

interface MedallaDoc {
  readonly id?: string;
  readonly jornada: string;
  readonly tipo: MedallaTipo;
  readonly uid: string;
}

@Injectable({
  providedIn: 'root'
})
export class MedallasService {
  private readonly firestore = inject(Firestore);
  private readonly errors = inject(FirestoreErrorService);
  private readonly medallasCollection = collection(
    this.firestore,
    'medallas'
  ) as CollectionReference<MedallaDoc>;
  private readonly medallasPorJornadaCache = new Map<string, Observable<readonly Medalla[]>>();
  private readonly medallasRecientesCache$ = this.createMedallasRecientesStream();

  medallas$(): Observable<readonly Medalla[]> {
    return this.medallasRecientesCache$;
  }

  medallasPorJornada$(jornadaKey: string): Observable<readonly Medalla[]> {
    const cached = this.medallasPorJornadaCache.get(jornadaKey);

    if (cached !== undefined) {
      return cached;
    }

    const medallasQuery = query(
      this.medallasCollection,
      where('jornada', '==', jornadaKey)
    );

    const stream$ = this.errors.handleStream(
      collectionData(medallasQuery, { idField: 'id' }) as Observable<readonly Medalla[]>,
      [] as readonly Medalla[],
      'No se pudieron cargar las medallas de la jornada.'
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));

    this.medallasPorJornadaCache.set(jornadaKey, stream$);
    return stream$;
  }

  medallasRecientes$(): Observable<readonly Medalla[]> {
    return this.medallasRecientesCache$;
  }

  private createMedallasRecientesStream(): Observable<readonly Medalla[]> {
    const jornadaRecienteQuery = query(
      this.medallasCollection,
      orderBy('jornada', 'desc'),
      limit(1)
    );

    return this.errors.handleStream(
      (collectionData(jornadaRecienteQuery, { idField: 'id' }) as Observable<readonly Medalla[]>)
        .pipe(
          switchMap((medallas) => {
            const jornadaReciente = medallas[0]?.jornada;

            if (jornadaReciente === undefined) {
              return of([] as readonly Medalla[]);
            }

            return this.medallasPorJornada$(jornadaReciente);
          })
        ),
      [] as readonly Medalla[],
      'No se pudieron cargar las medallas.'
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }

  labelFor(tipo: MedallaTipo): string {
    return MEDALLA_LABELS[tipo];
  }

  labelsForUid(medallas: readonly Medalla[], uid: string): readonly string[] {
    return medallas
      .filter((medalla) => medalla.uid === uid)
      .map((medalla) => MEDALLA_LABELS[medalla.tipo]);
  }
}
