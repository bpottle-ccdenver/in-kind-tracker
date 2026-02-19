#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ENV_FILE_DEFAULT="$SCRIPT_DIR/.env"
ENV_FILE="${ENV_FILE:-$ENV_FILE_DEFAULT}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file '$ENV_FILE' not found." >&2
  echo "Create it first (or set ENV_FILE)." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

require_env() {
  local var_name="$1"
  if [[ -z "${!var_name:-}" ]]; then
    echo "Error: ${var_name} is required in ${ENV_FILE}" >&2
    exit 1
  fi
}

require_env DB_HOST
require_env DB_PORT
require_env DB_NAME
require_env DB_USER
require_env DB_PASSWORD

SCHEMA_NAME="${SCHEMA_NAME:-in_kind_tracker}"
APP_DB_USER="${APP_DB_USER:-in_kind_tracker_app}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-password}"
BOOTSTRAP_MODE="${BOOTSTRAP_MODE:-migrate}"

command -v psql >/dev/null 2>&1 || {
  echo "Error: psql command not found." >&2
  exit 1
}

ADMIN_HOST="${ADMIN_HOST:-$DB_HOST}"
ADMIN_PORT="${ADMIN_PORT:-$DB_PORT}"
ADMIN_DB="${ADMIN_DB:-postgres}"
ADMIN_USER="${ADMIN_USER:-$DB_USER}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$DB_PASSWORD}"

psql_admin() {
  PGPASSWORD="$ADMIN_PASSWORD" psql \
    -h "$ADMIN_HOST" -p "$ADMIN_PORT" -U "$ADMIN_USER" -d "$ADMIN_DB" \
    -v ON_ERROR_STOP=1 "$@"
}

psql_app_db_admin() {
  PGPASSWORD="$ADMIN_PASSWORD" psql \
    -h "$ADMIN_HOST" -p "$ADMIN_PORT" -U "$ADMIN_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 "$@"
}

echo "Using admin connection: ${ADMIN_USER}@${ADMIN_HOST}:${ADMIN_PORT}/${ADMIN_DB}"
echo "Ensuring app role/database exist for '${APP_DB_USER}' on '${DB_NAME}'..."

if ! psql_admin -q -t -c "SELECT 1;" >/dev/null 2>&1; then
  echo "Error: failed to connect as admin user '${ADMIN_USER}'." >&2
  exit 1
fi

psql_admin -v app_role="$APP_DB_USER" -v app_pass="$APP_DB_PASSWORD" -v app_db="$DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_role', :'app_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role')
\gexec

SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'app_role', :'app_pass')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'app_db', :'app_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'app_db')
\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'app_db', :'app_role')
\gexec

SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'app_db', :'app_role')
\gexec
SQL

echo "Verifying app credentials for '${APP_DB_USER}'..."
if ! PGPASSWORD="$APP_DB_PASSWORD" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$APP_DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -q -t -c "SELECT current_user;" >/dev/null 2>&1; then
  echo "Error: could not log in as '${APP_DB_USER}' to '${DB_NAME}' with the configured APP_DB_PASSWORD." >&2
  echo "Hint: ensure admin credentials are correct and rerun setup." >&2
  exit 1
fi

if [[ "$BOOTSTRAP_MODE" == "reset" ]]; then
  FULL_FILE="$SCRIPT_DIR/full"
  if [[ ! -f "$FULL_FILE" ]]; then
    echo "Error: '$FULL_FILE' not found." >&2
    exit 1
  fi

  echo "Resetting schema '${SCHEMA_NAME}' and executing full manifest..."
  psql_app_db_admin -v app_schema="$SCHEMA_NAME" <<'SQL'
SELECT format('DROP SCHEMA IF EXISTS %I CASCADE', :'app_schema')
\gexec

SELECT format('CREATE SCHEMA %I', :'app_schema')
\gexec
SQL

  SEEN_FILE="$(mktemp)"
  trap 'rm -f "$SEEN_FILE"' EXIT
  executed_count=0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    line="${line%$'\r'}"
    if [[ "$line" == $'\xEF\xBB\xBF'* ]]; then
      line="${line#*$'\xEF\xBB\xBF'}"
    fi

    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^# ]] && continue

    relpath="$line"
    if [[ "$relpath" == /* ]]; then
      relpath="${relpath#/}"
    fi

    sql_path="$SCRIPT_DIR/$relpath"
    if [[ ! -f "$sql_path" ]]; then
      echo "Error: SQL file not found: $sql_path" >&2
      exit 1
    fi

    if grep -qxF "$relpath" "$SEEN_FILE" 2>/dev/null; then
      continue
    fi
    echo "$relpath" >> "$SEEN_FILE"

    echo "- Executing $relpath"
    psql_app_db_admin -f "$sql_path" >/dev/null
    executed_count=$((executed_count + 1))
  done < "$FULL_FILE"

  echo "Executed $executed_count script(s) from full manifest."
else
  echo "Applying delta migrations..."
  ENV_FILE="$ENV_FILE" bash "$SCRIPT_DIR/db_migrate.sh"
fi

echo "Database setup complete."
