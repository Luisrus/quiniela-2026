import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  query,
  setDoc,
  where,
  type CollectionReference,
  type DocumentReference
} from '@angular/fire/firestore';
import { map, of, type Observable } from 'rxjs';

import {
  buildApuestaDiaId,
  type ApuestaDia
} from '../models/apuesta-dia.model';
import { AuthService } from './auth.service';
import { FirestoreErrorService } from './firestore-error.service';
import { ToastService } from './toast.service';
import { UsuariosService } from './usuarios.service';

export interface GuardarApuestaPartidoInput {
  readonly partidoId: string;
  readonly jornadaKey: string;
  readonly retadoUid: string;
  readonly porUnPuntoReal: boolean;
  readonly apuestaTexto?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApuestasDiaService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly errors = inject(FirestoreErrorService);
  private readonly toasts = inject(ToastService);
  private readonly usuarios = inject(UsuariosService);

  private readonly apuestasCollection = collection(
    this.firestore,
    'apuestasDia'
  ) as CollectionReference<ApuestaDia>;

  apuestasPorJornada$(jornadaKey: string): Observable<readonly ApuestaDia[]> {
    const q = query(this.apuestasCollection, where('jornadaKey', '==', jornadaKey));

    return this.errors.handleStream(
      collectionData(q, { idField: 'id' }) as Observable<readonly ApuestaDia[]>,
      [] as readonly ApuestaDia[],
      'No se pudieron cargar las apuestas de la jornada.'
    );
  }

  miApuestaPorPartido$(partidoId: string): Observable<ApuestaDia | undefined> {
    const uid = this.auth.userProfile()?.uid;

    if (!uid) {
      return of(undefined);
    }

    const q = query(
      this.apuestasCollection,
      where('partidoId', '==', partidoId),
      where('retador', '==', uid)
    );

    return this.errors.handleStream(
      (collectionData(q, { idField: 'id' }) as Observable<readonly ApuestaDia[]>).pipe(
        map((docs) => docs[0])
      ),
      undefined,
      'No se pudo cargar tu apuesta.'
    );
  }

  misRetosRecibidos$(): Observable<readonly ApuestaDia[]> {
    const uid = this.auth.userProfile()?.uid;

    if (!uid) {
      return of([]);
    }

    return this.retosRecibidosPorUid$(uid);
  }

  retosRecibidosPorUid$(uid: string): Observable<readonly ApuestaDia[]> {
    const q = query(
      this.apuestasCollection,
      where('retado', '==', uid),
      where('resultado', '==', 'esperando_aceptacion')
    );

    return this.errors.handleStream(
      collectionData(q, { idField: 'id' }) as Observable<readonly ApuestaDia[]>,
      [],
      'No se pudieron cargar los retos recibidos.'
    );
  }

  async guardar(input: GuardarApuestaPartidoInput): Promise<void> {
    const uid = this.requireUid();

    if (uid === input.retadoUid) {
      this.toasts.error('No puedes apostarte a ti mismo, primo.');
      return;
    }

    const retadorEsTitular = await this.usuarios.esTitularUid(uid);
    const retadoEsTitular = await this.usuarios.esTitularUid(input.retadoUid);

    if (!retadorEsTitular || !retadoEsTitular) {
      this.toasts.error('Las apuestas son solo entre titulares.');
      return;
    }

    const id = buildApuestaDiaId(uid, input.partidoId, input.retadoUid);
    const data: ApuestaDia = {
      id,
      jornadaKey: input.jornadaKey,
      partidoId: input.partidoId,
      retador: uid,
      retado: input.retadoUid,
      porUnPuntoReal: input.porUnPuntoReal,
      apuestaTexto: input.apuestaTexto ?? '',
      resultado: 'esperando_aceptacion'
    };

    try {
      await setDoc(
        doc(this.firestore, 'apuestasDia', id) as DocumentReference<ApuestaDia>,
        data,
        { merge: false }
      );
      this.toasts.success('Apuesta enviada. Falta que acepte el reto.');
    } catch (error: unknown) {
      this.errors.report('No se pudo guardar la apuesta.', error);
      throw error;
    }
  }

  async aceptarApuesta(id: string): Promise<void> {
    try {
      await setDoc(
        doc(this.firestore, 'apuestasDia', id),
        { resultado: 'pendiente' } as Partial<ApuestaDia>,
        { merge: true }
      );
      this.toasts.success('Reto aceptado.');
    } catch (error: unknown) {
      this.errors.report('No se pudo aceptar el reto.', error);
      throw error;
    }
  }

  async rechazarApuesta(id: string): Promise<void> {
    try {
      await setDoc(
        doc(this.firestore, 'apuestasDia', id),
        { resultado: 'rechazada' } as Partial<ApuestaDia>,
        { merge: true }
      );
      this.toasts.success('Reto rechazado.');
    } catch (error: unknown) {
      this.errors.report('No se pudo rechazar el reto.', error);
      throw error;
    }
  }

  private requireUid(): string {
    const profile = this.auth.userProfile();

    if (profile === undefined || profile === null) {
      throw new Error('Usuario no autenticado.');
    }

    return profile.uid;
  }
}
