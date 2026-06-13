import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  getDoc,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type CollectionReference,
  type DocumentReference
} from '@angular/fire/firestore';
import type { User as FirebaseUser } from '@angular/fire/auth';
import { shareReplay, type Observable } from 'rxjs';

import type { UserProfile } from '../models/user-profile.model';
import type { Usuario, UsuarioProfileUpdate } from '../models/usuario.model';
import { esTitular } from '../utils/usuario-tipo.util';
import { AuthService } from './auth.service';
import { FirestoreErrorService } from './firestore-error.service';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly errors = inject(FirestoreErrorService);
  private readonly usuariosCollection = collection(
    this.firestore,
    'usuarios'
  ) as CollectionReference<Usuario>;
  private readonly usuariosCache$ = this.createUsuariosStream();
  private readonly ensuredUids = new Set<string>();

  usuarios$(): Observable<readonly Usuario[]> {
    return this.usuariosCache$;
  }

  private createUsuariosStream(): Observable<readonly Usuario[]> {
    const usuariosQuery = query(
      this.usuariosCollection,
      orderBy('puntos', 'desc')
    );

    return this.errors.handleStream(
      collectionData(usuariosQuery, { idField: 'uid' }) as Observable<readonly Usuario[]>,
      [] as readonly Usuario[],
      'No se pudo cargar la tabla. El marcador se fue a revisión.'
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }

  usuario$(uid: string): Observable<Usuario | undefined> {
    return this.errors.handleStream(
      docData(this.usuarioRef(uid), { idField: 'uid' }) as Observable<Usuario | undefined>,
      undefined,
      'No se pudo cargar el usuario. Se nos perdió en la banca.'
    );
  }

  async esTitularUid(uid: string): Promise<boolean> {
    try {
      const snapshot = await getDoc(this.usuarioRef(uid));

      if (!snapshot.exists()) {
        return false;
      }

      return esTitular(snapshot.data().tipo);
    } catch (error: unknown) {
      this.errors.report('No se pudo verificar el tipo de usuario.', error);
      return false;
    }
  }

  async esAdmin(uid: string): Promise<boolean> {
    try {
      const snapshot = await getDoc(this.usuarioRef(uid));

      if (!snapshot.exists()) {
        return false;
      }

      return snapshot.data().esAdmin === true;
    } catch (error: unknown) {
      this.errors.report('No se pudo verificar permisos de admin.', error);
      return false;
    }
  }

  async ensureOwnUsuario(firebaseUser?: FirebaseUser | null): Promise<'nuevo' | 'existente' | 'error'> {
    const profile = toUserProfile(firebaseUser) ?? this.auth.userProfile();

    if (profile === undefined || profile === null) {
      return 'error';
    }

    const uid = profile.uid;

    if (this.ensuredUids.has(uid)) {
      return 'existente';
    }

    const usuarioRef = this.usuarioRef(uid);

    try {
      if (firebaseUser) {
        await firebaseUser.getIdToken();
      }

      const snapshot = await getDoc(usuarioRef);

      if (snapshot.exists()) {
        await syncFotoUrlIfNeeded(usuarioRef, snapshot.data(), profile);
        this.ensuredUids.add(uid);
        return 'existente';
      }

      await setDoc(usuarioRef, {
        uid,
        nombre: defaultNombre(profile),
        fotoUrl: profile.photoURL ?? null,
        tipo: 'invitado',
        puntos: 0,
        badges: [],
        rachaAciertos: 0,
        rachaAciertosMaxima: 0,
        rachaExactos: 0,
        rachaExactosMaxima: 0
      });

      this.ensuredUids.add(uid);
      return 'nuevo';
    } catch (error: unknown) {
      this.errors.report('No se pudo registrar tu perfil en la quiniela.', error);
      return 'error';
    }
  }

  async updateOwnProfile(input: UsuarioProfileUpdate): Promise<void> {
    const uid = this.requireUid();

    try {
      await updateDoc(this.usuarioRef(uid), { ...input });
    } catch (error: unknown) {
      this.errors.report('No se pudo actualizar tu perfil. El VAR dijo que no.', error);
    }
  }

  async updateEquipoFavorito(equipoFavorito: string | null): Promise<void> {
    const uid = this.requireUid();

    try {
      await updateDoc(this.usuarioRef(uid), { equipoFavorito });
    } catch (error: unknown) {
      this.errors.report('No se pudo guardar tu equipo del corazón.', error);
    }
  }

  async updateFcmToken(fcmToken: string | null): Promise<void> {
    const uid = this.requireUid();

    try {
      await updateDoc(this.usuarioRef(uid), { fcmToken });
    } catch (error: unknown) {
      this.errors.report('No se pudo guardar el token de notificaciones.', error);
      throw error;
    }
  }

  private usuarioRef(uid: string): DocumentReference<Usuario> {
    return doc(this.firestore, 'usuarios', uid) as DocumentReference<Usuario>;
  }

  private requireUid(): string {
    const profile = this.auth.userProfile();

    if (profile === undefined || profile === null) {
      throw new Error('Usuario no autenticado.');
    }

    return profile.uid;
  }
}

function toUserProfile(firebaseUser: FirebaseUser | null | undefined): UserProfile | null {
  if (firebaseUser === undefined || firebaseUser === null) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL
  };
}

async function syncFotoUrlIfNeeded(
  usuarioRef: DocumentReference<Usuario>,
  usuario: Usuario,
  profile: UserProfile
): Promise<void> {
  const authPhoto = profile.photoURL?.trim() ?? '';
  const storedPhoto = usuario.fotoUrl?.trim() ?? '';

  if (authPhoto === '' || storedPhoto !== '') {
    return;
  }

  await updateDoc(usuarioRef, { fotoUrl: authPhoto });
}

function defaultNombre(profile: UserProfile): string {
  const displayName = profile.displayName?.trim();

  if (displayName !== undefined && displayName !== '') {
    return displayName;
  }

  const emailLocal = profile.email?.split('@')[0]?.trim();

  if (emailLocal !== undefined && emailLocal !== '') {
    return emailLocal;
  }

  return 'Jugador';
}
