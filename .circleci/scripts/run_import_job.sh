#!/bin/bash

set -u
set -o pipefail

TARGET_ENV="${1:-}"
APP_NAME="${2:-}"
ARTIFACT_DIR="${3:-import-artifacts}"
STATUS_FILE="${ARTIFACT_DIR}/import-status.json"
LOG_DIR="${ARTIFACT_DIR}/logs"

if [[ -z "$TARGET_ENV" ]]; then
  echo "TARGET_ENV is required" >&2
  exit 1
fi

if [[ -z "$APP_NAME" ]]; then
  APP_NAME="tta-smarthub-${TARGET_ENV}"
fi

mkdir -p "$LOG_DIR"

PHASE_NAMES=(
  "download"
  "process"
  "create_monitoring_goals"
  "maintain_monitoring_data"
  "update_fact_tables"
  "report_updates"
)

PHASE_COMMANDS=(
  "yarn cli:import-system download 1"
  "yarn cli:import-system process 1"
  "yarn cli:create-monitoring-goals"
  "yarn cli:maintain-monitoring-data"
  "yarn cli:updateMonitoringFactTables"
  "yarn cli:query-monitoring-data"
)

phase_log_path() {
  echo "${LOG_DIR}/phase-${1}.log"
}

iso_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

init_status_file() {
  local started_at
  started_at=$(iso_now)
  jq -n \
    --arg target_env "$TARGET_ENV" \
    --arg app_name "$APP_NAME" \
    --arg started_at "$started_at" \
    --arg trigger_source "${CIRCLE_PIPELINE_TRIGGER_SOURCE:-unknown}" \
    '{
      targetEnv: $target_env,
      appName: $app_name,
      triggerSource: $trigger_source,
      startedAt: $started_at,
      finishedAt: null,
      overallStatus: "RUNNING",
      failedPhase: null,
      partialRun: false,
      phases: []
    }' > "$STATUS_FILE"
}

append_phase_status() {
  local phase_name="$1"
  local status="$2"
  local command="$3"
  local exit_code="$4"
  local started_at="$5"
  local finished_at="$6"
  local task_name="$7"
  local log_file="$8"

  local tmp_file
  tmp_file=$(mktemp)
  jq \
    --arg phase_name "$phase_name" \
    --arg status "$status" \
    --arg command "$command" \
    --arg started_at "$started_at" \
    --arg finished_at "$finished_at" \
    --arg task_name "$task_name" \
    --arg log_file "$log_file" \
    --argjson exit_code "$exit_code" \
    '.phases += [{
      name: $phase_name,
      status: $status,
      command: $command,
      exitCode: $exit_code,
      startedAt: $started_at,
      finishedAt: $finished_at,
      taskName: ($task_name | select(length > 0)),
      logFile: $log_file
    }]' "$STATUS_FILE" > "$tmp_file"
  mv "$tmp_file" "$STATUS_FILE"
}

set_overall_status() {
  local tmp_file
  tmp_file=$(mktemp)
  jq \
    --arg overall_status "$1" \
    --arg failed_phase "$2" \
    --arg finished_at "$(iso_now)" \
    --argjson partial_run "$3" \
    '.overallStatus = $overall_status
    | .failedPhase = ($failed_phase | if length == 0 then null else . end)
    | .finishedAt = $finished_at
    | .partialRun = $partial_run' "$STATUS_FILE" > "$tmp_file"
  mv "$tmp_file" "$STATUS_FILE"
}

login_cf() {
  if [[ -z "${cg_api:-}" || -z "${cg_username:-}" || -z "${cg_password:-}" || -z "${cg_org:-}" || -z "${cg_space:-}" ]]; then
    echo "Missing Cloud Foundry credentials for ${TARGET_ENV}" >&2
    return 1
  fi
  echo "Logging into Cloud Foundry for ${TARGET_ENV}"
  cf login -a "${cg_api}" \
    -u "${cg_username}" \
    -p "${cg_password}" \
    -o "${cg_org}" \
    -s "${cg_space}"
}

logout_cf() {
  cf logout >/dev/null 2>&1 || true
}

run_phase_task() {
  local phase_name="$1"
  local command="$2"
  local task_name="$3"
  local log_file="$4"

  echo "PHASE_START ${phase_name} ${task_name}" | tee -a "$log_file"
  cf run-task "$APP_NAME" --command "$command" --name "$task_name" -m 2GB -k 2GB >>"$log_file" 2>&1
  local run_task_exit=$?
  if [[ $run_task_exit -ne 0 ]]; then
    echo "PHASE_FAILURE ${phase_name} failed to start task" | tee -a "$log_file"
    return $run_task_exit
  fi

  ./bin/watch-task.js "$APP_NAME" "$task_name" >>"$log_file" 2>&1
  local watch_exit=$?

  cf logs "$APP_NAME" --recent | grep -F "$task_name" >>"$log_file" 2>&1 || true

  if [[ $watch_exit -eq 0 ]]; then
    echo "PHASE_SUCCESS ${phase_name}" | tee -a "$log_file"
    return 0
  fi

  echo "PHASE_FAILURE ${phase_name}" | tee -a "$log_file"
  return $watch_exit
}

mark_remaining_phases_skipped() {
  local start_index="$1"
  local idx
  for ((idx=start_index; idx<${#PHASE_NAMES[@]}; idx+=1)); do
    local phase_name="${PHASE_NAMES[$idx]}"
    local command="${PHASE_COMMANDS[$idx]}"
    local log_file
    log_file=$(phase_log_path "$phase_name")
    local started_at
    started_at=$(iso_now)
    echo "PHASE_SKIPPED ${phase_name}" | tee -a "$log_file"
    append_phase_status "$phase_name" "SKIPPED" "$command" 0 "$started_at" "$(iso_now)" "" "$log_file"
  done
}

main() {
  init_status_file

  if ! login_cf; then
    echo "Cloud Foundry login failed" | tee "${LOG_DIR}/phase-login.log"
    append_phase_status "login" "FAILED" "cf login" 1 "$(iso_now)" "$(iso_now)" "" "${LOG_DIR}/phase-login.log"
    set_overall_status "FAILED" "login" false
    exit 0
  fi

  local idx
  local any_success=false
  local failed_phase=""
  local partial_run=false

  for ((idx=0; idx<${#PHASE_NAMES[@]}; idx+=1)); do
    local phase_name="${PHASE_NAMES[$idx]}"
    local command="${PHASE_COMMANDS[$idx]}"
    local log_file
    log_file=$(phase_log_path "$phase_name")
    local started_at
    started_at=$(iso_now)
    local task_name
    task_name="import-${phase_name}-${TARGET_ENV}-${CIRCLE_BUILD_NUM:-local}-${RANDOM}"

    if run_phase_task "$phase_name" "$command" "$task_name" "$log_file"; then
      append_phase_status "$phase_name" "SUCCEEDED" "$command" 0 "$started_at" "$(iso_now)" "$task_name" "$log_file"
      any_success=true
    else
      local phase_exit=$?
      append_phase_status "$phase_name" "FAILED" "$command" "$phase_exit" "$started_at" "$(iso_now)" "$task_name" "$log_file"
      failed_phase="$phase_name"
      if [[ "$any_success" == true ]]; then
        partial_run=true
      fi
      mark_remaining_phases_skipped "$((idx + 1))"
      break
    fi
  done

  if [[ -n "$failed_phase" ]]; then
    set_overall_status "FAILED" "$failed_phase" "$partial_run"
  else
    set_overall_status "SUCCEEDED" "" false
  fi

  logout_cf
  exit 0
}

main "$@"
