#!/usr/bin/env bash

set -euo pipefail

compose_file="docker/compose/test.yml"
project_name="${TTA_DOCKER_TEST_PROJECT:-ttahub-test}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
deps_hash_file="${repo_root}/tmp/${project_name}-deps-hash"

compose() {
  docker compose -p "$project_name" -f "$compose_file" "$@"
}

cleanup() {
  compose down --remove-orphans >/dev/null 2>&1 || true
}

calc_hash() {
  if command -v sha256sum >/dev/null 2>&1; then
    cat "$@" | sha256sum | awk '{ print $1 }'
  else
    cat "$@" | shasum -a 256 | awk '{ print $1 }'
  fi
}

deps_hash() {
  local files=(
    "package.json"
    "yarn.lock"
    "frontend/package.json"
    "frontend/yarn.lock"
  )

  if [ -f "packages/common/package.json" ]; then
    files+=("packages/common/package.json")
  fi

  if [ -f "packages/common/yarn.lock" ]; then
    files+=("packages/common/yarn.lock")
  fi

  calc_hash "${files[@]}"
}

remove_node_modules_volumes() {
  docker volume rm \
    "${project_name}_test-backend-node-modules" \
    "${project_name}_test-frontend-node-modules" \
    >/dev/null 2>&1 || true
}

reset_db_volumes() {
  docker volume rm \
    "${project_name}_test-db-data" \
    "${project_name}_test-redis-data" \
    >/dev/null 2>&1 || true
}

trap cleanup EXIT

cleanup

mkdir -p "$(dirname "$deps_hash_file")"

expected_deps_hash="$(deps_hash)"
current_deps_hash=""

if [ -f "$deps_hash_file" ]; then
  current_deps_hash="$(cat "$deps_hash_file")"
fi

if [ "$expected_deps_hash" != "$current_deps_hash" ]; then
  echo "Dependencies changed; removing node_modules volumes for test containers..."
  remove_node_modules_volumes
fi

reset_db_volumes
printf '%s' "$expected_deps_hash" > "$deps_hash_file"

compose up -d --build --wait test-db test-redis
compose run --rm test-backend yarn db:migrate
compose run --rm test-backend yarn db:seed
compose run --rm test-backend yarn test:ci
compose run --rm test-frontend yarn test:ci
