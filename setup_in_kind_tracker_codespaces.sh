#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

if [[ "${CODESPACES:-false}" != "true" ]]; then
  echo "Warning: CODESPACES is not set to true. Running Codespaces setup anyway."
fi

CODESPACES=true "$ROOT_DIR/setup_in_kind_tracker_local.sh"
