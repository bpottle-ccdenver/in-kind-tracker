#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
API_DIR="$ROOT_DIR/api"
DB_DIR="$ROOT_DIR/db"
WEB_DIR="$ROOT_DIR/web"

API_ENV="$API_DIR/.env"
DB_ENV="$DB_DIR/.env"
WEB_ENV="$WEB_DIR/.env"
CODESPACES_MODE="${CODESPACES:-false}"

upsert_env_var() {
  local file_path="$1"
  local key="$2"
  local value="$3"
  local tmp_file
  tmp_file="$(mktemp)"
  awk -v k="$key" -v v="$value" '
    BEGIN { found=0 }
    $0 ~ ("^[[:space:]]*" k "=") {
      print k "=" v
      found=1
      next
    }
    { print }
    END {
      if (!found) {
        print k "=" v
      }
    }
  ' "$file_path" > "$tmp_file"
  mv "$tmp_file" "$file_path"
}

for dir in "$API_DIR" "$DB_DIR" "$WEB_DIR"; do
  [[ -d "$dir" ]] || { echo "Error: required directory missing: $dir" >&2; exit 1; }
done

if [[ ! -f "$API_ENV" ]]; then
  cat > "$API_ENV" <<'APIENV'
DATABASE_URL=postgresql://in_kind_tracker_app:password@127.0.0.1:5432/in_kind_tracker_db
PORT=3001
SESSION_COOKIE_NAME=pp_session
SESSION_MAX_AGE_DAYS=7
NODE_ENV=development
APIENV
  echo "Created $API_ENV"
fi

if [[ ! -f "$DB_ENV" ]]; then
  cat > "$DB_ENV" <<'DBENV'
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=in_kind_tracker_db
DB_USER=postgres
DB_PASSWORD=postgres
SCHEMA_NAME=in_kind_tracker
APP_DB_USER=in_kind_tracker_app
APP_DB_PASSWORD=password
DBENV
  echo "Created $DB_ENV"
fi

if [[ ! -f "$WEB_ENV" ]]; then
  cat > "$WEB_ENV" <<'WEBENV'
VITE_API_BASE_URL=/api
WEBENV
  echo "Created $WEB_ENV"
fi

upsert_env_var "$WEB_ENV" "VITE_API_BASE_URL" "/api"

if [[ "$CODESPACES_MODE" == "true" ]]; then
  echo "Codespaces detected. Updating env files for docker-compose postgres service..."
  upsert_env_var "$DB_ENV" "DB_HOST" "postgres"
  upsert_env_var "$DB_ENV" "DB_PORT" "5432"
  upsert_env_var "$DB_ENV" "DB_NAME" "in_kind_tracker_db"
  upsert_env_var "$DB_ENV" "DB_USER" "postgres"
  upsert_env_var "$DB_ENV" "DB_PASSWORD" "postgres"
  upsert_env_var "$DB_ENV" "SCHEMA_NAME" "in_kind_tracker"
  upsert_env_var "$DB_ENV" "APP_DB_USER" "in_kind_tracker_app"
  upsert_env_var "$DB_ENV" "APP_DB_PASSWORD" "password"

  upsert_env_var "$API_ENV" "DATABASE_URL" "postgresql://in_kind_tracker_app:password@postgres:5432/in_kind_tracker_db"
  BOOTSTRAP_MODE="${BOOTSTRAP_MODE:-reset}"
else
  upsert_env_var "$API_ENV" "DATABASE_URL" "postgresql://in_kind_tracker_app:password@127.0.0.1:5432/in_kind_tracker_db"
  BOOTSTRAP_MODE="${BOOTSTRAP_MODE:-migrate}"
fi

echo "Installing API + Web dependencies..."
(cd "$ROOT_DIR" && npm run install:all)

echo "Bootstrapping database (mode=$BOOTSTRAP_MODE)..."
(
  cd "$DB_DIR" && \
  BOOTSTRAP_MODE="$BOOTSTRAP_MODE" \
  ./setup_db_local.sh
)

echo
echo "Setup complete. Start the app with:"
if [[ "$CODESPACES_MODE" == "true" ]]; then
  echo "  npm run dev:codespaces"
else
  echo "  npm run dev"
fi
