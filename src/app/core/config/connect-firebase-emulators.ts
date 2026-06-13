import { connectAuthEmulator, type Auth } from '@angular/fire/auth';
import { connectFirestoreEmulator, type Firestore } from '@angular/fire/firestore';

import type { AppEnvironment } from '../../../environments/environment.model';

let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

export function connectAuthEmulatorIfNeeded(auth: Auth, environment: AppEnvironment): void {
  if (!environment.useEmulators || authEmulatorConnected || environment.emulators === undefined) {
    return;
  }

  const { host, port } = environment.emulators.auth;

  connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
  authEmulatorConnected = true;
}

export function connectFirestoreEmulatorIfNeeded(
  firestore: Firestore,
  environment: AppEnvironment
): void {
  if (!environment.useEmulators || firestoreEmulatorConnected || environment.emulators === undefined) {
    return;
  }

  const { host, port } = environment.emulators.firestore;

  connectFirestoreEmulator(firestore, host, port);
  firestoreEmulatorConnected = true;
}
