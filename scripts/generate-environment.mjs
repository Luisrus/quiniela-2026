import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const FIREBASE_FIELDS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const TARGETS = {
  development: {
    production: false,
    outputPath: 'src/environments/environment.development.ts'
  },
  production: {
    production: true,
    outputPath: 'src/environments/environment.ts'
  }
};

main();

function main() {
  loadDotEnv();

  const mode = process.argv[2];
  const target = TARGETS[mode];

  if (!target) {
    console.error('Uso: node scripts/generate-environment.mjs <development|production>');
    process.exit(1);
  }

  const firebase = readFirebaseConfig();
  const content = buildEnvironmentFile(target.production, firebase);
  const outputPath = resolve(rootDir, target.outputPath);

  writeFileSync(outputPath, content, 'utf8');
  console.log(`Generado: ${target.outputPath}`);
}

function loadDotEnv() {
  const envPath = resolve(rootDir, '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readFirebaseConfig() {
  const config = {};

  for (const field of FIREBASE_FIELDS) {
    const value = process.env[field]?.trim();

    if (!value) {
      console.error(`Falta la variable de entorno ${field}.`);
      console.error('Definela en .env (local) o en GitLab CI/CD > Variables.');
      process.exit(1);
    }

    config[field] = value;
  }

  const vapidKey = process.env.FIREBASE_VAPID_KEY?.trim() ?? 'YOUR_FIREBASE_VAPID_KEY';

  return {
    apiKey: config.FIREBASE_API_KEY,
    authDomain: config.FIREBASE_AUTH_DOMAIN,
    projectId: config.FIREBASE_PROJECT_ID,
    storageBucket: config.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
    appId: config.FIREBASE_APP_ID,
    vapidKey
  };
}

function buildEnvironmentFile(production, firebase) {
  return `import type { FirebaseOptions } from 'firebase/app';

interface AppEnvironment {
  readonly production: boolean;
  readonly firebase: FirebaseOptions & {
    readonly vapidKey: string;
  };
}

export const environment = {
  production: ${production},
  firebase: {
    apiKey: ${JSON.stringify(firebase.apiKey)},
    authDomain: ${JSON.stringify(firebase.authDomain)},
    projectId: ${JSON.stringify(firebase.projectId)},
    storageBucket: ${JSON.stringify(firebase.storageBucket)},
    messagingSenderId: ${JSON.stringify(firebase.messagingSenderId)},
    appId: ${JSON.stringify(firebase.appId)},
    vapidKey: ${JSON.stringify(firebase.vapidKey)}
  }
} satisfies AppEnvironment;
`;
}
