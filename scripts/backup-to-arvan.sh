#!/usr/bin/env bash
# Daily backup of production Postgres + app secrets/config to Arvan Object Storage.
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
ENDPOINT_URL="${S3_ENDPOINT_URL:-https://s3.ir-thr-at1.arvanstorage.ir}"
REGION="${AWS_DEFAULT_REGION:-ir-thr-at1}"
PREFIX="${S3_PREFIX:-daily}"
APP_DIR="${APP_DIR:-/opt/rooberah/app}"
DB_NAME="${DB_NAME:-rooberah}"
LOG_FILE="${BACKUP_LOG:-/var/log/rooberah-backup.log}"

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION="$REGION"
export AWS_EC2_METADATA_DISABLED=true

STAMP="$(TZ=Asia/Tehran date +%Y%m%d-%H%M%S)"
WORK="$(mktemp -d)"
ARCHIVE=""
trap 'rm -rf "$WORK"; rm -f "$ARCHIVE"' EXIT

log() {
  echo "$(TZ=Asia/Tehran date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"
}

s3() {
  aws --endpoint-url "$ENDPOINT_URL" --region "$REGION" \
    --cli-connect-timeout 30 --cli-read-timeout 120 "$@"
}

ensure_path_style() {
  mkdir -p /root/.aws
  if ! grep -q "addressing_style" /root/.aws/config 2>/dev/null; then
    cat > /root/.aws/config <<'EOF'
[default]
region = ir-thr-at1
s3 =
    addressing_style = path
    signature_version = s3v4
EOF
    chmod 600 /root/.aws/config
  fi
}

ensure_bucket() {
  if s3 s3api head-bucket --bucket "$S3_BUCKET" >/dev/null 2>&1; then
    return 0
  fi
  if s3 s3api create-bucket --bucket "$S3_BUCKET" --create-bucket-configuration LocationConstraint="$REGION" >/dev/null 2>&1; then
    return 0
  fi
  s3 s3api create-bucket --bucket "$S3_BUCKET" >/dev/null
}

collect() {
  local dest="$1"
  mkdir -p "$dest"

  if command -v sudo >/dev/null && id postgres >/dev/null 2>&1; then
    sudo -u postgres pg_dump -d "$DB_NAME" -F c -f "$dest/database.dump"
    sudo -u postgres pg_dump -d "$DB_NAME" | gzip -9 > "$dest/database.sql.gz"
  else
    pg_dump -d "$DB_NAME" -F c -f "$dest/database.dump"
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
    if [[ -d "$APP_DIR/.git" ]]; then
      echo "git=$(git -C "$APP_DIR" log -1 --oneline)"
    fi
  } > "$dest/MANIFEST.txt"
}

prune() {
  local keys=()
  mapfile -t keys < <(
    s3 s3 ls "s3://${S3_BUCKET}/${PREFIX}/" \
      | awk '/rooberah-.*\.tar\.gz$/ { print $4 }' \
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
    s3 s3 rm "s3://${S3_BUCKET}/${PREFIX}/${keys[$i]}"
  done
}

main() {
  mkdir -p "$(dirname "$LOG_FILE")"
  log "backup start $STAMP"
  ensure_path_style
  ensure_bucket

  local folder="$WORK/rooberah-$STAMP"
  collect "$folder"

  ARCHIVE="/tmp/rooberah-$STAMP.tar.gz"
  tar -C "$WORK" -czf "$ARCHIVE" "rooberah-$STAMP"
  local size
  size="$(du -h "$ARCHIVE" | awk '{ print $1 }')"

  s3 s3 cp "$ARCHIVE" "s3://${S3_BUCKET}/${PREFIX}/rooberah-${STAMP}.tar.gz"
  log "uploaded ${PREFIX}/rooberah-${STAMP}.tar.gz ($size)"
  prune
  log "backup done"
}

main
