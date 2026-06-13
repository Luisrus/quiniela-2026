/**
 * Radar liviano: consulta Football-Data sin tocar Firestore.
 * Uso: npm run probe-partidos
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { consultarFootballData } from './actualizar-resultados.mjs';
import { loadProjectEnv } from './project-env.mjs';

function requiredEnv(name) {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

async function main() {
  loadProjectEnv();
  const footballDataToken = requiredEnv('FOOTBALL_DATA_TOKEN');
  const consulta = await consultarFootballData(footballDataToken, { now: new Date() });

  console.log(JSON.stringify({
    estado: consulta.hayTrabajoPendiente ? 'activo' : 'omitido',
    motivo: consulta.hayTrabajoPendiente
      ? 'partidos_en_ventana_api'
      : 'sin_partidos_en_ventana_api',
    rangoFechas: consulta.dateRange,
    partidosApi: consulta.apiMatches.length,
    partidosEnRevision: consulta.partidosEnRevision
  }));
}

const entryPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';

if (entryPath === invokedPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
