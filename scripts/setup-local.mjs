import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const FILES = [
  {
    source: '.env.example',
    target: '.env',
    hint: 'Completa .env con tus credenciales de Firebase y Football-Data.'
  },
  {
    source: 'src/environments/environment.development.example.ts',
    target: 'src/environments/environment.development.ts',
    hint: 'O ejecuta: npm run env:development (lee .env y genera el archivo).'
  }
];

main();

function main() {
  let created = 0;

  for (const file of FILES) {
    const sourcePath = resolve(rootDir, file.source);
    const targetPath = resolve(rootDir, file.target);

    if (existsSync(targetPath)) {
      console.log(`Ya existe: ${file.target}`);
      continue;
    }

    if (!existsSync(sourcePath)) {
      console.error(`No se encontro plantilla: ${file.source}`);
      process.exit(1);
    }

    copyFileSync(sourcePath, targetPath);
    console.log(`Creado: ${file.target}`);
    console.log(`  -> ${file.hint}`);
    created += 1;
  }

  if (created === 0) {
    console.log('Nada que crear. Tus archivos locales ya estan listos.');
    return;
  }

  console.log('');
  console.log('Siguiente paso: edita .env y luego ejecuta npm run env:development');
}
