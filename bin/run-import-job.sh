#!/usr/bin/env bash

set -euo pipefail

current_step=""

on_error() {
  local exit_code=$?
  echo "RUN_IMPORT_JOB_FAILED step=${current_step:-unknown} exit_code=${exit_code}"
  exit "${exit_code}"
}

run_step() {
  current_step="$1"
  echo "RUN_IMPORT_JOB_START step=${current_step}"
  shift
  "$@"
  echo "RUN_IMPORT_JOB_SUCCESS step=${current_step}"
}

trap on_error ERR

run_step download node ./build/server/src/tools/importSystemCLI.js download 1
run_step process node ./build/server/src/tools/importSystemCLI.js process 1
run_step createMonitoringGoals yarn createMonitoringGoalsCLI
run_step queryMonitoringData node ./build/server/src/tools/queryMonitoringDataCLI.js
run_step maintainMonitoringData node ./build/server/src/tools/maintainMonitoringDataCLI.js
run_step updateMonitoringFactTables node ./build/server/src/tools/updateMonitoringFactTablesCLI.js
