import { createSign } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { calcularPuntosPronostico } from './calcular-puntos.mjs';
import { actualizarRachas, rachasFromUsuario } from './calcular-rachas.mjs';
import { esPronosticoTibio } from './es-pronostico-tibio.mjs';
import { loadProjectEnv, readFirebaseServiceAccountRaw } from './project-env.mjs';

const FOOTBALL_DATA_URL = 'https://api.football-data.org/v4/competitions/WC/matches';
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DATABASE_ID = '(default)';
const MAX_BATCH_WRITES = 450;
const SYNC_CONFIG_PATH = 'config/sync';
const MINUTE_MS = 60 * 1000;
const FIRST_LIVE_SYNC_DELAY_MS = 5 * MINUTE_MS;
const LIVE_SYNC_INTERVAL_MS = 30 * MINUTE_MS;
const FINAL_SYNC_DELAY_MS = 5 * MINUTE_MS;
const FINAL_SYNC_WINDOW_MS = 20 * MINUTE_MS;
const POLL_WINDOW_MS = 7 * MINUTE_MS;

const liveEstados = new Set(['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT', 'LIVE']);
const finalEstados = new Set(['FINISHED', 'AWARDED']);

const deleteField = Symbol('deleteField');

export async function runActualizarResultados({ footballDataToken, projectId, accessToken }) {
  const firestore = createFirestoreClient(projectId, accessToken);
  const now = new Date();

  const apiMatches = await fetchFootballDataMatches(footballDataToken);
  const syncState = await getSyncState(firestore);
  const candidateMatches = apiMatches.filter((match) => partidoRequiereRevision(match, now));
  const partidosParaSync = candidateMatches
    .filter((match) => partidoDebeSincronizarse(match, syncState, now))
    .map((match) => toPartidoDoc(match, syncState, now));

  await upsertPartidos(firestore, partidosParaSync);

  const livePartidos = partidosParaSync.filter((partido) => partido.estado === 'en_juego');
  const finalizedPartidos = partidosParaSync.filter((partido) =>
    partido.estado === 'finalizado' &&
    !syncState.finalizadosCalculados.has(partido.id)
  );

  let pronosticosByPartido = new Map();

  if (livePartidos.length > 0) {
    const livePronosticos = await listPronosticosPorPartidos(firestore, livePartidos.map((partido) => partido.id));
    const usuarios = await listUsuariosPorIds(firestore, uidsFromPronosticos(livePronosticos));
    pronosticosByPartido = groupBy(livePronosticos, (doc) => doc.data.partidoId);

    await actualizarPuntosProvisionales({
      firestore,
      livePartidos,
      pronosticosByPartido,
      usuarios
    });
  }

  const partidosTorneo = apiMatches.map((match) =>
    toPartidoDoc(match, syncState, now)
  );

  for (const partido of finalizedPartidos) {
    const pronosticosDelPartido = await firestore.queryCollection(
      'pronosticos',
      [{ fieldPath: 'partidoId', op: 'EQUAL', value: partido.id }]
    );
    const cierreJornada = cierreDeJornada(partido, partidosTorneo);
    const pronosticosJornada = cierreJornada
      ? await listPronosticosPorPartidos(firestore, idsPartidosJornada(partido, partidosTorneo))
      : pronosticosDelPartido;
    const apuestas = await listApuestasPendientesPartido(firestore, partido.id);
    const usuarios = await listUsuariosPorIds(firestore, [
      ...uidsFromPronosticos(pronosticosJornada),
      ...uidsFromApuestas(apuestas)
    ]);

    await cerrarPartidoFinalizado({
      firestore,
      partido,
      partidos: partidosTorneo,
      pronosticos: pronosticosJornada,
      pronosticosDelPartido,
      usuarios,
      apuestas
    });

    syncState.finalizadosCalculados.add(partido.id);
  }

  await guardarSyncState(
    firestore,
    syncState,
    partidosParaSync.filter((partido) => partido.estado !== 'finalizado'),
    now
  );

  console.log(JSON.stringify({
    partidosRevisados: candidateMatches.length,
    partidosActualizados: partidosParaSync.length,
    partidosEnJuego: livePartidos.length,
    partidosFinalizadosNuevos: finalizedPartidos.length
  }));
}

function requiredEnv(name) {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

function parseServiceAccount(raw) {
  const value = raw.trim();
  const json = value.startsWith('{')
    ? value
    : Buffer.from(value, 'base64').toString('utf8');
  const parsed = JSON.parse(json);

  for (const field of ['client_email', 'private_key', 'project_id']) {
    if (typeof parsed[field] !== 'string' || parsed[field].trim() === '') {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT no contiene ${field}.`);
    }
  }

  return parsed;
}

async function createAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: FIRESTORE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signature = createSign('RSA-SHA256')
    .update(unsigned)
    .sign(serviceAccount.private_key);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  if (!response.ok) {
    throw new Error(`No se pudo autenticar con Google: ${response.status} ${await response.text()}`);
  }

  const body = await response.json();

  if (typeof body.access_token !== 'string') {
    throw new Error('La respuesta de OAuth no incluyo access_token.');
  }

  return body.access_token;
}

function base64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  return buffer
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

async function fetchFootballDataMatches(token) {
  const response = await fetch(FOOTBALL_DATA_URL, {
    headers: { 'X-Auth-Token': token }
  });

  if (!response.ok) {
    throw new Error(`Football-Data fallo: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload.matches)) {
    throw new Error('Football-Data no devolvio un arreglo matches.');
  }

  return payload.matches;
}

function createFirestoreClient(projectId, accessToken) {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${DATABASE_ID}`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        ...(options.headers ?? {})
      }
    });

    if (!response.ok) {
      if (response.status === 404 && options.allowNotFound === true) {
        return null;
      }

      throw new Error(`Firestore fallo ${response.status} ${path}: ${await response.text()}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  return {
    nameFor(path) {
      return `projects/${projectId}/databases/${DATABASE_ID}/documents/${path}`;
    },

    async list(collectionId) {
      const result = [];
      let pageToken = '';

      do {
        const qs = new URLSearchParams({ pageSize: '300' });
        if (pageToken) {
          qs.set('pageToken', pageToken);
        }

        const body = await request(`/documents/${collectionId}?${qs.toString()}`);
        const documents = Array.isArray(body.documents) ? body.documents : [];

        for (const document of documents) {
          result.push(fromDocument(document));
        }

        pageToken = typeof body.nextPageToken === 'string' ? body.nextPageToken : '';
      } while (pageToken);

      return result;
    },

    async getOptional(path, transaction = null) {
      if (transaction !== null) {
        const body = await request('/documents:batchGet', {
          method: 'POST',
          body: JSON.stringify({
            documents: [this.nameFor(path)],
            transaction
          })
        });
        const found = body.find((entry) => entry.found)?.found;
        return found === undefined ? null : fromDocument(found);
      }

      const body = await request(`/documents/${path}`, { allowNotFound: true });
      return body === null ? null : fromDocument(body);
    },

    async queryCollection(collectionId, filters) {
      if (filters.length === 0) {
        return this.list(collectionId);
      }

      const body = await request('/documents:runQuery', {
        method: 'POST',
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId }],
            where: compositeFilter(filters)
          }
        })
      });

      return body
        .map((entry) => entry.document)
        .filter((document) => document !== undefined)
        .map((document) => fromDocument(document));
    },

    async get(path, transaction = null) {
      if (transaction === null) {
        const body = await request(`/documents/${path}`);
        return fromDocument(body);
      }

      const body = await request('/documents:batchGet', {
        method: 'POST',
        body: JSON.stringify({
          documents: [this.nameFor(path)],
          transaction
        })
      });
      const found = body.find((entry) => entry.found)?.found;

      return found === undefined ? null : fromDocument(found);
    },

    async commit(writes, transaction = null) {
      for (const chunk of chunkArray(writes, MAX_BATCH_WRITES)) {
        await request('/documents:commit', {
          method: 'POST',
          body: JSON.stringify({
            writes: chunk,
            ...(transaction === null ? {} : { transaction })
          })
        });
      }
    },

    async beginTransaction() {
      const body = await request('/documents:beginTransaction', {
        method: 'POST',
        body: JSON.stringify({ options: { readWrite: {} } })
      });

      if (typeof body.transaction !== 'string') {
        throw new Error('Firestore no devolvio transaction.');
      }

      return body.transaction;
    }
  };
}

function compositeFilter(filters) {
  if (filters.length === 1) {
    return fieldFilter(filters[0]);
  }

  return {
    compositeFilter: {
      op: 'AND',
      filters: filters.map((filter) => fieldFilter(filter))
    }
  };
}

function fieldFilter(filter) {
  return {
    fieldFilter: {
      field: { fieldPath: filter.fieldPath },
      op: filter.op,
      value: toFirestoreValue(filter.value)
    }
  };
}

async function getSyncState(firestore) {
  const doc = await firestore.getOptional(SYNC_CONFIG_PATH);
  const data = doc?.data ?? {};

  return {
    finalizadosCalculados: new Set(normalizeStringArray(data.finalizadosCalculados)),
    actualizadosPorPartido: normalizeDateRecord(data.actualizadosPorPartido)
  };
}

async function guardarSyncState(firestore, syncState, partidos, now) {
  if (partidos.length === 0) {
    return;
  }

  const actualizadosPorPartido = { ...syncState.actualizadosPorPartido };

  for (const partido of partidos) {
    actualizadosPorPartido[partido.id] = now;
  }

  await firestore.commit([
    updateWrite(
      firestore.nameFor(SYNC_CONFIG_PATH),
      {
        finalizadosCalculados: [...syncState.finalizadosCalculados],
        actualizadosPorPartido,
        actualizadoEn: now
      },
      ['finalizadosCalculados', 'actualizadosPorPartido', 'actualizadoEn']
    )
  ]);
}

async function listPronosticosPorPartidos(firestore, partidoIds) {
  const docs = await Promise.all(
    uniqueStrings(partidoIds).map((partidoId) =>
      firestore.queryCollection('pronosticos', [
        { fieldPath: 'partidoId', op: 'EQUAL', value: partidoId }
      ])
    )
  );

  return docs.flat();
}

async function listUsuariosPorIds(firestore, uids) {
  const docs = await Promise.all(
    uniqueStrings(uids).map((uid) => firestore.getOptional(`usuarios/${uid}`))
  );

  return docs.filter((doc) => doc !== null);
}

function uidsFromPronosticos(pronosticos) {
  return pronosticos
    .map((doc) => doc.data.uid)
    .filter((uid) => typeof uid === 'string' && uid.trim() !== '');
}

function uidsFromApuestas(apuestas) {
  return apuestas.flatMap((doc) => [doc.data.retador, doc.data.retado])
    .filter((uid) => typeof uid === 'string' && uid.trim() !== '');
}

async function listApuestasPendientesPartido(firestore, partidoId) {
  try {
    const docs = await firestore.queryCollection('apuestasDia', [
      { fieldPath: 'partidoId', op: 'EQUAL', value: partidoId }
    ]);

    return docs.filter((doc) => doc.data.resultado === 'pendiente');
  } catch {
    console.warn('No se pudieron leer apuestasDia.');
    return [];
  }
}

async function upsertPartidos(firestore, partidos) {
  if (partidos.length === 0) {
    return;
  }

  const writes = partidos.map((partido) =>
    updateWrite(firestore.nameFor(`partidos/${partido.id}`), partido, Object.keys(partido))
  );

  await firestore.commit(writes);
}

async function actualizarPuntosProvisionales({
  firestore,
  livePartidos,
  pronosticosByPartido,
  usuarios
}) {
  const provisionalByUid = new Map();
  const writes = [];

  for (const partido of livePartidos) {
    if (partido.golesLocal === null || partido.golesVisitante === null) {
      continue;
    }

    const pronosticos = pronosticosByPartido.get(partido.id) ?? [];

    for (const pronosticoDoc of pronosticos) {
      const puntos = calcularPuntosPronostico(pronosticoDoc.data, partido);
      provisionalByUid.set(
        pronosticoDoc.data.uid,
        (provisionalByUid.get(pronosticoDoc.data.uid) ?? 0) + puntos
      );
      writes.push(updateWrite(
        firestore.nameFor(`pronosticos/${pronosticoDoc.id}`),
        { puntosProvisionales: puntos },
        ['puntosProvisionales']
      ));
    }
  }

  for (const usuario of usuarios) {
    const definitivos = numberOrZero(usuario.data.puntos);
    const provisionales = provisionalByUid.get(usuario.id) ?? 0;

    writes.push(updateWrite(
      firestore.nameFor(`usuarios/${usuario.id}`),
      { puntosProvisionales: definitivos + provisionales },
      ['puntosProvisionales']
    ));
  }

  await firestore.commit(writes);
}

async function cerrarPartidoFinalizado({
  firestore,
  partido,
  partidos,
  pronosticos,
  pronosticosDelPartido,
  usuarios,
  apuestas
}) {
  if (partido.golesLocal === null || partido.golesVisitante === null) {
    console.warn(`Partido ${partido.id} finalizado sin marcador; se omite.`);
    return;
  }

  const transaction = await firestore.beginTransaction();
  const [partidoActual, syncActual] = await Promise.all([
    firestore.get(`partidos/${partido.id}`, transaction),
    firestore.getOptional(SYNC_CONFIG_PATH, transaction)
  ]);

  if (
    partidoActual?.data.puntosCalculados === true ||
    normalizeStringArray(syncActual?.data.finalizadosCalculados).includes(partido.id)
  ) {
    await marcarPartidoFinalizadoEnSync(firestore, syncActual, partido.id, transaction);
    console.log(`Partido ${partido.id} ya tenia puntosCalculados=true; se omite.`);
    return;
  }

  const writes = [];
  const puntosDefinitivosPorUid = new Map();

  for (const pronosticoDoc of pronosticosDelPartido) {
    const puntos = calcularPuntosPronostico(pronosticoDoc.data, partido);
    puntosDefinitivosPorUid.set(
      pronosticoDoc.data.uid,
      (puntosDefinitivosPorUid.get(pronosticoDoc.data.uid) ?? 0) + puntos
    );
    writes.push(updateWrite(
      firestore.nameFor(`pronosticos/${pronosticoDoc.id}`),
      {
        puntosGanados: puntos,
        puntosProvisionales: deleteField
      },
      ['puntosGanados', 'puntosProvisionales']
    ));
  }

  const apuestasWrites = await resolverApuestasPartido({
    firestore,
    partido,
    pronosticos,
    apuestas
  });
  writes.push(...apuestasWrites);

  const puntosUsuarios = sumarPuntosFinalizados(usuarios, puntosDefinitivosPorUid, apuestas);
  const badgesPorUsuario = calcularBadgesJornada({
    partido,
    partidos,
    pronosticos,
    usuarios,
    puntosDefinitivosPorUid
  });
  const rachasPorUsuario = calcularRachasPartido({
    pronosticosDelPartido,
    partido,
    usuarios
  });

  const jornadaKey = jornadaBadgeKey(partido);

  for (const usuario of usuarios) {
    const rachas = rachasPorUsuario.get(usuario.id) ?? rachasFromUsuario(usuario.data);
    const puntosNuevos = puntosUsuarios.get(usuario.id) ?? 0;

    const historialActual = Array.isArray(usuario.data.historialPuntos) ? usuario.data.historialPuntos : [];
    const idxHistorial = historialActual.findIndex((h) => h.jornadaKey === jornadaKey);
    const nuevoHistorial = [...historialActual];
    
    if (idxHistorial >= 0) {
      nuevoHistorial[idxHistorial] = { jornadaKey, puntos: puntosNuevos };
    } else {
      nuevoHistorial.push({ jornadaKey, puntos: puntosNuevos });
    }

    writes.push(updateWrite(
      firestore.nameFor(`usuarios/${usuario.id}`),
      {
        puntos: puntosNuevos,
        puntosProvisionales: puntosNuevos,
        badges: badgesPorUsuario.get(usuario.id) ?? normalizeStringArray(usuario.data.badges),
        rachaAciertos: rachas.rachaAciertos,
        rachaAciertosMaxima: rachas.rachaAciertosMaxima,
        rachaExactos: rachas.rachaExactos,
        rachaExactosMaxima: rachas.rachaExactosMaxima,
        historialPuntos: nuevoHistorial
      },
      [
        'puntos',
        'puntosProvisionales',
        'badges',
        'rachaAciertos',
        'rachaAciertosMaxima',
        'rachaExactos',
        'rachaExactosMaxima',
        'historialPuntos'
      ]
    ));
  }

  const medallasWrites = await calcularMedallasJornada({
    firestore,
    partido,
    partidos,
    pronosticos,
    puntosDefinitivosPorUid,
    usuarios
  });
  writes.push(...medallasWrites);

  writes.push(updateWrite(
    firestore.nameFor(`partidos/${partido.id}`),
    {
      ...partido,
      puntosCalculados: true
    },
    Object.keys(partido).concat('puntosCalculados')
  ));

  writes.push(syncFinalizadoWrite(firestore, syncActual, partido.id));

  await firestore.commit(writes, transaction);
  console.log(`Puntos definitivos calculados para partido ${partido.id}.`);
}

async function marcarPartidoFinalizadoEnSync(firestore, syncActual, partidoId, transaction) {
  await firestore.commit([
    syncFinalizadoWrite(firestore, syncActual, partidoId)
  ], transaction);
}

function syncFinalizadoWrite(firestore, syncActual, partidoId) {
  const finalizadosCalculados = uniqueStrings([
    ...normalizeStringArray(syncActual?.data.finalizadosCalculados),
    partidoId
  ]);
  const actualizadosPorPartido = {
    ...normalizeDateRecord(syncActual?.data.actualizadosPorPartido),
    [partidoId]: new Date()
  };

  return updateWrite(
    firestore.nameFor(SYNC_CONFIG_PATH),
    {
      finalizadosCalculados,
      actualizadosPorPartido,
      actualizadoEn: new Date()
    },
    ['finalizadosCalculados', 'actualizadosPorPartido', 'actualizadoEn']
  );
}

function sumarPuntosFinalizados(usuarios, puntosDefinitivosPorUid, apuestas) {
  const puntos = new Map();

  for (const usuario of usuarios) {
    puntos.set(usuario.id, numberOrZero(usuario.data.puntos) + numberOrZero(puntosDefinitivosPorUid.get(usuario.id)));
  }

  for (const apuestaDoc of apuestas) {
    if (apuestaDoc.data.porUnPuntoReal) {
      if (apuestaDoc.data.resultado === 'ganada') {
        puntos.set(apuestaDoc.data.retador, (puntos.get(apuestaDoc.data.retador) ?? 0) + 1);
        puntos.set(apuestaDoc.data.retado, (puntos.get(apuestaDoc.data.retado) ?? 0) - 1);
      } else if (apuestaDoc.data.resultado === 'perdida') {
        puntos.set(apuestaDoc.data.retador, (puntos.get(apuestaDoc.data.retador) ?? 0) - 1);
        puntos.set(apuestaDoc.data.retado, (puntos.get(apuestaDoc.data.retado) ?? 0) + 1);
      }
    }
  }

  return puntos;
}

function calcularRachasPartido({ pronosticosDelPartido, partido, usuarios }) {
  const rachasPorUsuario = new Map(
    usuarios.map((usuario) => [usuario.id, rachasFromUsuario(usuario.data)])
  );

  for (const pronosticoDoc of pronosticosDelPartido) {
    const uid = pronosticoDoc.data.uid;
    const puntos = calcularPuntosPronostico(pronosticoDoc.data, partido);
    const actual = rachasPorUsuario.get(uid) ?? rachasFromUsuario(undefined);
    rachasPorUsuario.set(uid, actualizarRachas(actual, puntos));
  }

  return rachasPorUsuario;
}

function calcularBadgesJornada({
  partido,
  partidos,
  pronosticos,
  usuarios,
  puntosDefinitivosPorUid
}) {
  const jornadaKey = jornadaBadgeKey(partido);
  const partidosJornada = partidos.filter((item) =>
    item.fase === partido.fase && String(item.jornada ?? '') === String(partido.jornada ?? '')
  );
  const idsJornada = new Set(partidosJornada.map((item) => item.id));
  const puntosJornada = new Map();
  const exactosJornada = new Map();

  for (const pronosticoDoc of pronosticos) {
    if (!idsJornada.has(pronosticoDoc.data.partidoId)) {
      continue;
    }

    const uid = pronosticoDoc.data.uid;
    const puntos = pronosticoDoc.data.partidoId === partido.id
      ? puntosDefinitivosPorUid.get(uid)
      : pronosticoDoc.data.puntosGanados;

    puntosJornada.set(uid, (puntosJornada.get(uid) ?? 0) + numberOrZero(puntos));

    if (puntos === 3) {
      exactosJornada.set(uid, (exactosJornada.get(uid) ?? 0) + 1);
    }
  }

  const maxPuntos = Math.max(0, ...puntosJornada.values());
  const maxExactos = Math.max(0, ...exactosJornada.values());
  const result = new Map();

  for (const usuario of usuarios) {
    const baseBadges = normalizeStringArray(usuario.data.badges)
      .filter((badge) => !badge.includes(jornadaKey));
    const nuevos = [];

    if ((puntosJornada.get(usuario.id) ?? 0) === maxPuntos && maxPuntos > 0) {
      nuevos.push(`🏆 ${jornadaKey}`);
    }

    if ((exactosJornada.get(usuario.id) ?? 0) === maxExactos && maxExactos > 0) {
      nuevos.push(`🎯 ${jornadaKey}`);
    }

    result.set(usuario.id, uniqueStrings([...baseBadges, ...nuevos]));
  }

  return result;
}

function cierreDeJornada(partido, partidos) {
  return idsPartidosJornada(partido, partidos).every((partidoId) =>
    partidoId === partido.id ||
    partidos.find((item) => item.id === partidoId)?.estado === 'finalizado'
  );
}

function idsPartidosJornada(partido, partidos) {
  return partidos
    .filter((item) =>
      item.fase === partido.fase &&
      String(item.jornada ?? '') === String(partido.jornada ?? '')
    )
    .map((item) => item.id);
}

/**
 * Calcula medallas de jornada al cerrar la última fecha de grupos.
 * Colección medallas: { jornada, tipo, uid }
 */
function esTitularUsuario(usuarioDoc) {
  return usuarioDoc.data.tipo !== 'invitado';
}

function titularesUidSet(usuarios) {
  return new Set(
    usuarios
      .filter((usuarioDoc) => esTitularUsuario(usuarioDoc))
      .map((usuarioDoc) => usuarioDoc.id)
  );
}

async function calcularMedallasJornada({
  firestore,
  partido,
  partidos,
  pronosticos,
  puntosDefinitivosPorUid,
  usuarios
}) {
  if (partido.fase !== 'grupos' || typeof partido.jornada !== 'number') {
    return [];
  }

  const jornadaKey = `J${partido.jornada}`;
  const partidosJornada = partidos.filter((item) =>
    item.fase === 'grupos' && item.jornada === partido.jornada
  );
  const todosFinalizados = partidosJornada.every((item) =>
    item.id === partido.id ? true : item.estado === 'finalizado'
  );

  if (!todosFinalizados) {
    return [];
  }

  const partidosPorId = new Map(partidosJornada.map((item) => [item.id, item]));
  const idsJornada = new Set(partidosJornada.map((item) => item.id));
  const uidsTitulares = titularesUidSet(usuarios);
  const exactosJornada = new Map();
  const arriesgadoJornada = new Map();
  const tibiosJornada = new Map();

  for (const pronosticoDoc of pronosticos) {
    if (!idsJornada.has(pronosticoDoc.data.partidoId)) {
      continue;
    }

    const uid = pronosticoDoc.data.uid;

    if (!uidsTitulares.has(uid)) {
      continue;
    }

    const partidoPronostico = partidosPorId.get(pronosticoDoc.data.partidoId);

    if (partidoPronostico === undefined) {
      continue;
    }

    const puntos = pronosticoDoc.data.partidoId === partido.id
      ? numberOrZero(puntosDefinitivosPorUid.get(uid))
      : numberOrZero(pronosticoDoc.data.puntosGanados);

    if (puntos === 3) {
      exactosJornada.set(uid, (exactosJornada.get(uid) ?? 0) + 1);
    }

    if (
      partidoPronostico.golesLocal !== null &&
      partidoPronostico.golesVisitante !== null
    ) {
      const diferencia =
        Math.abs(pronosticoDoc.data.golesLocal - partidoPronostico.golesLocal) +
        Math.abs(pronosticoDoc.data.golesVisitante - partidoPronostico.golesVisitante);
      const acumulado = arriesgadoJornada.get(uid) ?? { total: 0, count: 0 };
      arriesgadoJornada.set(uid, {
        total: acumulado.total + diferencia,
        count: acumulado.count + 1
      });
    }

    if (esPronosticoTibio(pronosticoDoc.data)) {
      tibiosJornada.set(uid, (tibiosJornada.get(uid) ?? 0) + 1);
    }
  }

  const promedioArriesgado = new Map(
    [...arriesgadoJornada.entries()].map(([uid, valor]) => [
      uid,
      valor.count > 0 ? valor.total / valor.count : 0
    ])
  );

  const medallas = [
    { tipo: 'mas_exacto', metricas: exactosJornada },
    { tipo: 'mas_arriesgado', metricas: promedioArriesgado },
    { tipo: 'mas_tibio', metricas: tibiosJornada }
  ];

  const writes = [];
  let medallasDocs;

  try {
    medallasDocs = await firestore.list('medallas');
  } catch {
    console.warn('No se pudieron leer medallas; se omiten medallas de jornada.');
    return [];
  }

  for (const medallaDoc of medallasDocs) {
    if (medallaDoc.data.jornada !== jornadaKey) {
      continue;
    }

    writes.push(deleteWrite(firestore.nameFor(`medallas/${medallaDoc.id}`)));
  }

  for (const medalla of medallas) {
    const ganadores = ganadoresPorMaximo(medalla.metricas);

    for (const uid of ganadores) {
      const docId = `${jornadaKey}_${medalla.tipo}_${uid}`;
      writes.push(updateWrite(
        firestore.nameFor(`medallas/${docId}`),
        {
          jornada: jornadaKey,
          tipo: medalla.tipo,
          uid
        },
        ['jornada', 'tipo', 'uid']
      ));
    }
  }

  return writes;
}

function ganadoresPorMaximo(metricas) {
  const maximo = Math.max(0, ...metricas.values());

  if (maximo <= 0) {
    return [];
  }

  return [...metricas.entries()]
    .filter(([, valor]) => valor === maximo)
    .map(([uid]) => uid);
}

function jornadaBadgeKey(partido) {
  const jornada = partido.jornada === null || partido.jornada === undefined
    ? partido.fase
    : partido.jornada;

  return `J${jornada}`;
}

async function resolverApuestasPartido({
  firestore,
  partido,
  pronosticos,
  apuestas
}) {
  if (apuestas.length === 0) {
    return [];
  }

  const pronosticosPartido = pronosticos.filter((doc) => doc.data.partidoId === partido.id);
  const writes = [];

  for (const apuestaDoc of apuestas) {
    if (apuestaDoc.data.partidoId !== partido.id || apuestaDoc.data.resultado !== 'pendiente') {
      continue;
    }

    const retador = pronosticosPartido.find((doc) => doc.data.uid === apuestaDoc.data.retador)?.data;
    const retado = pronosticosPartido.find((doc) => doc.data.uid === apuestaDoc.data.retado)?.data;
    const resultado = resultadoApuestaPartido(retador, retado, partido);

    apuestaDoc.data.resultado = resultado;

    writes.push(updateWrite(
      firestore.nameFor(`apuestasDia/${apuestaDoc.id}`),
      { resultado },
      ['resultado']
    ));

    console.log(`Apuesta ${apuestaDoc.id}: ${resultado}.`);
  }

  return writes;
}

function resultadoApuestaPartido(retador, retado, partido) {
  if (retador === undefined || retado === undefined) {
    return 'empatada';
  }

  const puntosRetador = calcularPuntosPronostico(retador, partido);
  const puntosRetado = calcularPuntosPronostico(retado, partido);

  if (puntosRetador === 0 && puntosRetado === 0) {
    return 'empatada';
  }

  if (puntosRetador > puntosRetado) {
    return 'ganada';
  }

  if (puntosRetador < puntosRetado) {
    return 'perdida';
  }

  const distanciaRetador = distanciaMarcador(retador, partido);
  const distanciaRetado = distanciaMarcador(retado, partido);

  if (distanciaRetador < distanciaRetado) {
    return 'ganada';
  }

  if (distanciaRetador > distanciaRetado) {
    return 'perdida';
  }

  return 'empatada';
}

function distanciaMarcador(pronostico, partido) {
  if (partido.golesLocal === null || partido.golesVisitante === null) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(numberOrZero(pronostico.golesLocal) - partido.golesLocal) +
    Math.abs(numberOrZero(pronostico.golesVisitante) - partido.golesVisitante);
}

/**
 * Resuelve las apuestasDia de una jornada de grupos cuando todos sus
 * partidos han finalizado. Solo actua sobre apuestas con resultado='pendiente'.
 * No otorga ni quita puntos — es puramente cosmético/social.
 *
 * @returns {Promise<object[]>} Writes de Firestore para incluir en el commit principal.
 */
async function resolverApuestasDiaLegacy({
  firestore,
  partido,
  pronosticos,
  apuestas
}) {
  // Solo aplica a fase de grupos con jornada numérica.
  if (partido.fase !== 'grupos' || typeof partido.jornada !== 'number') {
    return [];
  }

  const jornadaKey = `J${partido.jornada}`;

  // Verificar que TODOS los partidos de la jornada estén finalizados.
  const partidosJornada = partidos.filter((p) =>
    p.fase === 'grupos' && p.jornada === partido.jornada
  );
  const todosFinalizados = partidosJornada.every((p) =>
    p.id === partido.id ? true : p.estado === 'finalizado'
  );

  if (!todosFinalizados) {
    return [];
  }

  // Sumar puntos de jornada por usuario (incluyendo el partido que se acaba de cerrar).
  const idsJornada = new Set(partidosJornada.map((p) => p.id));
  const puntosJornada = new Map();

  for (const pronosticoDoc of pronosticos) {
    if (!idsJornada.has(pronosticoDoc.data.partidoId)) {
      continue;
    }

    const uid = pronosticoDoc.data.uid;
    const puntos = pronosticoDoc.data.partidoId === partido.id
      ? puntosDefinitivosPorUid.get(uid)
      : pronosticoDoc.data.puntosGanados;

    puntosJornada.set(uid, (puntosJornada.get(uid) ?? 0) + numberOrZero(puntos));
  }

  const apuestasPendientes = apuestas.filter((doc) =>
    doc.data.jornadaKey === jornadaKey && doc.data.resultado === 'pendiente'
  );
  const uidsTitulares = titularesUidSet(usuarios);
  const writes = [];

  for (const apuestaDoc of apuestasPendientes) {
    const retadorEsTitular = uidsTitulares.has(apuestaDoc.data.retador);
    const retadoEsTitular = uidsTitulares.has(apuestaDoc.data.retado);

    if (!retadorEsTitular || !retadoEsTitular) {
      continue;
    }

    const ptosRetador = puntosJornada.get(apuestaDoc.data.retador) ?? 0;
    const ptosRetado = puntosJornada.get(apuestaDoc.data.retado) ?? 0;

    let resultado = 'empatada';
    if (ptosRetador > ptosRetado) {
      resultado = 'ganada';
    } else if (ptosRetador < ptosRetado) {
      resultado = 'perdida';
    }

    apuestaDoc.data.resultado = resultado; // update in memory so it can be read by recalcularPuntosUsuarios

    writes.push(updateWrite(
      firestore.nameFor(`apuestasDia/${apuestaDoc.id}`),
      { resultado },
      ['resultado']
    ));

    console.log(`Apuesta ${apuestaDoc.id}: ${resultado} (retador ${ptosRetador} pts vs retado ${ptosRetado} pts).`);
  }

  return writes;
}

function partidoRequiereRevision(match, now) {
  if (liveEstados.has(match.status)) {
    return livePollProgramado(match, now);
  }

  if (!finalEstados.has(match.status)) {
    return false;
  }

  return finalPollProgramado(match, now);
}

function partidoDebeSincronizarse(match, syncState, now) {
  const inicio = parseDate(match.utcDate);
  const partidoId = String(match.id);

  if (finalEstados.has(match.status)) {
    if (syncState.finalizadosCalculados.has(partidoId)) {
      return false;
    }

    return finalPollProgramado(match, now);
  }

  if (!liveEstados.has(match.status)) {
    return false;
  }

  return inicio === null ||
    now.getTime() >= inicio.getTime() + FIRST_LIVE_SYNC_DELAY_MS;
}

function finalReferenceDate(match) {
  return parseDate(match.lastUpdated) ?? parseDate(match.utcDate);
}

function livePollProgramado(match, now) {
  const inicio = parseDate(match.utcDate);

  if (inicio === null) {
    return true;
  }

  const elapsed = now.getTime() - inicio.getTime() - FIRST_LIVE_SYNC_DELAY_MS;

  if (elapsed < 0) {
    return false;
  }

  return elapsed % LIVE_SYNC_INTERVAL_MS <= POLL_WINDOW_MS;
}

function finalPollProgramado(match, now) {
  const referenciaFinal = finalReferenceDate(match);

  if (referenciaFinal === null) {
    return true;
  }

  const elapsed = now.getTime() - referenciaFinal.getTime();

  return elapsed >= FINAL_SYNC_DELAY_MS &&
    elapsed <= FINAL_SYNC_WINDOW_MS;
}

function parseDate(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPartidoDoc(match, syncState, now = new Date()) {
  const score = marcadorActual(match.score);
  const estado = mapEstado(match.status);
  const partidoId = String(match.id);

  return {
    id: partidoId,
    footballDataId: match.id,
    equipoLocal: teamName(match.homeTeam),
    equipoVisitante: teamName(match.awayTeam),
    banderas: {
      local: teamFlag(match.homeTeam),
      visitante: teamFlag(match.awayTeam)
    },
    fechaInicio: new Date(match.utcDate),
    estado,
    golesLocal: score.local,
    golesVisitante: score.visitante,
    fase: mapFase(match.stage),
    jornada: match.matchday ?? match.group ?? match.stage ?? null,
    puntosCalculados: syncState.finalizadosCalculados.has(partidoId),
    syncActualizadoEn: now
  };
}

function mapEstado(status) {
  if (liveEstados.has(status)) {
    return 'en_juego';
  }

  if (finalEstados.has(status)) {
    return 'finalizado';
  }

  return 'programado';
}

function mapFase(stage) {
  const stages = {
    GROUP_STAGE: 'grupos',
    LAST_32: 'dieciseisavos',
    ROUND_OF_32: 'dieciseisavos',
    LAST_16: 'octavos',
    ROUND_OF_16: 'octavos',
    QUARTER_FINALS: 'cuartos',
    SEMI_FINALS: 'semifinales',
    THIRD_PLACE: 'tercer_lugar',
    FINAL: 'final'
  };

  return stages[stage] ?? 'grupos';
}

function marcadorActual(score) {
  const candidates = [
    score?.fullTime,
    score?.regularTime,
    score?.halfTime
  ];

  for (const candidate of candidates) {
    const local = numberOrNull(candidate?.home);
    const visitante = numberOrNull(candidate?.away);

    if (local !== null && visitante !== null) {
      return { local, visitante };
    }
  }

  return { local: null, visitante: null };
}

function teamName(team) {
  return team?.shortName || team?.name || team?.tla || 'Por definir';
}

function teamFlag(team) {
  const crest = team?.crest;

  if (typeof crest === 'string' && crest.startsWith('https://')) {
    return crest;
  }

  return '';
}

function deleteWrite(name) {
  return { delete: name };
}

function updateWrite(name, data, fieldPaths) {
  const fields = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === deleteField) {
      continue;
    }

    fields[key] = toFirestoreValue(value);
  }

  return {
    update: { name, fields },
    updateMask: { fieldPaths }
  };
}

function toFirestoreValue(value) {
  if (value === null) {
    return { nullValue: null };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  }

  switch (typeof value) {
    case 'string':
      return { stringValue: value };
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case 'object': {
      const fields = {};

      for (const [key, nested] of Object.entries(value)) {
        fields[key] = toFirestoreValue(nested);
      }

      return { mapValue: { fields } };
    }
    default:
      throw new Error(`Valor no soportado para Firestore: ${String(value)}`);
  }
}

function fromDocument(document) {
  const parts = document.name.split('/');

  return {
    id: parts.at(-1),
    name: document.name,
    data: fromFields(document.fields ?? {})
  };
}

function fromFields(fields) {
  const result = {};

  for (const [key, value] of Object.entries(fields)) {
    result[key] = fromFirestoreValue(value);
  }

  return result;
}

function fromFirestoreValue(value) {
  if ('nullValue' in value) {
    return null;
  }

  if ('stringValue' in value) {
    return value.stringValue;
  }

  if ('integerValue' in value) {
    return Number(value.integerValue);
  }

  if ('doubleValue' in value) {
    return Number(value.doubleValue);
  }

  if ('booleanValue' in value) {
    return value.booleanValue;
  }

  if ('timestampValue' in value) {
    return new Date(value.timestampValue);
  }

  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map((item) => fromFirestoreValue(item));
  }

  if ('mapValue' in value) {
    return fromFields(value.mapValue.fields ?? {});
  }

  return undefined;
}

function groupBy(items, getKey) {
  const grouped = new Map();

  for (const item of items) {
    const key = getKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return grouped;
}

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function numberOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string')
    : [];
}

function normalizeDateRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, item instanceof Date ? item : parseDate(String(item))])
      .filter(([, item]) => item !== null)
  );
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

async function main() {
  loadProjectEnv();
  const footballDataToken = requiredEnv('FOOTBALL_DATA_TOKEN');
  const serviceAccount = parseServiceAccount(readFirebaseServiceAccountRaw());
  const accessToken = await createAccessToken(serviceAccount);

  await runActualizarResultados({
    footballDataToken,
    projectId: serviceAccount.project_id,
    accessToken
  });
}

const entryPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';

if (entryPath === invokedPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
