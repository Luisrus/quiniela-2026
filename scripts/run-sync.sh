#!/usr/bin/env bash
# Cron recomendado: */5 * * * * cd /ruta/al/Quiniela && ./scripts/run-sync.sh
# Ver SERVER_SYNC_JOB.md para configurar el servidor.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${QUINIELA_NODE:-node}"
LOG_DIR="${QUINIELA_LOG_DIR:-$ROOT/logs}"
LOCK_FILE="${QUINIELA_SYNC_LOCK:-/tmp/quiniela-sync.lock}"
LOG_FILE="$LOG_DIR/sync-$(date +%Y%m%d).log"
ENV_FILE="${QUINIELA_ENV_FILE:-$ROOT/.env}"

mkdir -p "$LOG_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -Is) sync ya en ejecucion, se omite." >> "$LOG_FILE"
  exit 0
fi

cd "$ROOT"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

{
  echo "=== $(date -Is) sync iniciado ==="
  "$NODE" scripts/actualizar-resultados.mjs
  echo "=== $(date -Is) sync terminado ==="
} >> "$LOG_FILE" 2>&1
