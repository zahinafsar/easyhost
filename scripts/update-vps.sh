#!/bin/sh
set -eu
umask 077

cd "$(dirname "$0")/.."
UPDATE_ROOT=$(pwd)
UPDATE_STATE="$UPDATE_ROOT/.vps-update"
UPDATE_PHASE=preparation
UPDATE_BACKUP="$UPDATE_STATE/backups/$(date -u +%Y%m%dT%H%M%SZ)-$$"

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

compose() {
  UPDATE_ENV_FILE=$1
  shift
  docker compose -f "$UPDATE_ROOT/docker-compose.prod.yml" --env-file "$UPDATE_ENV_FILE" "$@"
}

find_service() {
  docker ps -aq --filter label=com.docker.compose.project=easyhost --filter "label=com.docker.compose.service=$1"
}

one_container() {
  set -- $1
  [ "$#" -eq 1 ] || fail 'Expected exactly one container for each database service. No data has been overwritten.'
  printf '%s\n' "$1"
}

wait_database() {
  UPDATE_ATTEMPTS=0
  until docker exec "$1" pg_isready -U "$2" -d postgres >/dev/null 2>&1; do
    UPDATE_ATTEMPTS=$((UPDATE_ATTEMPTS + 1))
    [ "$UPDATE_ATTEMPTS" -lt 90 ] || fail 'A database did not become ready. Update stopped.'
    sleep 1
  done
}

query() {
  docker exec "$1" psql -X -w -U "$2" -d "$3" -v ON_ERROR_STOP=1 -Atc "$4"
}

finish() {
  UPDATE_STATUS=$1
  trap - 0
  rmdir "$UPDATE_STATE/lock"
  if [ "$UPDATE_STATUS" -ne 0 ]; then
    printf '\nUpdate stopped during %s.\nBackups and logs: %s\n' "$UPDATE_PHASE" "$UPDATE_BACKUP" >&2
    if [ -f "$UPDATE_STATE/pending" ]; then
      printf '%s\n' 'Apps may be stopped and the old database may be locked against outside writes. Original database volumes were not deleted. Do not force a restart or retry until the error is resolved.' >&2
    fi
  fi
  exit "$UPDATE_STATUS"
}

command -v docker >/dev/null 2>&1 || fail 'Docker is required.'
command -v node >/dev/null 2>&1 || fail 'Node.js is required.'
[ -f .env ] || fail 'Missing .env in the EasyHost directory.'
mkdir -p "$UPDATE_STATE"
[ ! -f "$UPDATE_STATE/pending" ] || fail 'An earlier update is incomplete. Keep the existing volumes and inspect the backup path in .vps-update/pending before retrying.'
mkdir "$UPDATE_STATE/lock" 2>/dev/null || fail 'Another update is running, or .vps-update/lock remains from an interrupted update.'
trap 'finish $?' 0
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -p "$UPDATE_BACKUP"
cp .env "$UPDATE_BACKUP/env.before"

node --input-type=module - "$UPDATE_BACKUP/env.next" <<'JS'
import { readFileSync, writeFileSync } from "node:fs";

const destination = process.argv[2];
const lines = readFileSync(".env", "utf8").split(/\r?\n/);
const values = new Map();
for (const line of lines) {
  const match = line.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
  if (!match) continue;
  if (values.has(match[1])) throw new Error(`Duplicate environment variable ${match[1]}`);
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  values.set(match[1], value);
}

const required = ["POSTGRES_PASSWORD", "MINIO_ROOT_PASSWORD", "DATABASE_URL", "JWT_SECRET", "APP_URL", "RESEND_API_KEY", "EMAIL_FROM", "MINIO_URL", "STORAGE_PUBLIC_URL", "USERDB_PUBLIC_HOST", "USERDB_PUBLIC_PORT", "USERDB_PUBLIC_SSLMODE", "APPS_DOMAIN", "APPS_PROTOCOL", "PUBLIC_IP", "VITE_PUBLIC_API_URL", "PROXY_NETWORK", "NPM_LETSENCRYPT_DIR", "NPM_API_URL", "NPM_API_EMAIL", "NPM_API_PASSWORD"];
for (const name of required) {
  const value = values.get(name);
  if (!value?.trim() || /<[A-Z_]+>/.test(value)) throw new Error(`Missing or malformed environment variable ${name}`);
}

let databaseUrl;
try {
  databaseUrl = new URL(values.get("DATABASE_URL"));
} catch {
  throw new Error("Malformed environment variable DATABASE_URL");
}
if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol) || databaseUrl.hostname !== "postgres" || databaseUrl.port !== "5432" || databaseUrl.username !== "easyhost" || databaseUrl.pathname !== "/easyhost" || decodeURIComponent(databaseUrl.password) !== values.get("POSTGRES_PASSWORD")) {
  throw new Error("DATABASE_URL must point to easyhost@postgres:5432/easyhost and match POSTGRES_PASSWORD");
}
if (values.get("USERDB_PUBLIC_PORT") !== "5432") throw new Error("USERDB_PUBLIC_PORT must be 5432 on the VPS");
if (!["no-verify", "require", "verify-full"].includes(values.get("USERDB_PUBLIC_SSLMODE"))) throw new Error("Malformed environment variable USERDB_PUBLIC_SSLMODE");
if (!["http", "https"].includes(values.get("APPS_PROTOCOL"))) throw new Error("Malformed environment variable APPS_PROTOCOL");
for (const name of ["APP_URL", "MINIO_URL", "STORAGE_PUBLIC_URL", "VITE_PUBLIC_API_URL", "NPM_API_URL"]) {
  try {
    const value = new URL(values.get(name));
    if (!["http:", "https:"].includes(value.protocol)) throw new Error();
  } catch {
    throw new Error(`Malformed environment variable ${name}`);
  }
}

let certificate;
if (values.has("POSTGRES_CERT_NAME")) {
  certificate = values.get("POSTGRES_CERT_NAME");
  if (values.has("USERDB_CERT_NAME") && certificate !== values.get("USERDB_CERT_NAME")) throw new Error("POSTGRES_CERT_NAME and USERDB_CERT_NAME disagree");
} else if (values.has("USERDB_CERT_NAME")) {
  certificate = values.get("USERDB_CERT_NAME");
} else {
  throw new Error("Missing environment variable POSTGRES_CERT_NAME or existing USERDB_CERT_NAME");
}
if (!certificate || !/^[A-Za-z0-9_-]+$/.test(certificate)) throw new Error("Malformed environment variable POSTGRES_CERT_NAME");

databaseUrl.searchParams.set("sslmode", "require");
databaseUrl.password = values.get("POSTGRES_PASSWORD");
const updated = [];
for (const line of lines) {
  if (/^(USERDB_URL|USERDB_PASSWORD|USERDB_CERT_NAME|POSTGRES_CERT_NAME)=/.test(line)) continue;
  if (line.startsWith("DATABASE_URL=")) {
    updated.push(`DATABASE_URL='${databaseUrl.toString()}'`);
  } else {
    updated.push(line);
  }
}
updated.push(`POSTGRES_CERT_NAME=${certificate}`);
writeFileSync(destination, updated.join("\n") + "\n", { mode: 0o600 });
JS

SOURCE_IDS=$(find_service userdb)
TARGET_IDS=$(find_service postgres)
TARGET_ID=$(one_container "$TARGET_IDS")
TARGET_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$TARGET_ID")
[ -n "$TARGET_VOLUME" ] || fail 'The platform Postgres data must use a named volume.'

if [ -z "$SOURCE_IDS" ]; then
  [ -f "$UPDATE_STATE/complete" ] || fail 'The original userdb container is missing. Update stopped so existing customer data is not skipped.'
  [ "$(cat "$UPDATE_STATE/complete")" = "$TARGET_VOLUME" ] || fail 'The platform database volume differs from the completed transfer.'
  printf '%s\n' 'The database transfer is already complete. Updating services.'
  UPDATE_PHASE=build
  compose "$UPDATE_BACKUP/env.next" build
  cp "$UPDATE_BACKUP/env.next" .env
  UPDATE_PHASE=deployment
  compose .env up -d --no-build --force-recreate --wait --wait-timeout 300
  printf '%s\n' 'EasyHost is updated.'
  exit 0
fi

SOURCE_ID=$(one_container "$SOURCE_IDS")
[ "$SOURCE_ID" != "$TARGET_ID" ] || fail 'Source and destination databases must be different containers.'
SOURCE_VOLUME=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$SOURCE_ID")
[ -n "$SOURCE_VOLUME" ] || fail 'The original customer Postgres data must use a named volume.'
[ "$SOURCE_VOLUME" != "$TARGET_VOLUME" ] || fail 'Both databases unexpectedly use the same data volume.'
printf '%s\n' "$SOURCE_ID" > "$UPDATE_BACKUP/source.id"
printf '%s\n' "$TARGET_ID" > "$UPDATE_BACKUP/target.id"
printf '%s\n' "$SOURCE_VOLUME" > "$UPDATE_BACKUP/source.volume"
printf '%s\n' "$TARGET_VOLUME" > "$UPDATE_BACKUP/target.volume"

UPDATE_PHASE=build
printf '%s\n' 'Building the new images before taking apps offline.'
compose "$UPDATE_BACKUP/env.next" build

UPDATE_PHASE=preflight
for UPDATE_DATABASE_ID in "$TARGET_ID" "$SOURCE_ID"; do
  if [ "$(docker inspect --format '{{.State.Running}}' "$UPDATE_DATABASE_ID")" != true ]; then
    docker start "$UPDATE_DATABASE_ID" >/dev/null
  fi
done
wait_database "$TARGET_ID" easyhost
wait_database "$SOURCE_ID" postgres

INVENTORY_SQL="SELECT json_build_object('version', current_setting('server_version_num')::int, 'databases', (SELECT coalesce(json_agg(datname ORDER BY datname), '[]'::json) FROM pg_database WHERE NOT datistemplate), 'roles', (SELECT coalesce(json_agg(rolname ORDER BY rolname), '[]'::json) FROM pg_roles WHERE rolname !~ '^pg_'), 'tablespaces', (SELECT count(*) FROM pg_tablespace WHERE spcname NOT IN ('pg_default', 'pg_global')))"
query "$SOURCE_ID" postgres postgres "$INVENTORY_SQL" > "$UPDATE_BACKUP/source.json"
query "$TARGET_ID" easyhost postgres "$INVENTORY_SQL" > "$UPDATE_BACKUP/target.json"

for UPDATE_SYSTEM_DATABASE in postgres template1; do
  SYSTEM_OBJECTS=$(query "$SOURCE_ID" postgres "$UPDATE_SYSTEM_DATABASE" "SELECT (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') + (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') + (SELECT count(*) FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname NOT IN ('public', 'information_schema'))")
  [ "$SYSTEM_OBJECTS" -eq 0 ] || fail "The original $UPDATE_SYSTEM_DATABASE database contains custom objects. Update stopped rather than skip that data."
done

node --input-type=module - "$UPDATE_BACKUP" <<'JS'
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const folder = process.argv[2];
const source = JSON.parse(readFileSync(path.join(folder, "source.json"), "utf8"));
const target = JSON.parse(readFileSync(path.join(folder, "target.json"), "utf8"));
if (Math.floor(source.version / 10000) !== 16 || Math.floor(target.version / 10000) !== 16 || target.version < source.version) {
  throw new Error("Both databases must use Postgres 16, and the destination must not be older than the source");
}
if (source.tablespaces !== 0) throw new Error("The source has custom tablespaces; update stopped rather than skip them");
const databases = source.databases.filter((name) => name !== "postgres");
for (const name of databases) {
  if (!/^db_[a-f0-9]{16}(_shadow)?$/.test(name)) throw new Error(`Unexpected customer database ${name}; update stopped`);
  if (target.databases.includes(name)) throw new Error(`Destination database ${name} already exists; nothing will be overwritten`);
}
for (const name of source.roles) {
  if (target.roles.includes(name)) throw new Error(`Destination role ${name} already exists; nothing will be overwritten`);
}
writeFileSync(path.join(folder, "databases"), databases.join("\n") + "\n", { mode: 0o600 });
JS

API_IDS=$(find_service api)
printf '%s\n' "$API_IDS" > "$UPDATE_BACKUP/api.ids"
docker inspect "$SOURCE_ID" "$TARGET_ID" > "$UPDATE_BACKUP/containers.before.json"
docker exec "$SOURCE_ID" sh -ceu ': "${PGDATA:?PGDATA is required}"; cat "$PGDATA/pg_hba.conf"' > "$UPDATE_BACKUP/userdb.pg_hba.conf"
printf '%s\n' "$UPDATE_BACKUP" > "$UPDATE_STATE/pending"

UPDATE_PHASE=maintenance
printf '%s\n' 'Stopping the API and running apps; temporarily blocking outside database writes.'
for UPDATE_API_ID in $API_IDS; do
  if [ "$(docker inspect --format '{{.State.Running}}' "$UPDATE_API_ID")" = true ]; then
    docker stop --time 60 "$UPDATE_API_ID" >/dev/null
  fi
done
docker ps -q --filter label=easyhost.app > "$UPDATE_BACKUP/apps.running"
while IFS= read -r UPDATE_APP_ID; do
  [ -n "$UPDATE_APP_ID" ] || continue
  docker stop --time 60 "$UPDATE_APP_ID" >/dev/null
done < "$UPDATE_BACKUP/apps.running"

docker exec -i --user postgres "$SOURCE_ID" sh -ceu ': "${PGDATA:?PGDATA is required}"; cat > "$PGDATA/pg_hba.conf"' <<'HBA'
local all all trust
host all all all reject
HBA
docker restart "$SOURCE_ID" >/dev/null
wait_database "$SOURCE_ID" postgres

UPDATE_PHASE=backup
printf '%s\n' 'Backing up both instances and customer credentials.'
docker exec "$TARGET_ID" pg_dumpall -w -U easyhost > "$UPDATE_BACKUP/platform.sql" 2> "$UPDATE_BACKUP/platform-backup.log"
docker exec "$SOURCE_ID" pg_dumpall -w -U postgres > "$UPDATE_BACKUP/userdb.sql" 2> "$UPDATE_BACKUP/userdb-backup.log"
docker exec "$SOURCE_ID" pg_dumpall -w -U postgres --globals-only --quote-all-identifiers > "$UPDATE_BACKUP/roles.sql" 2> "$UPDATE_BACKUP/roles-backup.log"
while IFS= read -r UPDATE_DATABASE_NAME; do
  [ -n "$UPDATE_DATABASE_NAME" ] || continue
  docker exec "$SOURCE_ID" pg_dump -w -U postgres -d "$UPDATE_DATABASE_NAME" --format=custom > "$UPDATE_BACKUP/$UPDATE_DATABASE_NAME.dump" 2> "$UPDATE_BACKUP/$UPDATE_DATABASE_NAME.backup.log"
done < "$UPDATE_BACKUP/databases"

UPDATE_PHASE=restore
printf '%s\n' 'Restoring customer roles, databases, ownership, and access privileges.'
docker exec -i "$TARGET_ID" psql -X -w -U easyhost -d postgres -v ON_ERROR_STOP=1 --single-transaction < "$UPDATE_BACKUP/roles.sql" > "$UPDATE_BACKUP/roles-restore.log" 2>&1
docker exec "$TARGET_ID" psql -X -w -U easyhost -d postgres -v ON_ERROR_STOP=1 -c 'ALTER ROLE postgres NOLOGIN' > "$UPDATE_BACKUP/legacy-admin.log" 2>&1
while IFS= read -r UPDATE_DATABASE_NAME; do
  [ -n "$UPDATE_DATABASE_NAME" ] || continue
  docker exec -i "$TARGET_ID" pg_restore -w -U easyhost --dbname=postgres --create --exit-on-error < "$UPDATE_BACKUP/$UPDATE_DATABASE_NAME.dump" > "$UPDATE_BACKUP/$UPDATE_DATABASE_NAME.restore.log" 2>&1
done < "$UPDATE_BACKUP/databases"

UPDATE_PHASE=cutover
printf '%s\n' 'Switching to the shared Postgres instance.'
docker stop "$SOURCE_ID" >/dev/null
cp "$UPDATE_BACKUP/env.next" .env
compose .env up -d --no-build --force-recreate --wait --wait-timeout 300

UPDATE_PHASE=resume
while IFS= read -r UPDATE_APP_ID; do
  [ -n "$UPDATE_APP_ID" ] || continue
  docker start "$UPDATE_APP_ID" >/dev/null
done < "$UPDATE_BACKUP/apps.running"
docker rm "$SOURCE_ID" >/dev/null
printf '%s\n' "$TARGET_VOLUME" > "$UPDATE_STATE/complete"
rm "$UPDATE_STATE/pending"

printf '\nEasyHost is updated and running on one Postgres instance.\nBackups: %s\nRetained original customer volume: %s\n' "$UPDATE_BACKUP" "$SOURCE_VOLUME"
