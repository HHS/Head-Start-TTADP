#!/usr/bin/env bash

set -euo pipefail

compose_files="${TTA_DOCKER_COMPOSE_FILES:-docker/compose/docker-compose.yml}"
pg_user="${POSTGRES_USERNAME:-postgres}"
pg_db="${POSTGRES_DB:-ttasmarthub}"
use_local_postgres="${USE_LOCAL_POSTGRES:-false}"

compose() {
  for f in $compose_files; do
    args+=(-f "$f")
  done
  docker compose "${args[@]}" "$@"
}

psql_query() {
  local query="$1"
  compose exec -T db psql -U "$pg_user" -d "$pg_db" -Atc "$query"
}

echo "Running migrations..."
compose run --rm backend yarn db:migrate

if [ "$use_local_postgres" = "true" ]; then
  echo "Local Postgres mode enabled; skipping seed"
elif psql_query "SELECT COUNT(*) > 5 FROM \"Users\";" 2>/dev/null | grep -q 't'; then
  echo "Existing data detected in Users table; skipping seed"
else
  echo "Fresh database detected; running seeders..."
  compose run --rm backend yarn db:seed:local
fi

echo "Development database initialization complete."
