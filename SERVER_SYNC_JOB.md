# Job de sync en el servidor

Guía para actualizar el cron que sincroniza resultados (Football-Data → Firestore).

## Qué cambió

Antes el script leía Firestore en cada tick (ventana fija 10:00–01:59 + query de partidos `en_juego`).

Ahora el flujo es:

1. **Radar (solo Football-Data)** — 0 reads de Firestore.
2. **Job completo** — solo si hay partido en vivo o recién finalizado en ventana de sync.

El cron puede correr **cada 5 minutos** sin penalizar la cuota de Firestore en días/horas sin actividad.

## Requisitos en el servidor

- Node.js 22+ (o la misma versión que uses en el repo).
- Repo clonado y actualizado (`git pull`).
- Variables de entorno (archivo `.env` o exportadas en el cron):

| Variable | Obligatoria | Uso |
|---|---|---|
| `FOOTBALL_DATA_TOKEN` | Sí | Radar + sync |
| `FIREBASE_SERVICE_ACCOUNT_FILE` o `FIREBASE_SERVICE_ACCOUNT` | Sí | Solo cuando hay trabajo pendiente |

## Probar manualmente

Desde la raíz del repo:

```bash
# Solo radar (0 reads Firestore)
npm run probe-partidos

# Sync completo (radar + Firestore si aplica)
npm run actualizar-resultados

# Forzar sync aunque el radar no vea ventana activa
SYNC_FORCE=1 npm run actualizar-resultados
```

Salida esperada cuando no hay partidos activos:

```json
{"estado":"omitido","motivo":"sin_partidos_en_ventana_api",...}
```

Logs del wrapper:

```bash
tail -f logs/sync-$(date +%Y%m%d).log
```

## Actualizar el cron

Editar crontab del usuario que corre el sync:

```bash
crontab -e
```

Entrada recomendada (cada 5 minutos, hora del servidor):

```cron
*/5 * * * * cd /ruta/al/Quiniela && ./scripts/run-sync.sh
```

Ajusta `/ruta/al/Quiniela` al path real del clone en tu VPS.

Si el cron no carga `.env`, exporta variables en el wrapper o en la línea del cron:

```cron
*/5 * * * * cd /ruta/al/Quiniela && set -a && . ./.env && set +a && ./scripts/run-sync.sh
```

## Prompt sugerido para Codex en el servidor

Copia y pega esto en Codex con el repo ya actualizado:

```
Lee SERVER_SYNC_JOB.md en la raíz del repo.

Tareas:
1. Verifica que existan FOOTBALL_DATA_TOKEN y FIREBASE_SERVICE_ACCOUNT (o FIREBASE_SERVICE_ACCOUNT_FILE) en .env.
2. Ejecuta `npm run probe-partidos` y confirma que responde JSON con estado omitido o activo.
3. Revisa `crontab -l` y actualiza el job para que ejecute `./scripts/run-sync.sh` cada 5 minutos desde el path correcto del clone.
4. Si el cron no lee .env, ajusta run-sync.sh o la línea del cron para cargar las variables.
5. Muestra el crontab final y la última línea del log en logs/sync-YYYYMMDD.log.
```

## Cuándo sí toca Firestore

| Situación | Firestore |
|---|---|
| Sin partidos en ventana (radar) | 0 reads |
| Partido en vivo en ventana de poll | Sync + puntos provisionales |
| Partido finalizado hace 5–20 min | Cierre + cálculo de puntos |
| `--days=YYYY-MM-DD` o `SYNC_FORCE=1` | Sync manual/forzado |

## Ventanas de sync (por partido, vía API)

| Evento | Cuándo corre el job |
|---|---|
| En vivo | 5 min después del inicio; luego cada ~30 min |
| Finalizado | Entre 5 y 20 min después del cierre |

Zona horaria del calendario: `America/Guatemala`.

## Rollback

Si necesitas volver al cron anterior (cada 10 min), cambia la expresión cron a:

```cron
*/10 * * * * cd /ruta/al/Quiniela && ./scripts/run-sync.sh
```

El script sigue siendo compatible; solo cambia la frecuencia recomendada.
