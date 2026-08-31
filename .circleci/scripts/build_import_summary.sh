#!/bin/bash

set -euo pipefail

ARTIFACT_DIR="${1:-import-artifacts}"
STATUS_FILE="${ARTIFACT_DIR}/import-status.json"
SUMMARY_FILE="${2:-monitoring-updates.txt}"
EXPECTED_TASKS="${3:-8}"
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

# True when the gate itself failed the import: it exited nonzero (so the phase
# loop broke with failed_phase=validate_monitoring_gate) because of a blocking
# critical - distinguished from a gate execution error by the gate line's own
# status/criticalCount. Used only to word the critical section (blocked vs not);
# the criticals themselves are reported the same way regardless.
gate_blocked() {
  [[ "$failed_phase" == "validate_monitoring_gate" ]] || return 1
  [[ -f "$gate_log" ]] || return 1

  local line json_data status critical_count
  line=$(grep -o "Monitoring Gate: .*" "$gate_log" | tail -n 1 || true)
  [[ -n "$line" ]] || return 1
  json_data=${line#*: }
  status=$(echo "$json_data" | jq -r '.status // empty' 2>/dev/null || true)
  critical_count=$(echo "$json_data" | jq -r '.criticalCount // 0' 2>/dev/null || echo 0)

  [[ "$status" == "success" && "${critical_count:-0}" -gt 0 ]]
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

# Reports the gate result, and is called unconditionally after the primary body,
# so a critical always reaches the channel regardless of how it arose (report-only,
# a check off the halt list, or a block) or which phase failed. The critical data
# condition is the headline; whether it blocked the refresh is a clause on it. The
# benign "no critical / no result" confirmations are shown only on success, so a
# failure unrelated to data doesn't pick up confusing validation commentary.
# Parsed from the gate's single "Monitoring Gate: {...}" line. See
# docs/monitoring-data-validation.md ("Enforcement controls").
append_gate_summary() {
  local results
  local json_data
  local critical_count
  local critical
  local as_of
  local refresh_clause

  if [[ -f "$gate_log" ]]; then
    results=$(grep -o "Monitoring Gate: .*" "$gate_log" | tail -n 1 || true)
    if [[ -n "$results" ]]; then
      json_data=${results#*: }
      as_of=$(echo "$json_data" | jq -r '.asOf // empty' 2>/dev/null || true)
      critical_count=$(echo "$json_data" | jq -r '.criticalCount // 0' 2>/dev/null || echo 0)

      if [[ "${critical_count:-0}" -gt 0 ]]; then
        if gate_blocked; then
          refresh_clause="blocked the fact-table refresh"
        else
          refresh_clause="did not block the fact-table refresh"
        fi
        critical=$(echo "$json_data" | jq -jr '.alerts[]? | select(.severity == "critical") | .message, "\n"' 2>/dev/null || true)
        # Separate from any preceding primary body that didn't end in a newline.
        [[ -s "$SUMMARY_FILE" && -n "$(tail -c1 "$SUMMARY_FILE")" ]] && printf '\n' >> "$SUMMARY_FILE"
        {
          printf 'Monitoring Gate Criticals (as of %s) - %s: ```\n' "${as_of:-unknown}" "$refresh_clause"
          printf '%s\n' "$critical"
          printf '```\n'
        } >> "$SUMMARY_FILE"
        return
      fi

      # No criticals: confirm only on success.
      [[ "$overall_status" == "SUCCEEDED" ]] || return 0
      printf 'Monitoring Gate: no critical findings (as of %s)\n' "${as_of:-unknown}" >> "$SUMMARY_FILE"
      return
    fi
  fi

  # No gate line: confirm only on success.
  [[ "$overall_status" == "SUCCEEDED" ]] || return 0
  printf 'Monitoring Gate: no result found\n' >> "$SUMMARY_FILE"
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

  # A gate block is not a generic failure: skip the failure body and let the gate
  # section (appended unconditionally below) carry the critical and the block.
  if gate_blocked; then
    return
  fi

  failure_message=$(extract_failure_message "$failed_phase")
  {
    printf 'Monitoring job failure: ```\n'
    printf '%s\n' "$failure_message"
    printf '```'
  } > "$SUMMARY_FILE"
}

: > "$SUMMARY_FILE"
if [[ "$overall_status" == "SUCCEEDED" ]]; then
  write_success_summary
else
  write_failure_summary
fi
# Always report the gate result, so a critical always reaches the channel.
append_gate_summary

echo
cat "$SUMMARY_FILE"
