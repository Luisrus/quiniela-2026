import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

export function loadProjectEnv() {
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

    if (trimmed.startsWith('FIREBASE_SERVICE_ACCOUNT=')) {
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

export function readFirebaseServiceAccountRaw() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();

  if (inline) {
    return inline;
  }

  const filePath = resolveServiceAccountFilePath();

  if (!filePath) {
    throw new Error(
      'Falta FIREBASE_SERVICE_ACCOUNT en CI/CD o un archivo *firebase-adminsdk*.json en la raiz.'
    );
  }

  return readFileSync(filePath, 'utf8').trim();
}

function resolveServiceAccountFilePath() {
  const configured = process.env.FIREBASE_SERVICE_ACCOUNT_FILE?.trim();

  if (configured) {
    const resolved = resolve(rootDir, configured);

    if (existsSync(resolved)) {
      return resolved;
    }

    throw new Error(`No se encontro FIREBASE_SERVICE_ACCOUNT_FILE: ${configured}`);
  }

  const match = readdirSync(rootDir).find(
    (name) => name.includes('firebase-adminsdk') && name.endsWith('.json')
  );

  if (!match) {
    return null;
  }

  return resolve(rootDir, match);
}
