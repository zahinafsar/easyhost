#!/bin/sh
set -e

: "${PGDATA:?PGDATA is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

case "$POSTGRES_USER" in
  easyhost) ;;
  *) echo "POSTGRES_USER must be easyhost" >&2; exit 1 ;;
esac

case "$POSTGRES_DB" in
  easyhost) ;;
  *) echo "POSTGRES_DB must be easyhost" >&2; exit 1 ;;
esac

cat > "$PGDATA/pg_hba.conf" <<EOF
local all all trust
hostssl all $POSTGRES_USER all scram-sha-256
host $POSTGRES_DB,postgres,template1 all all reject
hostssl all all all scram-sha-256
host all all all reject
EOF

chown postgres:postgres "$PGDATA/pg_hba.conf"
chmod 600 "$PGDATA/pg_hba.conf"
