#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<USAGE
Usage: ensure-deps.sh <backend|frontend> <command> [args...]
USAGE
}

if [ "$#" -lt 2 ]; then
  usage
  exit 1
fi

mode="$1"
shift

hash_files=()
state_file=""
app_dir=""
lock_file=""
max_install_attempts="${DEPS_INSTALL_MAX_ATTEMPTS:-3}"
retry_backoff_seconds="${DEPS_INSTALL_RETRY_BACKOFF_SECONDS:-2}"

case "$mode" in
  backend)
    app_dir="/workspace"
    hash_files=(
      "/workspace/package.json"
      "/workspace/yarn.lock"
    )
    state_file="/workspace/node_modules/.deps-hash"
    lock_file="/workspace/node_modules/.deps-install.lock"
    ;;
  frontend)
    app_dir="/workspace/frontend"
    hash_files=(
      "/workspace/frontend/package.json"
      "/workspace/frontend/yarn.lock"
    )

    if [ -f "/workspace/packages/common/package.json" ]; then
      hash_files+=("/workspace/packages/common/package.json")
    fi

    if [ -f "/workspace/packages/common/yarn.lock" ]; then
      hash_files+=("/workspace/packages/common/yarn.lock")
    fi

    state_file="/workspace/frontend/node_modules/.deps-hash"
    lock_file="/workspace/frontend/node_modules/.deps-install.lock"
    ;;
  *)
    usage
    exit 1
    ;;
esac

calc_hash() {
  if command -v sha256sum >/dev/null 2>&1; then
    cat "$@" | sha256sum | awk '{ print $1 }'
  else
    cat "$@" | shasum -a 256 | awk '{ print $1 }'
  fi
}

cd "$app_dir"

mkdir -p "$(dirname "$lock_file")"
exec 9>"$lock_file"
flock 9

validate_positive_integer() {
  local value="$1"
  local name="$2"
  if ! [[ "$value" =~ ^[1-9][0-9]*$ ]]; then
    echo "$name must be a positive integer (got: $value)" >&2
    exit 1
  fi
}

validate_positive_integer "$max_install_attempts" "DEPS_INSTALL_MAX_ATTEMPTS"
validate_positive_integer "$retry_backoff_seconds" "DEPS_INSTALL_RETRY_BACKOFF_SECONDS"

install_deps() {
  yarn install --frozen-lockfile --non-interactive --prefer-offline
}

retry_install_after_cleanup() {
  local attempt="$1"
  local sleep_seconds=$((retry_backoff_seconds * attempt))
  echo "yarn install failed for $mode (attempt ${attempt}/${max_install_attempts}); cleaning cache and retrying in ${sleep_seconds}s..."
  yarn cache clean --all >/dev/null 2>&1 || true
  rm -rf /yarn-cache/v6 /yarn-cache/.tmp /yarn-cache/.tmp-* 2>/dev/null || true
  mkdir -p /yarn-cache
  if [ -d node_modules ]; then
    find node_modules -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  fi
  sleep "$sleep_seconds"
}

install_deps_with_retries() {
  local attempt=1
  while [ "$attempt" -le "$max_install_attempts" ]; do
    if install_deps; then
      return 0
    fi

    if [ "$attempt" -eq "$max_install_attempts" ]; then
      echo "yarn install failed for $mode after ${max_install_attempts} attempts." >&2
      return 1
    fi

    retry_install_after_cleanup "$attempt"
    attempt=$((attempt + 1))
  done

  return 1
}

current_hash=""
if [ -f "$state_file" ]; then
  current_hash="$(cat "$state_file")"
fi

expected_hash="$(calc_hash "${hash_files[@]}")"

if [ "$expected_hash" != "$current_hash" ] || [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "Installing dependencies for $mode (lockfile change detected or missing node_modules)..."
  install_deps_with_retries
  printf '%s' "$expected_hash" > "$state_file"
else
  echo "Dependencies are up to date for $mode"
fi

flock -u 9
exec 9>&-

exec "$@"
