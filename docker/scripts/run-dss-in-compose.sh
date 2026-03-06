#!/usr/bin/env bash

set -euo pipefail

compose_file="${TTA_DOCKER_DSS_COMPOSE_FILE:-docker/compose/dss.yml}"
project_name="${TTA_DOCKER_DSS_PROJECT:-ttahub-dss}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
reports_dir="${repo_root}/reports/server"

compose() {
  docker compose -p "$project_name" -f "$compose_file" "$@"
}

cleanup() {
  compose logs --no-color > "${reports_dir}/docker-compose.log" 2>/dev/null || true
  compose down --remove-orphans >/dev/null 2>&1 || true
  docker volume rm "${project_name}_dss-db-data" >/dev/null 2>&1 || true
}

trap cleanup EXIT

cd "$repo_root"
mkdir -p "$reports_dir"
rm -f "${reports_dir}"/*

compose down --remove-orphans >/dev/null 2>&1 || true

compose up -y -d --build --wait db
compose run --rm server yarn build
compose run --rm --entrypoint /workspace/docker/scripts/ensure-deps.sh server frontend yarn build
compose run --rm server yarn db:migrate:ci
compose up -y -d server

./bin/ping-server 8080 localhost "" 20

docker pull zaproxy/zap-stable:latest

server_container_id="$(compose ps -q server)"
if [ -z "${server_container_id}" ]; then
  echo "Unable to find running 'server' container from ${compose_file}" >&2
  compose ps >&2
  exit 1
fi

scan_network="$(docker inspect -f '{{range $k, $_ := .NetworkSettings.Networks}}{{printf "%s\n" $k}}{{end}}' "${server_container_id}" | head -n1)"
if [ -z "${scan_network}" ]; then
  echo "Unable to determine network for container ${server_container_id}" >&2
  docker inspect "${server_container_id}" >&2
  exit 1
fi

echo "Using Docker network for ZAP scan: ${scan_network}"
docker run \
  -v "${repo_root}/zap.conf:/zap/wrk/zap.conf:ro" \
  -v "${repo_root}/reports:/zap/wrk:rw" \
  --rm \
  --user "zap:$(id -g)" \
  --network="${scan_network}" \
  --platform linux/amd64 \
  -t zaproxy/zap-stable:latest zap-full-scan.py \
  -t http://server:8080 \
  -c /zap/wrk/zap.conf -I -i \
  -r "server/owasp_full_scan_report.html" \
  -J "server/owasp_full_scan_report.json" \
  -d | tee "${reports_dir}/owasp_full_scan.log"

node src/tools/clean-zap-report.js \
  "${reports_dir}/owasp_full_scan_report.html" \
  "${reports_dir}/owasp_full_scan_report_cleaned.html"
