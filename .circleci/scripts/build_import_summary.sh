#!/bin/bash

set -euo pipefail

ARTIFACT_DIR="${1:-import-artifacts}"
STATUS_FILE="${ARTIFACT_DIR}/import-status.json"
SUMMARY_FILE="${2:-monitoring-updates.txt}"

if [[ ! -f "$STATUS_FILE" ]]; then
  echo "Import status file not found: $STATUS_FILE" >&2
  exit 1
fi

overall_status=$(jq -r '.overallStatus' "$STATUS_FILE")
failed_phase=$(jq -r '.failedPhase // empty' "$STATUS_FILE")
partial_run=$(jq -r '.partialRun' "$STATUS_FILE")

{
  echo "Import data cron status: ${overall_status}"
  echo "Environment: $(jq -r '.targetEnv' "$STATUS_FILE")"
  echo "Started: $(jq -r '.startedAt' "$STATUS_FILE")"
  echo "Finished: $(jq -r '.finishedAt' "$STATUS_FILE")"
  if [[ -n "$failed_phase" ]]; then
    echo "Failed phase: ${failed_phase}"
  fi
  if [[ "$partial_run" == "true" ]]; then
    echo "Partial run: yes"
  fi
  echo
  echo "Phase results:"
  jq -r '.phases[] | "- \(.name): \(.status) (exit \(.exitCode))"' "$STATUS_FILE"
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
