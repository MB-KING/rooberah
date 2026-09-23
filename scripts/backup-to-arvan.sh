#!/usr/bin/env bash
# Daily backup of production Postgres + app secrets/config to Arvan Object Storage.
# Uploads to https://rooberah.s3.ir-thr-at1.arvanstorage.ir/daily/
# Credentials live only on the VPS: /etc/rooberah/backup.env
set -euo pipefail
umask 077

CONFIG="${BACKUP_CONFIG:-/etc/rooberah/backup.env}"
if [[ ! -f "$CONFIG" ]]; then
  echo "missing $CONFIG" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a
. "$CONFIG"
set +a

: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

S3_BUCKET="${S3_BUCKET:-rooberah}"
KEEP="${BACKUP_KEEP:-2}"
ENDPOINT="${S3_ENDPOINT:-s3.ir-thr-at1.arvanstorage.ir}"
ENDPOINT="${ENDPOINT#https://}"
ENDPOINT="${ENDPOINT#http://}"
REGION="${AWS_DEFAULT_REGION:-ir-thr-at1}"
PREFIX="${S3_PREFIX:-daily}"
APP_DIR="${APP_DIR:-/opt/rooberah/app}"
DB_NAME="${DB_NAME:-rooberah}"
LOG_FILE="${BACKUP_LOG:-/var/log/rooberah-backup.log}"
RCLONE_CONF="${RCLONE_CONFIG_FILE:-/etc/rooberah/rclone.conf}"

STAMP="$(TZ=Asia/Tehran date +%Y%m%d-%H%M%S)"
WORK="$(mktemp -d)"
ARCHIVE=""
trap 'rm -rf "$WORK"; rm -f "$ARCHIVE"' EXIT

log() {
  echo "$(TZ=Asia/Tehran date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"
}

write_rclone_config() {
  cat > "$RCLONE_CONF" <<EOF
[arvan]
type = s3
provider = Other
env_auth = false
access_key_id = ${AWS_ACCESS_KEY_ID}
secret_access_key = ${AWS_SECRET_ACCESS_KEY}
endpoint = ${ENDPOINT}
region = ${REGION}
location_constraint = ${REGION}
acl = private
force_path_style = true
disable_http2 = true
EOF
  chmod 600 "$RCLONE_CONF"
}

remote() {
  rclone --config "$RCLONE_CONF" "$@"
}

collect() {
  local dest="$1"
  mkdir -p "$dest"

  if command -v sudo >/dev/null && id postgres >/dev/null 2>&1; then
    sudo -u postgres pg_dump -d "$DB_NAME" -F c > "$dest/database.dump"
    sudo -u postgres pg_dump -d "$DB_NAME" | gzip -9 > "$dest/database.sql.gz"
  else
    pg_dump -d "$DB_NAME" -F c > "$dest/database.dump"
    pg_dump -d "$DB_NAME" | gzip -9 > "$dest/database.sql.gz"
  fi

  if [[ -f "$APP_DIR/.env" ]]; then
    cp "$APP_DIR/.env" "$dest/app.env"
  fi
  if [[ -f /etc/caddy/Caddyfile ]]; then
    cp /etc/caddy/Caddyfile "$dest/Caddyfile"
  fi
  crontab -l > "$dest/root.crontab" 2>/dev/null || true
  if command -v pm2 >/dev/null; then
    pm2 jlist > "$dest/pm2.json" 2>/dev/null || true
  fi

  {
    echo "stamp=$STAMP"
    echo "host=$(hostname -f 2>/dev/null || hostname)"
    echo "app=$APP_DIR"
    echo "target=https://${S3_BUCKET}.${ENDPOINT}/${PREFIX}/"
    if [[ -d "$APP_DIR/.git" ]]; then
      echo "git=$(git -C "$APP_DIR" log -1 --oneline)"
    fi
  } > "$dest/MANIFEST.txt"
}

prune() {
  local keys=()
  mapfile -t keys < <(
    remote lsf "arvan:${S3_BUCKET}/${PREFIX}/" \
      | awk '/^rooberah-.*\.tar\.gz$/ { print $1 }' \
      | sort
  )
  local count="${#keys[@]}"
  if (( count <= KEEP )); then
    log "keep $count backup(s); nothing to prune"
    return 0
  fi
  local drop=$((count - KEEP))
  local i
  for (( i = 0; i < drop; i++ )); do
    log "delete old backup ${keys[$i]}"
    remote deletefile "arvan:${S3_BUCKET}/${PREFIX}/${keys[$i]}"
  done
}

main() {
  mkdir -p "$(dirname "$LOG_FILE")" /etc/rooberah
  log "backup start $STAMP"
  write_rclone_config

  local folder="$WORK/rooberah-$STAMP"
  collect "$folder"

  ARCHIVE="/tmp/rooberah-$STAMP.tar.gz"
  tar -C "$WORK" -czf "$ARCHIVE" "rooberah-$STAMP"
  local size
  size="$(du -h "$ARCHIVE" | awk '{ print $1 }')"

  remote copyto "$ARCHIVE" "arvan:${S3_BUCKET}/${PREFIX}/rooberah-${STAMP}.tar.gz"
  log "uploaded https://${S3_BUCKET}.${ENDPOINT}/${PREFIX}/rooberah-${STAMP}.tar.gz ($size)"
  prune
  log "backup done"
}

main
