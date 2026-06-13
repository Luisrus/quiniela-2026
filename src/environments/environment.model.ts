import type { FirebaseOptions } from 'firebase/app';

export interface FirebaseEmulatorHost {
  readonly host: string;
  readonly port: number;
}

export interface FirebaseEmulatorConfig {
  readonly auth: FirebaseEmulatorHost;
  readonly firestore: FirebaseEmulatorHost;
}

export interface AppEnvironment {
  readonly production: boolean;
  readonly useEmulators: boolean;
  readonly firebase: FirebaseOptions & {
    readonly vapidKey: string;
  };
  readonly emulators?: FirebaseEmulatorConfig;
}

export const DEFAULT_FIREBASE_EMULATORS: FirebaseEmulatorConfig = {
  auth: { host: '127.0.0.1', port: 9099 },
  firestore: { host: '127.0.0.1', port: 8080 }
};
