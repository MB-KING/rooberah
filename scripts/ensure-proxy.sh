#!/usr/bin/env bash
set -euo pipefail
CFG=/opt/hiddify-manager/haproxy/haproxy.cfg
MAP=/opt/hiddify-manager/haproxy/maps/http_domain
CHANGED=0

mkdir -p /opt/hiddify-manager/ssl

restore_cert() {
  local domain="$1"
  local acme_dir="/root/.acme.sh/${domain}_ecc"
  local cert="/opt/hiddify-manager/ssl/${domain}.crt"
  local key="/opt/hiddify-manager/ssl/${domain}.crt.key"
  if [ -f "$acme_dir/fullchain.cer" ] && [ -f "$acme_dir/${domain}.key" ]; then
    if [ ! -f "$cert" ] || [ ! -f "$key" ] || ! cmp -s "$acme_dir/fullchain.cer" "$cert"; then
      cp "$acme_dir/fullchain.cer" "$cert"
      cp "$acme_dir/${domain}.key" "$key"
      chmod 600 "$cert" "$key"
      CHANGED=1
    fi
  fi
}

restore_cert hammasir.mbking.info
restore_cert rooberah.mbking.info

for domain in hammasir.mbking.info rooberah.mbking.info; do
  if ! grep -qE "^[[:space:]]*${domain}[[:space:]]+hammasir_app" "$MAP" 2>/dev/null; then
    printf '\n%s hammasir_app\n' "$domain" >> "$MAP"
    CHANGED=1
  fi
done

if ! grep -q "backend hammasir_app" "$CFG"; then
  cat >> "$CFG" <<'BACKEND'

# --- hammasir custom (managed by /opt/hammasir/ensure-proxy.sh) ---
backend hammasir_app
    mode http
    option forwardfor
    http-request set-header X-Forwarded-Proto https if { ssl_fc }
    http-request set-header X-Forwarded-Proto http if !{ ssl_fc }
    http-request set-header X-Forwarded-Host %[req.hdr(host)]
    server hammasir 127.0.0.1:3000

backend hammasir_acme
    mode http
    server acme 127.0.0.1:9080
# --- end hammasir custom ---
BACKEND
  CHANGED=1
fi

# HTTP :80 host routing inside in-tcpmode (before default_backend to_httpmode)
HTTP_RULES_OUT="$(python3 - <<'PY'
from pathlib import Path
p = Path("/opt/hiddify-manager/haproxy/haproxy.cfg")
text = p.read_text()
combined = (
    "    use_backend hammasir_acme if { hdr(host) -i hammasir.mbking.info rooberah.mbking.info } { path_beg /.well-known/acme-challenge/ }\n"
    "    use_backend hammasir_app if { hdr(host) -i hammasir.mbking.info rooberah.mbking.info }\n"
)
old = (
    "    use_backend hammasir_acme if { hdr(host) -i hammasir.mbking.info } { path_beg /.well-known/acme-challenge/ }\n"
    "    use_backend hammasir_app if { hdr(host) -i hammasir.mbking.info }\n"
)
if "hdr(host) -i hammasir.mbking.info rooberah.mbking.info" in text:
    print("unchanged")
elif old in text:
    p.write_text(text.replace(old, combined, 1))
    print("changed")
else:
    needle = "    default_backend to_httpmode"
    idx = text.find(needle)
    if idx != -1:
        p.write_text(text[:idx] + combined + "\n" + text[idx:])
        print("changed")
    else:
        print("missing-anchor")
PY
)"
if [ "$HTTP_RULES_OUT" = "changed" ]; then
  CHANGED=1
elif [ "$HTTP_RULES_OUT" = "missing-anchor" ]; then
  echo "http host rules already present or anchor missing"
fi

if [ "$CHANGED" = "1" ] || ! systemctl is-active --quiet hiddify-haproxy; then
  if haproxy -c -f "$CFG"; then
    systemctl reload hiddify-haproxy || systemctl restart hiddify-haproxy
    echo "haproxy reloaded"
  else
    echo "haproxy config invalid" >&2
    exit 1
  fi
else
  echo "proxy already ok"
fi
