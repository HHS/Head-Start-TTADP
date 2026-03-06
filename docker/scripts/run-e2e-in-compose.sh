#!/usr/bin/env bash

set -euo pipefail

project_name="${E2E_PROJECT:-ttahub-e2e}"
compose_file="${E2E_COMPOSE_FILE:-docker/compose/test.yml}"
compose_override_file="${E2E_COMPOSE_OVERRIDE_FILE:-docker/compose/test.e2e.yml}"
suite_mode="${E2E_SUITES:-all}"
reset_db="${E2E_RESET_DB:-true}"
install_browsers="${E2E_INSTALL_BROWSERS:-false}"
e2e_current_user_id="${E2E_CURRENT_USER_ID:-5}"
project_label="${TTA_DOCKER_LABEL:-com.ttahub.project=head-start-ttadp}"

compose() {
  local args=(-p "$project_name" -f "$compose_file")
  if [ -n "$compose_override_file" ] && [ -f "$compose_override_file" ]; then
    args+=(-f "$compose_override_file")
  fi
  args+=(--profile e2e)
  TTA_DOCKER_LABEL="$project_label" E2E_CURRENT_USER_ID="$e2e_current_user_id" docker compose "${args[@]}" "$@"
}

require_playwright_browsers() {
  node <<'NODE'
const fs = require('fs');
const pw = require('@playwright/test');

const executable = pw.chromium.executablePath();
if (!executable || !fs.existsSync(executable)) {
  console.error('Playwright Chromium binary is not installed.');
  console.error('Run: yarn playwright install');
  process.exit(1);
}
NODE
}

require_playwright_can_launch_chromium() {
  node <<'NODE'
const pw = require('@playwright/test');

(async () => {
  try {
    const browser = await pw.chromium.launch({ headless: true });
    await browser.close();
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    console.error('Playwright Chromium check failed: ' + message);
    process.exit(1);
  }
})();
NODE
}

run_suite() {
  local suite="$1"

  case "$suite" in
    app)
      TTA_SMART_HUB_URI="http://localhost:3000" PLAYWRIGHT_WORKERS=1 yarn test:e2e
      ;;
    api)
      PLAYWRIGHT_WORKERS=1 yarn test:e2e:api
      ;;
    utils)
      PLAYWRIGHT_WORKERS=1 yarn test:e2e:utils
      ;;
    *)
      echo "Unsupported suite: $suite" >&2
      exit 1
      ;;
  esac
}

main() {
  case "$suite_mode" in
    all|app|api|utils) ;;
    *)
      echo "E2E_SUITES must be one of: all|app|api|utils (got: $suite_mode)" >&2
      exit 1
      ;;
  esac

  if [ "$install_browsers" = "true" ]; then
    yarn playwright install
  else
    require_playwright_browsers
  fi

  if [ "$suite_mode" = "all" ] || [ "$suite_mode" = "app" ]; then
    require_playwright_can_launch_chromium
  fi

  if [ "$reset_db" = "true" ]; then
    compose down --remove-orphans >/dev/null 2>&1 || true
    docker volume rm \
      "${project_name}_db-data" \
      "${project_name}_redis-data" \
      >/dev/null 2>&1 || true
  fi

  compose up -y -d --wait db redis
  compose run --rm backend yarn db:migrate
  compose run --rm backend yarn db:seed
  compose up -y -d --wait backend frontend testingonly mailpit
  ./bin/ping-server 3000
  ./bin/ping-server 9999 localhost "/testingonly"

  if [ "$suite_mode" = "all" ]; then
    run_suite app
    run_suite api
    run_suite utils
  else
    run_suite "$suite_mode"
  fi

  echo
  echo "E2E compose stack is running (project: $project_name)."
  compose ps
}

main "$@"
