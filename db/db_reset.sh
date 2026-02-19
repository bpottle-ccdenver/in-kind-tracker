#!/usr/bin/env bash
set -euo pipefail

# In-Kind Tracker DB Reset Script
# This script will DROP ALL TABLES AND DATA by recreating the public schema,
# then run all SQL scripts listed in the 'full' file.

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

# ANSI colors for warnings
RED="\033[31m"
YELLOW="\033[33m"
BOLD="\033[1m"
RESET="\033[0m"

require_env() {
  local var_name="$1"
  if [[ -z "${!var_name:-}" ]]; then
    echo "Error: environment variable ${var_name} is required." >&2
    echo "Set ${var_name} and re-run. Expected variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD" >&2
    exit 1
  fi
}

# Required environment variables for PostgreSQL connection
require_env DB_HOST
require_env DB_PORT
require_env DB_NAME
require_env DB_USER
require_env DB_PASSWORD

export PGPASSWORD="$DB_PASSWORD"
FULL_FILE="$SCRIPT_DIR/full"
SCHEMA_NAME="${SCHEMA_NAME:-in_kind_tracker}"

if [[ ! -f "$FULL_FILE" ]]; then
  echo "Error: '$FULL_FILE' not found. It should list SQL files to execute." >&2
  exit 1
fi

printf "${RED}${BOLD}=====================================================================\n"
printf " DANGER:${RESET} ${BOLD}This will ${RED}DELETE ALL DATA${RESET}${BOLD} in schema '${YELLOW}%s${RESET}${BOLD}' on database '${YELLOW}%s${RESET}${BOLD}' at %s:%s\n" "$SCHEMA_NAME" "$DB_NAME" "$DB_HOST" "$DB_PORT"
printf "${RED}${BOLD}=====================================================================${RESET}\n"
printf "${YELLOW}- Only do this if you REALLY know what you are doing.${RESET}\n"
printf "${YELLOW}- Most likely ${RED}${BOLD}DO NOT${RESET}${YELLOW} run this in production.${RESET}\n"
printf "${YELLOW}- This operation is IRREVERSIBLE and will drop the entire 'public' schema.${RESET}\n\n"
printf "To confirm, type the database name ('${YELLOW}%s${RESET}') and press Enter:\n" "$DB_NAME"
read -r CONFIRM_DB
if [[ "$CONFIRM_DB" != "$DB_NAME" ]]; then
  printf "${RED}Confirmation failed. Exiting without making changes.${RESET}\n"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: 'psql' command not found. Please install PostgreSQL client tools." >&2
  exit 1
fi

PSQL_ARGS=( -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q )

echo "Resetting schema '$SCHEMA_NAME'..."
psql "${PSQL_ARGS[@]}" -c "DROP SCHEMA IF EXISTS \"$SCHEMA_NAME\" CASCADE; CREATE SCHEMA \"$SCHEMA_NAME\"; GRANT ALL ON SCHEMA \"$SCHEMA_NAME\" TO \"$DB_USER\";" >/dev/null

echo "Schema reset complete."

echo "Running scripts:"
SEEN_FILE="$(mktemp)"
trap 'rm -f "$SEEN_FILE"' EXIT
executed_count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  # Trim leading/trailing whitespace without requiring extglob
  line="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  # Strip any trailing carriage return (CRLF files)
  line="${line%$'\r'}"
  # Strip UTF-8 BOM if present
  if [[ "$line" == $'\xEF\xBB\xBF'* ]]; then
    line="${line#*$'\xEF\xBB\xBF'}"
  fi

  # Skip empty lines and comments
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^# ]] && continue

  # Quiet

  relpath="$line"
  # Treat paths starting with '/' as repo-relative (strip leading slash)
  if [[ "$relpath" == /* ]]; then
    relpath="${relpath#/}"
  fi

  sql_path="$SCRIPT_DIR/$relpath"
  if [[ ! -f "$sql_path" ]]; then
    echo "Error: SQL file not found: $sql_path" >&2
    exit 1
  fi

  # Skip duplicates (portable for macOS bash 3.x)
  if grep -qxF "$relpath" "$SEEN_FILE" 2>/dev/null; then
    continue
  fi
  echo "$relpath" >> "$SEEN_FILE"

  echo "- $relpath"
  if ! psql "${PSQL_ARGS[@]}" -f "$sql_path" >/dev/null; then
    echo "Error: failed executing $relpath" >&2
    exit 1
  fi
  executed_count=$((executed_count+1))
done < "$FULL_FILE"

if [[ $executed_count -eq 0 ]]; then
  echo "Warning: No SQL scripts were executed. Check '$FULL_FILE'." >&2
else
  echo "Executed $executed_count script(s)."
fi

echo "Tables in '$SCHEMA_NAME':"
psql "${PSQL_ARGS[@]}" -A -t -c "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = '$SCHEMA_NAME' ORDER BY tablename;" | sed 's/^/- /'
