import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const functionsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(functionsDir, '..');
const vendorDir = resolve(functionsDir, 'vendor');

const scriptFiles = [
  'actualizar-resultados.mjs',
  'recordar-pronosticos.mjs',
  'calcular-puntos.mjs',
  'calcular-rachas.mjs',
  'es-pronostico-tibio.mjs'
];

if (existsSync(vendorDir)) {
  rmSync(vendorDir, { recursive: true, force: true });
}

mkdirSync(vendorDir, { recursive: true });

for (const fileName of scriptFiles) {
  cpSync(resolve(rootDir, 'scripts', fileName), resolve(vendorDir, fileName));
}

writeFileSync(
  resolve(vendorDir, 'project-env.mjs'),
  `export function loadProjectEnv() {}

export function readFirebaseServiceAccountRaw() {
  throw new Error('project-env solo aplica en ejecucion local del script.');
}
`
);

console.log(`Scripts sincronizados en ${vendorDir}`);
