#!/usr/bin/env bash
set -euo pipefail

INSTALL_SCOPE=${INSTALL_SCOPE:-all}
RUN_DB_SETUP=${RUN_DB_SETUP:-false}
# Default: don't seed unless explicitly requested
RUN_DB_SEED=${RUN_DB_SEED:-false}

# Ensure we have a writable cache directory if one was provided
if [[ -n "${YARN_CACHE_FOLDER:-}" ]]; then
  mkdir -p "${YARN_CACHE_FOLDER}"
fi

install_if_needed() {
  local target_dir="$1"
  local scope_label="$2"
  local lockfile="${target_dir}/yarn.lock"
  if [[ ! -f "${lockfile}" ]]; then
    return
  fi

  local node_modules_path="${target_dir}/node_modules"
  local stamp_file="${node_modules_path}/.install.stamp"

  if [[ -f "${stamp_file}" ]]; then
    return
  fi

  echo "[entrypoint] Installing ${scope_label} dependencies..."
  yarn --cwd "${target_dir}" install --prefer-offline --frozen-lockfile
  touch "${stamp_file}"
}

case "${INSTALL_SCOPE}" in
  backend)
    install_if_needed "." "backend"
    ;;
  frontend)
    install_if_needed "frontend" "frontend"
    ;;
  all)
    install_if_needed "." "backend"
    install_if_needed "frontend" "frontend"
    ;;
  *)
    echo "[entrypoint] Unknown INSTALL_SCOPE=${INSTALL_SCOPE}; skipping installs"
    ;;
 esac

if [[ "${RUN_DB_SETUP}" == "true" ]]; then
  echo "[entrypoint] Running migrations and seeders..."
  yarn db:migrate
  if [[ "${RUN_DB_SEED}" == "true" ]]; then
    echo "[entrypoint] Running seeds (requested)."
    yarn db:seed
  else
    echo "[entrypoint] Skipping seeds (RUN_DB_SEED=false)."
  fi
fi

echo "[entrypoint] Starting: $*"
exec "$@"
