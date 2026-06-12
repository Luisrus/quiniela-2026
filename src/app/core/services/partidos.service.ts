import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  orderBy,
  query,
  where,
  type CollectionReference,
  type DocumentReference
} from '@angular/fire/firestore';
import type { Observable } from 'rxjs';

import type { Partido, PartidoFase } from '../models/partido.model';
import { FirestoreErrorService } from './firestore-error.service';

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

  partidos$(): Observable<readonly Partido[]> {
    const partidosQuery = query(
      this.partidosCollection,
      orderBy('fechaInicio', 'asc')
    );

    return this.errors.handleStream(
      collectionData(partidosQuery, { idField: 'id' }) as Observable<readonly Partido[]>,
      [] as readonly Partido[],
      'No se pudieron cargar los partidos. La pelota no llegó.'
    );
  }

  partidosPorFase$(fase: PartidoFase): Observable<readonly Partido[]> {
    const partidosQuery = query(
      this.partidosCollection,
      where('fase', '==', fase),
      orderBy('fechaInicio', 'asc')
    );

    return this.errors.handleStream(
      collectionData(partidosQuery, { idField: 'id' }) as Observable<readonly Partido[]>,
      [] as readonly Partido[],
      'No se pudieron cargar los partidos de esta fase. La FIFA está pensando.'
    );
  }

  partido$(id: string): Observable<Partido | undefined> {
    return this.errors.handleStream(
      docData(this.partidoRef(id), { idField: 'id' }) as Observable<Partido | undefined>,
      undefined,
      'No se pudo cargar ese partido. El árbitro lo mandó al túnel.'
    );
  }

  private partidoRef(id: string): DocumentReference<Partido> {
    return doc(this.firestore, 'partidos', id) as DocumentReference<Partido>;
  }
}
