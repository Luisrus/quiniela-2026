import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  setDoc,
  updateDoc,
  deleteDoc,
  type CollectionReference,
  type DocumentReference
} from '@angular/fire/firestore';
import type { Observable } from 'rxjs';

import type { Torneo } from '../models/torneo.model';
import { FirestoreErrorService } from './firestore-error.service';

@Injectable({
  providedIn: 'root'
})
export class TorneosService {
  private readonly firestore = inject(Firestore);
  private readonly errors = inject(FirestoreErrorService);
  private readonly torneosCollection = collection(
    this.firestore,
    'torneos'
  ) as CollectionReference<Torneo>;

  torneos$(): Observable<readonly Torneo[]> {
    return this.errors.handleStream(
      collectionData(this.torneosCollection, { idField: 'id' }) as Observable<readonly Torneo[]>,
      [] as readonly Torneo[],
      'No se pudieron cargar los torneos.'
    );
  }

  async crearTorneo(torneo: Omit<Torneo, 'id'>): Promise<string> {
    const newDocRef = doc(this.torneosCollection);
    const id = newDocRef.id;
    await setDoc(newDocRef, { ...torneo, id });
    return id;
  }

  async actualizarTorneo(id: string, update: Partial<Omit<Torneo, 'id'>>): Promise<void> {
    const ref = this.torneoRef(id);
    await updateDoc(ref, update);
  }

  async eliminarTorneo(id: string): Promise<void> {
    const ref = this.torneoRef(id);
    await deleteDoc(ref);
  }

  private torneoRef(id: string): DocumentReference<Torneo> {
    return doc(this.torneosCollection, id);
  }
}
