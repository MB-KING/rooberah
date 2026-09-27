#!/usr/bin/env bash
# Restore a rooberah backup onto a fresh Ubuntu server.
# Usage: bash restore-from-arvan.sh /path/to/rooberah-YYYYMMDD-HHMMSS.tar.gz
# The archive is the one uploaded to arvan:rooberah/daily/.
set -euo pipefail
umask 077

ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
  echo "usage: $0 /path/to/rooberah-YYYYMMDD-HHMMSS.tar.gz" >&2
  exit 1
fi

APP_DIR=/opt/rooberah/app
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

tar -xzf "$ARCHIVE" -C "$WORK"
SRC="$(find "$WORK" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [[ ! -f "$SRC/database.dump" || ! -f "$SRC/app.env" ]]; then
  echo "backup archive is missing database.dump or app.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. "$SRC/app.env"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL missing from app.env" >&2
  exit 1
fi

DB_USER="$(python3 - <<'PY'
import os
from urllib.parse import urlparse
u = urlparse(os.environ["DATABASE_URL"])
print(u.username or "")
PY
)"
DB_PASS="$(python3 - <<'PY'
import os
from urllib.parse import unquote, urlparse
u = urlparse(os.environ["DATABASE_URL"])
print(unquote(u.password or ""))
PY
)"
DB_NAME="$(python3 - <<'PY'
import os
from urllib.parse import urlparse
u = urlparse(os.environ["DATABASE_URL"])
print((u.path or "/rooberah").lstrip("/").split("?")[0])
PY
)"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq postgresql postgresql-contrib caddy git curl ca-certificates

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

python3 - "$DB_USER" "$DB_NAME" "$DB_PASS" <<'PY' > /tmp/rooberah-init-db.sql
import sys
user, name, password = sys.argv[1:]
tag = "rbk"
while f"${tag}$" in password:
    tag += "x"
quoted = f"${tag}${password}${tag}$"
print(f"""
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{user}') THEN
    CREATE ROLE "{user}" LOGIN PASSWORD {quoted};
  ELSE
    ALTER ROLE "{user}" WITH LOGIN PASSWORD {quoted};
  END IF;
END
$$;
""")
print(f"SELECT 'CREATE DATABASE \"{name}\" OWNER \"{user}\"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '{name}')\\gexec")
print(f'GRANT ALL PRIVILEGES ON DATABASE "{name}" TO "{user}";')
PY
sudo -u postgres psql -v ON_ERROR_STOP=1 -f - < /tmp/rooberah-init-db.sql
rm -f /tmp/rooberah-init-db.sql

chmod a+rx "$WORK" "$SRC"
chmod a+r "$SRC/database.dump"
sudo -u postgres pg_restore --no-owner --no-acl -d "$DB_NAME" "$SRC/database.dump"
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "GRANT ALL ON SCHEMA public TO \"${DB_USER}\"; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"${DB_USER}\"; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"${DB_USER}\";"

mkdir -p /opt/rooberah
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone https://github.com/MB-KING/rooberah.git "$APP_DIR"
fi
git -C "$APP_DIR" fetch origin
git -C "$APP_DIR" checkout main
git -C "$APP_DIR" reset --hard origin/main

install -m 600 "$SRC/app.env" "$APP_DIR/.env"
if [[ -f "$SRC/Caddyfile" ]]; then
  install -m 644 "$SRC/Caddyfile" /etc/caddy/Caddyfile
fi

cd "$APP_DIR"
export NODE_OPTIONS=--max-old-space-size=1536
npm ci
npx prisma migrate deploy
npm run build
ln -sfn "$APP_DIR/.env" "$APP_DIR/.next/standalone/.env"

cd "$APP_DIR/.next/standalone"
set -a
# shellcheck disable=SC1091
. "$APP_DIR/.env"
set +a
HOSTNAME=127.0.0.1 PORT=3000 NODE_ENV=production pm2 start server.js --name rooberah --update-env
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null || true

systemctl enable --now caddy
systemctl reload caddy

if [[ -f /root/migrate-hold/backup.env && -f /root/migrate-hold/rclone.conf ]]; then
  apt-get install -y -qq rclone
  mkdir -p /etc/rooberah /opt/rooberah
  install -m 600 /root/migrate-hold/backup.env /etc/rooberah/backup.env
  install -m 600 /root/migrate-hold/rclone.conf /etc/rooberah/rclone.conf
  install -m 700 "$APP_DIR/scripts/backup-to-arvan.sh" /opt/rooberah/backup-to-arvan.sh
  cat > /opt/rooberah/run-reminders.sh <<'EOF'
#!/bin/bash
set -euo pipefail
set -a
. /opt/rooberah/app/.env
set +a
curl -fsS --oauth2-bearer "$CRON_SECRET" \
  http://127.0.0.1:3000/api/cron/reminders >> /var/log/rooberah-cron.log 2>&1
EOF
  chmod 700 /opt/rooberah/run-reminders.sh
  cat > /tmp/rooberah-cron <<'EOF'
CRON_TZ=Asia/Tehran
*/10 * * * * /opt/rooberah/run-reminders.sh
15 3 * * * /opt/rooberah/backup-to-arvan.sh
EOF
  crontab /tmp/rooberah-cron
  rm -f /tmp/rooberah-cron
fi

echo "restored $(basename "$ARCHIVE")"
echo "point rooberah.net and www at this server, then: curl -I https://rooberah.net/"
