# Deploy — lo que te toca a ti

El proyecto ya tiene scripts, plantillas y CI preparados. Solo faltan estos pasos manuales.

## 1. Configurar credenciales locales (una vez)

### A) Migrar desde lo que ya tienes (recomendado)

```powershell
npm run env:migrate
```

Eso crea `.env` leyendo tu `environment.development.ts`, `tokenfootball.txt` y el JSON del service account.

### B) Manual

Copia tus valores de Firebase a `.env`:

```powershell
Copy-Item .env.example .env
# Edita .env con Notepad o tu editor
```

Usa los mismos datos que ya tienes en `environment.development.ts`. Ejemplo de estructura:

```env
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=rus-quiniela.firebaseapp.com
FIREBASE_PROJECT_ID=rus-quiniela
FIREBASE_STORAGE_BUCKET=rus-quiniela.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
FIREBASE_VAPID_KEY=...

FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FOOTBALL_DATA_TOKEN=...
```

El token de Football-Data lo puedes copiar desde `tokenfootball.txt`.

### C) Regenerar environments desde `.env`

```powershell
npm run env:development
npm run env:production
```

---

## 2. Subir a GitLab (una vez)

1. Crea un proyecto vacio en GitLab (sin README).
2. En tu PC:

```powershell
cd C:\Users\Bass\Documents\Quiniela
git add .
git status
```

(Git ya esta inicializado en `main`.)

**Antes del commit**, verifica que NO aparezcan:
- `.env`
- `environment.development.ts`
- `tokenfootball.txt`
- archivos `*firebase-adminsdk*.json`

3. Primer commit y push:

```powershell
git commit -m "Initial commit: quiniela Mundial 2026"
git remote add origin https://gitlab.com/TU_USUARIO/quiniela.git
git push -u origin main
```

Si pide contraseña, usa un **Personal Access Token** de GitLab (scope `write_repository`).

---

## 3. Variables en GitLab CI/CD (una vez)

Ve a **Settings → CI/CD → Variables** y agrega:

| Variable | Masked | Protected | Valor |
|---|---|---|---|
| `FIREBASE_API_KEY` | si | si | Firebase Console |
| `FIREBASE_AUTH_DOMAIN` | no | si | `rus-quiniela.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | no | si | `rus-quiniela` |
| `FIREBASE_STORAGE_BUCKET` | no | si | `rus-quiniela.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | si | si | Firebase Console |
| `FIREBASE_APP_ID` | si | si | Firebase Console |
| `FIREBASE_VAPID_KEY` | si | si | Firebase Console (Cloud Messaging) |
| `FIREBASE_TOKEN` | si | si | Ver paso 4 |
| `FIREBASE_SERVICE_ACCOUNT` | si | si | JSON del service account |
| `FOOTBALL_DATA_TOKEN` | si | si | Token Football-Data |

---

## 4. Token de deploy para Firebase (una vez)

```powershell
npm install -g firebase-tools
firebase login
firebase login:ci
```

Copia el token que imprime y pegalo en GitLab como `FIREBASE_TOKEN`.

---

## 5. Deploy automatico

Cada push a `main` dispara el pipeline:

1. Genera `environment.ts` desde variables de CI.
2. Hace `npm run build`.
3. Publica en Firebase Hosting.

La URL queda en:

- **https://rus-quiniela.web.app**
- **https://rus-quiniela.firebaseapp.com**

---

## 6. Tareas programadas (opcional)

En GitLab: **Build → Pipeline schedules → New schedule**

- Rama: `main`
- Cron: `*/10 * * * *`
- Activo

Eso ejecuta `actualizar-resultados` y `recordar-pronosticos` cada 10 minutos.

---

## 7. Deploy manual desde tu PC (alternativa)

Si prefieres no usar CI para hosting:

```powershell
npm run env:production
npm run build
firebase deploy --only hosting,firestore:rules
```

---

## 8. Mandar el link a tus primos

Comparte: **https://rus-quiniela.web.app**

Verifica en Firebase Console:

- **Authentication → Settings → Authorized domains** incluye `rus-quiniela.web.app`
- **Firestore rules** desplegadas (`firebase deploy --only firestore:rules`)

---

## Comandos utiles

| Comando | Para que sirve |
|---|---|
| `npm run env:migrate` | Crea `.env` desde tus archivos locales actuales |
| `npm run setup:local` | Crea `.env` y plantillas si no existen |
| `npm run env:development` | Genera environment de dev desde `.env` |
| `npm run env:production` | Genera environment de prod desde `.env` |
| `npm start` | Desarrollo local |
| `npm run deploy:hosting` | Build + deploy manual a Firebase |
