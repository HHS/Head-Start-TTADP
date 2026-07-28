#!/bin/bash

set -euo pipefail

ARTIFACT_DIR="${1:-import-artifacts}"
STATUS_FILE="${ARTIFACT_DIR}/import-status.json"
SUMMARY_FILE="${2:-monitoring-updates.txt}"
EXPECTED_TASKS="${3:-7}"
LOGIN_LOG="${ARTIFACT_DIR}/logs/phase-login.log"

if [[ ! -f "$STATUS_FILE" ]]; then
  echo "Import status file not found: $STATUS_FILE" >&2
  exit 1
fi

task_count=$(jq '.taskRuns | length' "$STATUS_FILE")
failed_count=$(jq '[.taskRuns[] | select(.status != "SUCCEEDED")] | length' "$STATUS_FILE")

if [[ "$task_count" -eq "$EXPECTED_TASKS" && "$failed_count" -eq 0 ]]; then
  overall_status="SUCCEEDED"
else
  overall_status="FAILED"
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

report_log="${ARTIFACT_DIR}/logs/phase-report_updates.log"

extract_failure_message() {
  local phase="$1"
  local log_file
  local error_line
  local fallback_line
  local ignore_pattern='^(PHASE_|Task .* status: |Starting task |Uploading|Waiting for task|Showing logs|OK$|[[:space:]]*$)'

  if [[ "$phase" == "login" ]]; then
    log_file="$LOGIN_LOG"
  else
    log_file="${ARTIFACT_DIR}/logs/phase-${phase}.log"
  fi

  if [[ -f "$log_file" ]]; then
    error_line=$(
      grep -Eiv "$ignore_pattern" "$log_file" \
        | grep -Ei '(error|failed|failure|exception|timed out|unable|not found|missing|invalid|denied)' \
        | tail -n 1 \
        | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' \
        || true
    )

    if [[ -n "$error_line" ]]; then
      printf '%s' "$error_line"
      return
    fi

    fallback_line=$(
      grep -Eiv "$ignore_pattern" "$log_file" \
        | tail -n 1 \
        | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' \
        || true
    )

    if [[ -n "$fallback_line" ]]; then
      printf '%s' "$fallback_line"
      return
    fi
  fi

  if [[ -n "$phase" ]]; then
    printf 'Phase failed: %s' "$phase"
  else
    printf 'Monitoring import failed'
  fi
}

validation_log="${ARTIFACT_DIR}/logs/phase-validate_monitoring_data.log"
gate_log="${ARTIFACT_DIR}/logs/phase-validate_monitoring_gate.log"

# When the pre-refresh gate blocks the import it exits nonzero, so the phase loop
# breaks and overall status is FAILED with failed_phase=validate_monitoring_gate.
# Format the block reason (the critical alerts) from the gate's single
# "Monitoring Gate: {...}" JSON line so Slack says why the refresh was prevented
# rather than a generic failure. Returns nonzero if no gate line was found, so
# the caller can fall back to the generic failure message.
append_gate_block_summary() {
  local results
  local json_data
  local critical
  local as_of

  [[ -f "$gate_log" ]] || return 1
  results=$(grep -o "Monitoring Gate: .*" "$gate_log" | tail -n 1 || true)
  [[ -n "$results" ]] || return 1

  json_data=${results#*: }
  as_of=$(echo "$json_data" | jq -r '.asOf // empty' 2>/dev/null || true)
  critical=$(echo "$json_data" | jq -jr '.alerts[]? | select(.severity == "critical") | .message, "\n"' 2>/dev/null || true)
  {
    printf 'Monitoring import BLOCKED - fact-table refresh prevented by critical validation (as of %s): ```\n' "${as_of:-unknown}"
    if [[ -n "$critical" ]]; then
      printf '%s\n' "$critical"
    else
      printf '%s\n' "$json_data"
    fi
    printf '```'
  } > "$SUMMARY_FILE"
}

# Appends a section for the validation phase's alerts to the summary file.
# The phase prints one "Monitoring Validation Alerts: {...}" JSON line
# (see src/tools/validateMonitoringData.ts).
append_validation_summary() {
  local results
  local json_data
  local alerts
  local as_of

  if [[ -f "$validation_log" ]]; then
    results=$(grep -o "Monitoring Validation Alerts: .*" "$validation_log" | tail -n 1 || true)
    if [[ -n "$results" ]]; then
      json_data=${results#*: }
      as_of=$(echo "$json_data" | jq -r '.asOf // empty' 2>/dev/null || true)
      alerts=$(echo "$json_data" | jq -jr '.alerts[]? | .message, "\n"' 2>/dev/null || true)
      if [[ -n "$alerts" ]]; then
        {
          printf 'Monitoring Validation Alerts (as of %s): ```\n' "${as_of:-unknown}"
          printf '%s\n' "$alerts"
          printf '```\n'
        } >> "$SUMMARY_FILE"
      else
        printf 'Monitoring Validation (as of %s): no alerts\n' "${as_of:-unknown}" >> "$SUMMARY_FILE"
      fi
      return
    fi
  fi

  printf 'Monitoring Validation: no result found\n' >> "$SUMMARY_FILE"
}

write_success_summary() {
  local results
  local json_data
  local goals

  if [[ -f "$report_log" ]]; then
    results=$(grep -o "Recent Monitoring Updates.*" "$report_log" | tail -n 1 || true)
    if [[ -n "$results" ]]; then
      json_data=${results#*:}
      goals=$(echo "$json_data" | jq -jr '.[] | .recipient, " (Region ", (.region | tostring), ")\n"' 2>/dev/null || true)
      if [[ -n "$goals" ]]; then
        {
          printf 'Monitoring Updates: ```\n'
          printf '%s\n' "$goals"
          printf '```\n'
        } > "$SUMMARY_FILE"
        append_validation_summary
        return
      fi
    fi
  fi

  printf 'Monitoring Updates: none\n' > "$SUMMARY_FILE"
  append_validation_summary
}

write_failure_summary() {
  local failure_message

  if [[ "$failed_phase" == "validate_monitoring_gate" ]] && append_gate_block_summary; then
    return
  fi

  failure_message=$(extract_failure_message "$failed_phase")
  {
    printf 'Monitoring job failure: ```\n'
    printf '%s\n' "$failure_message"
    printf '```'
  } > "$SUMMARY_FILE"
}

if [[ "$overall_status" == "SUCCEEDED" ]]; then
  write_success_summary
else
  write_failure_summary
fi

echo
cat "$SUMMARY_FILE"
