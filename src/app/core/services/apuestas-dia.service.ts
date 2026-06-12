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
  type ApuestaDia,
  type ApuestaDiaResultado
} from '../models/apuesta-dia.model';
import { AuthService } from './auth.service';
import { FirestoreErrorService } from './firestore-error.service';
import { ToastService } from './toast.service';
import { UsuariosService } from './usuarios.service';

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

  /** Todas las apuestas de una jornada (para el feed social). */
  apuestasPorJornada$(jornadaKey: string): Observable<readonly ApuestaDia[]> {
    const q = query(this.apuestasCollection, where('jornadaKey', '==', jornadaKey));

    return this.errors.handleStream(
      collectionData(q, { idField: 'id' }) as Observable<readonly ApuestaDia[]>,
      [] as readonly ApuestaDia[],
      'No se pudieron cargar las apuestas de la jornada.'
    );
  }

  /** Apuesta del usuario autenticado en la jornada dada. */
  miApuesta$(jornadaKey: string): Observable<ApuestaDia | undefined> {
    const uid = this.auth.userProfile()?.uid;

    if (!uid) {
      return of(undefined);
    }

    const q = query(
      this.apuestasCollection,
      where('jornadaKey', '==', jornadaKey),
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

  /** Retos recibidos por el usuario autenticado en la jornada dada que están esperando aceptación. */
  misRetosRecibidos$(jornadaKey: string): Observable<readonly ApuestaDia[]> {
    const uid = this.auth.userProfile()?.uid;

    if (!uid) {
      return of([]);
    }

    const q = query(
      this.apuestasCollection,
      where('jornadaKey', '==', jornadaKey),
      where('retado', '==', uid),
      where('resultado', '==', 'esperando_aceptacion')
    );

    return this.errors.handleStream(
      collectionData(q, { idField: 'id' }) as Observable<readonly ApuestaDia[]>,
      [],
      'No se pudieron cargar los retos recibidos.'
    );
  }

  /** Crea o actualiza la apuesta del usuario para la jornada dada. */
  async guardar(jornadaKey: string, retadoUid: string, porUnPuntoReal: boolean, apuestaTexto: string = ''): Promise<void> {
    const uid = this.requireUid();

    if (uid === retadoUid) {
      this.toasts.error('No puedes apostarte a ti mismo, primo.');
      return;
    }

    const retadorEsTitular = await this.usuarios.esTitularUid(uid);
    const retadoEsTitular = await this.usuarios.esTitularUid(retadoUid);

    if (!retadorEsTitular || !retadoEsTitular) {
      this.toasts.error('Las apuestas del día son solo entre titulares.');
      return;
    }

    const id = buildApuestaDiaId(uid, jornadaKey);
    const data: ApuestaDia = {
      id,
      jornadaKey,
      retador: uid,
      retado: retadoUid,
      porUnPuntoReal,
      apuestaTexto,
      resultado: 'esperando_aceptacion'
    };

    try {
      await setDoc(
        doc(this.firestore, 'apuestasDia', id) as DocumentReference<ApuestaDia>,
        data,
        { merge: false }
      );
      this.toasts.success('¡Apuesta guardada! Que gane el mejor 🎲');
    } catch (error: unknown) {
      this.errors.report('No se pudo guardar la apuesta. Se cayó el dado.', error);
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
      this.toasts.success('¡Reto aceptado! Que gane el mejor.');
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
