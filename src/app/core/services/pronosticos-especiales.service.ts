import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  query,
  setDoc,
  where,
  type CollectionReference,
  type DocumentReference
} from '@angular/fire/firestore';
import { of, switchMap, type Observable } from 'rxjs';

import { CIERRE_ESPECIALES } from '../config/torneo.config';
import {
  buildPronosticoEspecialId,
  type ConfigTorneo,
  type PronosticoEspecial,
  type PronosticoEspecialTipo
} from '../models/pronostico-especial.model';
import { AuthService } from './auth.service';
import { FirestoreErrorService } from './firestore-error.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class PronosticosEspecialesService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly errors = inject(FirestoreErrorService);
  private readonly toasts = inject(ToastService);

  private readonly especialesCollection = collection(
    this.firestore,
    'pronosticosEspeciales'
  ) as CollectionReference<PronosticoEspecial>;

  /** Observable con los dos picks del usuario autenticado (puede tener 0, 1 o 2 docs). */
  misPronosticosEspeciales$(): Observable<readonly PronosticoEspecial[]> {
    return this.auth.user$.pipe(
      switchMap((user) => {
        if (user === null) {
          return of([] as readonly PronosticoEspecial[]);
        }

        const q = query(this.especialesCollection, where('uid', '==', user.uid));

        return this.errors.handleStream(
          collectionData(q) as Observable<readonly PronosticoEspecial[]>,
          [] as readonly PronosticoEspecial[],
          'No se pudieron cargar tus predicciones especiales.'
        );
      })
    );
  }

  /** Observable con todos los picks de un tipo (para vista social futura). */
  todosPorTipo$(tipo: PronosticoEspecialTipo): Observable<readonly PronosticoEspecial[]> {
    const q = query(this.especialesCollection, where('tipo', '==', tipo));

    return this.errors.handleStream(
      collectionData(q) as Observable<readonly PronosticoEspecial[]>,
      [] as readonly PronosticoEspecial[],
      'No se pudieron cargar las predicciones.'
    );
  }

  /** Observable con el documento de configuración del torneo (campeón/goleador real). */
  configTorneo$(): Observable<ConfigTorneo | undefined> {
    const ref = doc(
      this.firestore,
      'config',
      'torneo'
    ) as DocumentReference<ConfigTorneo>;

    return this.errors.handleStream(
      docData(ref) as Observable<ConfigTorneo | undefined>,
      undefined,
      'No se pudo cargar la configuración del torneo.'
    );
  }

  /** Guarda o actualiza un pick especial del usuario autenticado. */
  async guardar(tipo: PronosticoEspecialTipo, valor: string): Promise<void> {
    if (Date.now() >= CIERRE_ESPECIALES.getTime()) {
      this.toasts.error('El plazo para los picks especiales ya cerró.');
      return;
    }

    const uid = this.requireUid();
    const id = buildPronosticoEspecialId(uid, tipo);
    const data: PronosticoEspecial = { uid, tipo, valor };

    try {
      await setDoc(
        doc(this.firestore, 'pronosticosEspeciales', id) as DocumentReference<PronosticoEspecial>,
        data,
        { merge: true }
      );
      this.toasts.success('Pick guardado. ¡A esperar!');
    } catch (error: unknown) {
      this.errors.report('No se pudo guardar tu pick. El oráculo falló.', error);
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
