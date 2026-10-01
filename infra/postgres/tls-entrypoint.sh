#!/bin/sh
set -e

: "${PGDATA:?PGDATA is required}"
: "${POSTGRES_TLS_MODE:?POSTGRES_TLS_MODE is required}"

if [ -f "$PGDATA/pg_hba.conf" ]; then
  /usr/local/bin/configure-access.sh
fi

TLS_DIR=/var/lib/postgresql/tls
CERT="$TLS_DIR/server.crt"
KEY="$TLS_DIR/server.key"

install_files() {
  cp -L "$POSTGRES_TLS_CERT_FILE" "$CERT"
  cp -L "$POSTGRES_TLS_KEY_FILE" "$KEY"
  chown postgres:postgres "$CERT" "$KEY"
  chmod 600 "$KEY"
}

mkdir -p "$TLS_DIR"
chown postgres:postgres "$TLS_DIR"

case "$POSTGRES_TLS_MODE" in
  self-signed)
    if [ ! -f "$CERT" ]; then
      openssl req -new -x509 -days 3650 -nodes -subj "/CN=easyhost-db" -keyout "$KEY" -out "$CERT"
      chown postgres:postgres "$CERT" "$KEY"
      chmod 600 "$KEY"
    fi
    ;;
  files)
    : "${POSTGRES_TLS_CERT_FILE:?POSTGRES_TLS_CERT_FILE is required when POSTGRES_TLS_MODE=files}"
    : "${POSTGRES_TLS_KEY_FILE:?POSTGRES_TLS_KEY_FILE is required when POSTGRES_TLS_MODE=files}"
    install_files
    (
      while sleep 21600; do
        if ! cmp -s "$POSTGRES_TLS_CERT_FILE" "$CERT"; then
          install_files
          su-exec postgres pg_ctl reload -D "$PGDATA"
        fi
      done
    ) &
    ;;
  *)
    echo "POSTGRES_TLS_MODE must be self-signed or files" >&2
    exit 1
    ;;
esac

exec docker-entrypoint.sh postgres -c ssl=on -c "ssl_cert_file=$CERT" -c "ssl_key_file=$KEY"
