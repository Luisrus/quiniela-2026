#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${QUINIELA_LOG_DIR:-$ROOT/logs}"
LOCK_FILE="${QUINIELA_SYNC_LOCK:-/tmp/quiniela-sync.lock}"
LOG_FILE="$LOG_DIR/sync-$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -Is) sync ya en ejecucion, se omite." >> "$LOG_FILE"
  exit 0
fi

cd "$ROOT"

{
  echo "=== $(date -Is) sync iniciado ==="
  node scripts/actualizar-resultados.mjs
  echo "=== $(date -Is) sync terminado ==="
} >> "$LOG_FILE" 2>&1
