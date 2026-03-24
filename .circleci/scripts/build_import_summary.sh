#!/bin/bash

set -euo pipefail

ARTIFACT_DIR="${1:-import-artifacts}"
STATUS_FILE="${ARTIFACT_DIR}/import-status.json"
SUMMARY_FILE="${2:-monitoring-updates.txt}"
EXPECTED_TASKS="${3:-6}"
LOGIN_LOG="${ARTIFACT_DIR}/logs/phase-login.log"

if [[ ! -f "$STATUS_FILE" ]]; then
  echo "Import status file not found: $STATUS_FILE" >&2
  exit 1
fi

task_count=$(jq '.taskRuns | length' "$STATUS_FILE")
failed_count=$(jq '[.taskRuns[] | select(.status != "SUCCEEDED")] | length' "$STATUS_FILE")
target_env=$(jq -r '.metadata.targetEnv // empty' "$STATUS_FILE")
started_at=$(jq -r '.metadata.startedAt // (.taskRuns[0].startedAt // empty)' "$STATUS_FILE")
finished_at=$(jq -r '.taskRuns[-1].finishedAt // empty' "$STATUS_FILE")

if [[ "$task_count" -eq "$EXPECTED_TASKS" && "$failed_count" -eq 0 ]]; then
  overall_status="SUCCEEDED"
else
  overall_status="FAILED"
fi

partial_run="false"
if [[ "$task_count" -lt "$EXPECTED_TASKS" ]]; then
  partial_run="true"
fi

failed_phase=$(jq -r '
  def phase_name:
    (.logFile // .taskName // "unknown")
    | split("/")
    | last
    | sub("^phase-"; "")
    | sub("\\.log$"; "");
  first(.taskRuns[]? | select(.status != "SUCCEEDED") | phase_name) // empty
' "$STATUS_FILE")

if [[ -z "$failed_phase" && "$task_count" -eq 0 && -f "$LOGIN_LOG" ]]; then
  failed_phase="login"
fi

{
  echo "Import data cron status: ${overall_status}"
  echo "Environment: ${target_env}"
  echo "Started: ${started_at}"
  echo "Finished: ${finished_at}"
  if [[ -n "$failed_phase" ]]; then
    echo "Failed phase: ${failed_phase}"
  fi
  if [[ "$partial_run" == "true" ]]; then
    echo "Partial run: yes"
  fi
  echo
  echo "Phase results:"
  jq -r '
    def phase_name:
      (.logFile // .taskName // "unknown")
      | split("/")
      | last
      | sub("^phase-"; "")
      | sub("\\.log$"; "");
    .taskRuns[] | "- \(phase_name): \(.status) (exit \(.exitCode))"
  ' "$STATUS_FILE"
} > "$SUMMARY_FILE"

report_log="${ARTIFACT_DIR}/logs/phase-report_updates.log"
if [[ -f "$report_log" ]]; then
  results=$(grep -o "Recent Monitoring Updates.*" "$report_log" | tail -n 1 || true)
  if [[ -n "$results" ]]; then
    delim=":"
    json_data=${results#*"$delim"}
    if [[ "$json_data" == " []" || "$json_data" == "[]" ]]; then
      echo >> "$SUMMARY_FILE"
      echo "Monitoring updates: none" >> "$SUMMARY_FILE"
    else
      goals=$(echo "$json_data" | jq -jr '.[] | .recipient, " (Region ", (.region | tostring), ")\n"' 2>/dev/null || true)
      if [[ -n "$goals" ]]; then
        echo >> "$SUMMARY_FILE"
        echo "Monitoring updates:" >> "$SUMMARY_FILE"
        printf '```%s```' "$goals" >> "$SUMMARY_FILE"
        echo >> "$SUMMARY_FILE"
      fi
    fi
  fi
fi

echo
cat "$SUMMARY_FILE"
