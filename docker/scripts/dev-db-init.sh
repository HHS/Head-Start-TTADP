#!/usr/bin/env bash

set -euo pipefail

compose_file="${TTA_DOCKER_COMPOSE_FILE:-docker/compose/dev.yml}"
project_name="${TTA_DOCKER_PROJECT:-ttahub-dev}"
pg_user="${POSTGRES_USERNAME:-postgres}"
pg_db="${POSTGRES_DB:-ttasmarthub}"
current_user_id="${CURRENT_USER_ID:-1}"

if ! [[ "$current_user_id" =~ ^[0-9]+$ ]]; then
  echo "CURRENT_USER_ID must be numeric, got: $current_user_id" >&2
  exit 1
fi

compose() {
  docker compose -p "$project_name" -f "$compose_file" "$@"
}

psql_query() {
  local query="$1"
  compose exec -T db psql -U "$pg_user" -d "$pg_db" -Atc "$query"
}

echo "Running migrations..."
compose run --rm backend yarn db:migrate

users_count="$(psql_query 'SELECT count(*) FROM "Users";')"
regions_count="$(psql_query 'SELECT count(*) FROM "Regions";')"

if [ "$users_count" = "0" ] || [ "$regions_count" = "0" ]; then
  echo "Fresh database detected; running seeders..."
  compose run --rm backend yarn db:seed
fi

has_site_access="$(
  psql_query "SELECT count(*) FROM \"Permissions\" WHERE \"userId\" = ${current_user_id} AND \"scopeId\" = 1;"
)"

if [ "$has_site_access" = "0" ]; then
  echo "Ensuring SITE_ACCESS for user ${current_user_id}..."
  psql_query "INSERT INTO \"Users\" (\"id\", \"name\", \"hsesUsername\", \"homeRegionId\", \"createdAt\", \"updatedAt\", \"lastLogin\") VALUES (${current_user_id}, 'Local Dev User', 'local-dev-user-${current_user_id}', 1, now(), now(), now()) ON CONFLICT (\"id\") DO NOTHING;"
  psql_query "INSERT INTO \"Permissions\" (\"userId\", \"regionId\", \"scopeId\", \"createdAt\", \"updatedAt\") VALUES (${current_user_id}, 1, 1, now(), now()) ON CONFLICT (\"userId\", \"scopeId\", \"regionId\") DO NOTHING;"
fi

echo "Development database initialization complete."
