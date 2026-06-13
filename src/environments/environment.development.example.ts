import type { AppEnvironment } from './environment.model';
import { DEFAULT_FIREBASE_EMULATORS } from './environment.model';

export const environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
    projectId: 'YOUR_FIREBASE_PROJECT_ID',
    storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'YOUR_FIREBASE_APP_ID',
    vapidKey: 'YOUR_FIREBASE_VAPID_KEY'
  },
  emulators: DEFAULT_FIREBASE_EMULATORS
} satisfies AppEnvironment;
