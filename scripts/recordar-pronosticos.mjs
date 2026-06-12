/**
 * Recordatorios push FCM: 1 hora antes del primer partido sin pronóstico de cada usuario.
 *
 * Variables de entorno (GitLab CI → Settings → CI/CD → Variables):
 * - FIREBASE_SERVICE_ACCOUNT (masked/protected): JSON o base64 del service account.
 *   Debe tener permisos de Firestore y Firebase Cloud Messaging (rol
 *   "Firebase Cloud Messaging Admin" o "Firebase Admin SDK Administrator").
 *
 * Programación recomendada en GitLab:
 * - Build → Pipeline schedules → cron cada 5-10 min (ej. */5 * * * *)
 * - Mismo schedule que actualizar-resultados; este job corre en paralelo.
 *
 * Firebase Console (una vez):
 * - Habilitar Cloud Messaging API en Google Cloud.
 * - Generar par de claves Web Push (VAPID) para la app web.
 */
import { createSign } from 'node:crypto';

import { loadProjectEnv, readFirebaseServiceAccountRaw } from './project-env.mjs';

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DATABASE_ID = '(default)';
const MAX_BATCH_WRITES = 450;
const UNA_HORA_MS = 60 * 60 * 1000;
const MARGEN_MS = 5 * 60 * 1000;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  loadProjectEnv();
  const serviceAccount = parseServiceAccount(readFirebaseServiceAccountRaw());
  const accessToken = await createAccessToken(serviceAccount);
  const firestore = createFirestoreClient(serviceAccount.project_id, accessToken);

  const [partidosDocs, pronosticosDocs, usuariosDocs, recordatoriosDocs] = await Promise.all([
    firestore.list('partidos'),
    firestore.list('pronosticos'),
    firestore.list('usuarios'),
    firestore.list('recordatoriosEnviados')
  ]);

  const ahora = Date.now();
  const recordatoriosEnviados = new Set(recordatoriosDocs.map((doc) => doc.id));
  const pronosticosPorUid = groupPronosticosPorUid(pronosticosDocs);
  const partidosProgramados = partidosDocs
    .map((doc) => ({ id: doc.id, ...doc.data }))
    .filter((partido) => partido.estado === 'programado' && partido.fechaInicio instanceof Date)
    .filter((partido) => partido.fechaInicio.getTime() > ahora)
    .sort((left, right) => left.fechaInicio.getTime() - right.fechaInicio.getTime());

  let enviados = 0;
  const writes = [];

  for (const usuarioDoc of usuariosDocs) {
    const fcmToken = usuarioDoc.data.fcmToken;

    if (typeof fcmToken !== 'string' || fcmToken.trim() === '') {
      continue;
    }

    const partidosSinPronostico = partidosProgramados.filter((partido) =>
      !(pronosticosPorUid.get(usuarioDoc.id) ?? new Set()).has(partido.id)
    );
    const proximoPartido = partidosSinPronostico[0];

    if (proximoPartido === undefined) {
      continue;
    }

    const msHastaPartido = proximoPartido.fechaInicio.getTime() - ahora;
    const enVentana = msHastaPartido >= UNA_HORA_MS - MARGEN_MS &&
      msHastaPartido <= UNA_HORA_MS + MARGEN_MS;

    if (!enVentana) {
      continue;
    }

    const recordatorioId = `${usuarioDoc.id}_${proximoPartido.id}`;

    if (recordatoriosEnviados.has(recordatorioId)) {
      continue;
    }

    await sendFcmMessage({
      projectId: serviceAccount.project_id,
      accessToken,
      token: fcmToken,
      title: 'Quiniela',
      body: '¡Falta poco para que cierre el plazo!',
      url: '/partidos'
    });

    writes.push(updateWrite(
      firestore.nameFor(`recordatoriosEnviados/${recordatorioId}`),
      {
        uid: usuarioDoc.id,
        partidoId: proximoPartido.id,
        enviadoEn: new Date()
      },
      ['uid', 'partidoId', 'enviadoEn']
    ));

    enviados += 1;
    console.log(`Recordatorio enviado a ${usuarioDoc.id} para partido ${proximoPartido.id}.`);
  }

  if (writes.length > 0) {
    await firestore.commit(writes);
  }

  console.log(JSON.stringify({
    usuariosConToken: usuariosDocs.filter((doc) => typeof doc.data.fcmToken === 'string').length,
    recordatoriosEnviados: enviados
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
    scope: `${FIRESTORE_SCOPE} ${MESSAGING_SCOPE}`,
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

async function sendFcmMessage({ projectId, accessToken, token, title, body, url }) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { url },
          webpush: {
            fcmOptions: { link: url }
          }
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`FCM fallo: ${response.status} ${await response.text()}`);
  }
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

    async commit(writes) {
      for (const chunk of chunkArray(writes, MAX_BATCH_WRITES)) {
        await request('/documents:commit', {
          method: 'POST',
          body: JSON.stringify({ writes: chunk })
        });
      }
    }
  };
}

function groupPronosticosPorUid(pronosticosDocs) {
  const grouped = new Map();

  for (const pronosticoDoc of pronosticosDocs) {
    const uid = pronosticoDoc.data.uid;
    const partidos = grouped.get(uid) ?? new Set();
    partidos.add(pronosticoDoc.data.partidoId);
    grouped.set(uid, partidos);
  }

  return grouped;
}

function updateWrite(name, data, fieldPaths) {
  const fields = {};

  for (const [key, value] of Object.entries(data)) {
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

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function base64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  return buffer
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
