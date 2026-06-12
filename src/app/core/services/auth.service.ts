import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Auth,
  authState,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from '@angular/fire/auth';
import { startWith, type Observable } from 'rxjs';

import type { UserProfile } from '../models/user-profile.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth = inject(Auth);

  readonly user$: Observable<FirebaseUser | null> = authState(this.auth);

  private readonly firebaseUser = toSignal(
    this.user$.pipe(startWith(undefined)),
    { initialValue: undefined as FirebaseUser | null | undefined }
  );

  readonly userProfile = computed<UserProfile | null | undefined>(() => {
    const user = this.firebaseUser();

    if (user === undefined) {
      return undefined;
    }

    if (user === null) {
      return null;
    }

    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL
    };
  });

  readonly isLoading = computed(() => this.userProfile() === undefined);

  readonly isAuthenticated = computed(() => {
    const profile = this.userProfile();
    return profile !== undefined && profile !== null;
  });

  async signInWithGoogle(): Promise<FirebaseUser> {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    return credential.user;
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }
}
