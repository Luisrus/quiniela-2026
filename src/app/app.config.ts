import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import {
  provideRouter,
  withInMemoryScrolling,
  withNavigationErrorHandler
} from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

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
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideMessaging(() => getMessaging())
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
