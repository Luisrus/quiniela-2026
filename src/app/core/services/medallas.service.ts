import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  orderBy,
  query,
  where,
  type CollectionReference
} from '@angular/fire/firestore';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

  medallas$(): Observable<readonly Medalla[]> {
    const medallasQuery = query(this.medallasCollection, orderBy('jornada', 'desc'));

    return this.errors.handleStream(
      collectionData(medallasQuery, { idField: 'id' }) as Observable<readonly Medalla[]>,
      [] as readonly Medalla[],
      'No se pudieron cargar las medallas.'
    );
  }

  medallasPorJornada$(jornadaKey: string): Observable<readonly Medalla[]> {
    const medallasQuery = query(
      this.medallasCollection,
      where('jornada', '==', jornadaKey)
    );

    return this.errors.handleStream(
      collectionData(medallasQuery, { idField: 'id' }) as Observable<readonly Medalla[]>,
      [] as readonly Medalla[],
      'No se pudieron cargar las medallas de la jornada.'
    );
  }

  medallasRecientes$(): Observable<readonly Medalla[]> {
    return this.medallas$().pipe(
      map((medallas) => {
        const jornadaReciente = medallas[0]?.jornada;

        if (jornadaReciente === undefined) {
          return [];
        }

        return medallas.filter((medalla) => medalla.jornada === jornadaReciente);
      })
    );
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
