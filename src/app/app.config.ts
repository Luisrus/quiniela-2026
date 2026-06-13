import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from '@angular/fire/firestore';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import {
  provideRouter,
  withInMemoryScrolling,
  withNavigationErrorHandler
} from '@angular/router';

import {
  connectAuthEmulatorIfNeeded,
  connectFirestoreEmulatorIfNeeded
} from './core/config/connect-firebase-emulators';
import { environment } from '../environments/environment';
import type { AppEnvironment } from '../environments/environment.model';
import { routes } from './app.routes';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

const appEnvironment = environment as AppEnvironment;

const firebaseProviders: ApplicationConfig['providers'] = [
  provideFirebaseApp(() => initializeApp(appEnvironment.firebase)),
  provideAuth(() => {
    const auth = getAuth();
    connectAuthEmulatorIfNeeded(auth, appEnvironment);
    return auth;
  }),
  provideFirestore(() => {
    const firestore = initializeFirestore(getApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
    connectFirestoreEmulatorIfNeeded(firestore, appEnvironment);
    return firestore;
  })
];

if (!appEnvironment.useEmulators) {
  firebaseProviders.push(provideMessaging(() => getMessaging()));
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideCharts(withDefaultRegisterables()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withNavigationErrorHandler((error) => {
        if (isChunkLoadError(error.error) && typeof window !== 'undefined') {
          window.location.reload();
        }
      })
    ),
    ...firebaseProviders
  ]
};

function isChunkLoadError(error: unknown): boolean {
  if (error instanceof Error) {
    return chunkErrorPattern().test(error.message);
  }

  return typeof error === 'string' && chunkErrorPattern().test(error);
}

function chunkErrorPattern(): RegExp {
  return /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i;
}
