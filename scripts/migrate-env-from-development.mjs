import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const ENV_PATH = resolve(rootDir, '.env');
const DEV_ENV_PATH = resolve(rootDir, 'src/environments/environment.development.ts');
const TOKEN_PATH = resolve(rootDir, 'tokenfootball.txt');
const SERVICE_ACCOUNT_PATH = findServiceAccountPath(rootDir);

main();

function main() {
  if (existsSync(ENV_PATH)) {
    console.log('.env ya existe. No se modifico.');
    return;
  }

  if (!existsSync(DEV_ENV_PATH)) {
    console.error('No se encontro environment.development.ts para migrar.');
    process.exit(1);
  }

  const devContent = readFileSync(DEV_ENV_PATH, 'utf8');
  const firebase = parseFirebaseFromTs(devContent);
  const lines = [
    '# Generado automaticamente desde environment.development.ts',
    '',
    `FIREBASE_API_KEY=${firebase.apiKey}`,
    `FIREBASE_AUTH_DOMAIN=${firebase.authDomain}`,
    `FIREBASE_PROJECT_ID=${firebase.projectId}`,
    `FIREBASE_STORAGE_BUCKET=${firebase.storageBucket}`,
    `FIREBASE_MESSAGING_SENDER_ID=${firebase.messagingSenderId}`,
    `FIREBASE_APP_ID=${firebase.appId}`,
    `FIREBASE_VAPID_KEY=${firebase.vapidKey}`,
    ''
  ];

  if (SERVICE_ACCOUNT_PATH && existsSync(SERVICE_ACCOUNT_PATH)) {
    lines.push(`FIREBASE_SERVICE_ACCOUNT_FILE=${SERVICE_ACCOUNT_PATH.split(/[/\\]/).pop()}`);
    lines.push('');
  } else {
    lines.push('FIREBASE_SERVICE_ACCOUNT=');
    lines.push('');
  }

  if (existsSync(TOKEN_PATH)) {
    const token = readFileSync(TOKEN_PATH, 'utf8').trim();
    lines.push(`FOOTBALL_DATA_TOKEN=${token}`);
  } else {
    lines.push('FOOTBALL_DATA_TOKEN=');
  }

  writeFileSync(ENV_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log('Creado .env desde tus archivos locales.');
  console.log('Revisa FIREBASE_SERVICE_ACCOUNT si falta el JSON del service account.');
}

function parseFirebaseFromTs(content) {
  const fields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
    'vapidKey'
  ];

  const result = {};

  for (const field of fields) {
    const match = content.match(new RegExp(`${field}:\\s*['"]([^'"]+)['"]`));

    if (!match) {
      console.error(`No se pudo leer ${field} de environment.development.ts`);
      process.exit(1);
    }

    result[field] = match[1];
  }

  return result;
}

function findServiceAccountPath(baseDir) {
  const preferred = resolve(baseDir, 'service-account.json');

  if (existsSync(preferred)) {
    return preferred;
  }

  const match = readdirSync(baseDir).find(
    (name) => name.includes('firebase-adminsdk') && name.endsWith('.json')
  );

  if (!match) {
    return null;
  }

  return resolve(baseDir, match);
}
