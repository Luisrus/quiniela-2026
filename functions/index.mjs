import { initializeApp } from 'firebase-admin/app';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { createAccessTokenForScopes } from './google-auth.mjs';
import { runRecordarPronosticos } from './vendor/recordar-pronosticos.mjs';

initializeApp();

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const SCHEDULE = 'every 5 minutes';
const TIME_ZONE = 'America/Mexico_City';

export const recordarPronosticos = onSchedule(
  {
    schedule: SCHEDULE,
    timeZone: TIME_ZONE,
    memory: '256MiB',
    timeoutSeconds: 120
  },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT;

    if (projectId === undefined || projectId.trim() === '') {
      throw new Error('GCLOUD_PROJECT no esta definido.');
    }

    const accessToken = await createAccessTokenForScopes([FIRESTORE_SCOPE, MESSAGING_SCOPE]);

    await runRecordarPronosticos({ projectId, accessToken });
  }
);
