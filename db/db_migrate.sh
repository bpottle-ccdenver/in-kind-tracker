#!/usr/bin/env bash
set -euo pipefail

# In-Kind Tracker DB Migration Script
# Reads SQL paths listed in the 'delta' file (relative to this directory)
# and executes them against the configured database/schema.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ENV_FILE_DEFAULT="$SCRIPT_DIR/.env"
ENV_FILE="${ENV_FILE:-$ENV_FILE_DEFAULT}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "Error: env file '$ENV_FILE' not found. Aborting." >&2
  exit 1
fi

require_env() {
  local var_name="$1"
  if [[ -z "${!var_name:-}" ]]; then
    echo "Error: environment variable ${var_name} is required." >&2
    echo "Set ${var_name} and re-run. Expected variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD" >&2
    exit 1
  fi
}

require_env DB_HOST
require_env DB_PORT
require_env DB_NAME
require_env DB_USER

fetch_password_from_keyvault() {
  if ! command -v az >/dev/null 2>&1; then
    echo "Error: 'az' CLI not found. Install Azure CLI or set DB_PASSWORD explicitly." >&2
    exit 1
  fi

  if [[ -z "${AZURE_DB_ADMIN_SECRET_NAME:-}" ]]; then
    echo "Error: AZURE_DB_ADMIN_SECRET_NAME must be set when DB_PASSWORD is empty." >&2
    exit 1
  fi

  local secret_name="$AZURE_DB_ADMIN_SECRET_NAME"
  local value=""

  if [[ -n "${AZURE_KEY_VAULT_NAME:-}" ]]; then
    value="$(az keyvault secret show --vault-name "$AZURE_KEY_VAULT_NAME" --name "$secret_name" --query value -o tsv)" || {
      echo "Error: unable to read secret '$secret_name' from vault '$AZURE_KEY_VAULT_NAME'." >&2
      exit 1
    }
  elif [[ -n "${AZURE_KEY_VAULT_URL:-}" ]]; then
    local vault_url="${AZURE_KEY_VAULT_URL%/}"
    local secret_id="${vault_url}/secrets/${secret_name}"
    value="$(az keyvault secret show --id "$secret_id" --query value -o tsv)" || {
      echo "Error: unable to read secret '$secret_id'." >&2
      exit 1
    }
  else
    echo "Error: Set AZURE_KEY_VAULT_NAME or AZURE_KEY_VAULT_URL to fetch DB password." >&2
    exit 1
  fi

  if [[ -z "$value" ]]; then
    echo "Error: secret '$secret_name' returned an empty value." >&2
    exit 1
  fi

  DB_PASSWORD="$value"
}

if [[ -z "${DB_PASSWORD:-}" ]]; then
  fetch_password_from_keyvault
fi

require_env DB_PASSWORD

export PGPASSWORD="$DB_PASSWORD"
DELTA_FILE="$SCRIPT_DIR/delta"
SCHEMA_NAME="${SCHEMA_NAME:-in_kind_tracker}"

if [[ ! -f "$DELTA_FILE" ]]; then
  echo "Error: '$DELTA_FILE' not found. It should list SQL files to execute." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: 'psql' command not found. Please install PostgreSQL client tools." >&2
  exit 1
fi

PSQL_ARGS=( -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q )

echo "Running migration scripts listed in 'delta' against schema '$SCHEMA_NAME'..."

SEEN_FILE="$(mktemp)"
trap 'rm -f "$SEEN_FILE"' EXIT

executed_count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  # Normalize line endings and trim whitespace
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
  if ! psql "${PSQL_ARGS[@]}" -f "$sql_path" >/dev/null; then
    echo "Error: failed executing $relpath" >&2
    exit 1
  fi
  executed_count=$((executed_count + 1))
done < "$DELTA_FILE"

if [[ $executed_count -eq 0 ]]; then
  echo "Warning: No SQL scripts were executed. Check '$DELTA_FILE' for entries." >&2
else
  echo "Executed $executed_count script(s)."
fi

echo "Tables in '$SCHEMA_NAME' after migration:"
psql "${PSQL_ARGS[@]}" -A -t -c "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = '$SCHEMA_NAME' ORDER BY tablename;" | sed 's/^/- /'
