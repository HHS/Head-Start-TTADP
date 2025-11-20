#!/bin/bash

set -euo pipefail

# Usage: manage_apps.sh --env_list <env_list> --env_state <env_state> --check_activity <check_activity> --cg_api <cg_api> --cg_org <cg_org>

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --env_list) env_list="$2"; shift ;;
    --env_state) env_state="$2"; shift ;;
    --check_activity) check_activity="$2"; shift ;;
    --activity_timeout) activity_timeout=$2; shift ;;
    --cg_api) cg_api="$2"; shift ;;
    --cg_org) cg_org="$2"; shift ;;
    --branch) branch="$2"; shift ;;
    --build) build="$2"; shift ;;
    --job) job="$2"; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

if [[ -z "${env_list:-}" || -z "${env_state:-}" || -z "${check_activity:-}" || -z "${cg_api:-}" || -z "${cg_org:-}" || -z "${branch:-}" || -z "${build:-}" || -z "${job:-}" ]]; then
  echo "Error: Missing required arguments."
  exit 1
fi

# Define prefixes for environments
primary_prefix="tta-smarthub"
secondary_prefixes=()

# Convert the comma-separated list into an array using substitution
apps=(${env_list//,/ })

for env in "${apps[@]}"; do
  echo "Processing environment group: $env"

  # Check if the environment is PROD
  if [ "$env" == "PROD" ]; then
    echo "Error: Cannot process the PROD environment. Exiting."
    exit 1
  fi

  # Normalize environment name to lowercase for suffix
  env_suffix=$(echo "${env}" | tr '[:upper:]' '[:lower:]')

  # Dynamically derive variable names for environment
  space_var="CLOUDGOV_${env^^}_SPACE"
  username_var="CLOUDGOV_${env^^}_USERNAME"
  password_var="CLOUDGOV_${env^^}_PASSWORD"

  # Resolve the actual values of the variables
  space="${!space_var:-}"
  username="${!username_var:-}"
  password="${!password_var:-}"

  if [[ -z "$space" || -z "$username" || -z "$password" ]]; then
    echo "Error: Missing required environment variable(s) for $env"
    exit 1
  fi

  # Log in to Cloud Foundry
  cf login \
    -a "$cg_api" \
    -u "$username" \
    -p "$password" \
    -o "$cg_org" \
    -s "$space"

  ./automation/ci/scripts/acquire-lock.sh \
    "$env" \
    "$branch" \
    "$build" \
    "$job"

  # Perform activity check only for the primary prefix (tta-smarthub)
  if [[ "$check_activity" == "true" && "$env_state" == "stop" ]]; then
    app_name="${primary_prefix}-${env_suffix}"

    current_state=$(cf apps | grep "${app_name}" | awk '{print $2}' || echo "unknown")
    if [ "$current_state" == "stopped" ]; then
          echo "$app_name is already stopped."

          ./automation/ci/scripts/release-lock.sh \
            "$env" \
            "$branch" \
            "$build" \
            "$job"
      continue
    fi

    echo "Fetching recent logs for $app_name..."

    # Safely fetch recent logs
    recent_logs=$(cf logs --recent "$app_name" 2>/dev/null || echo "")

    # Check if logs are empty
    if [[ -z "$recent_logs" ]]; then
      echo "No recent logs found for $app_name. Defaulting activity duration to 43200 seconds (12 hours)."
      activity_duration=43200
    else
      # Filter for logs containing '"label":"REQUEST"' and "api"
      request_logs=$(echo "$recent_logs" | grep '"label":"REQUEST"' | grep "api" || echo "")

      if [[ -z "$request_logs" ]]; then
        echo "No matching activity logs found for $app_name. Defaulting activity duration to 43200 seconds (12 hours)."
        activity_duration=43200
      else
        # Extract the last activity timestamp
        last_activity=$(echo "$request_logs" | awk '{print $1}' | tail -n 1 || echo "")

        if [[ -z "$last_activity" ]]; then
          echo "Failed to extract activity timestamp. Defaulting activity duration to 43200 seconds (12 hours)."
          activity_duration=43200
        else
          # Safely calculate duration in seconds
          current_time=$(date +%s)
          activity_time=$(date -ud "$last_activity" +%s 2>/dev/null || echo "0")

          if [[ "$activity_time" -eq "0" ]]; then
            echo "Invalid timestamp for last activity. Defaulting activity duration to 43200 seconds (12 hours)."
            activity_duration=43200
          else
            activity_duration=$((current_time - activity_time))
          fi
        fi
      fi
    fi

    echo "Last activity duration for $app_name: $activity_duration seconds"

    echo "Fetching power-on events for $app_name..."

    # Get events output safely
    events_output=$(cf events "$app_name" 2>/dev/null || echo "")

    # Check if events_output is empty
    if [[ -z "$events_output" ]]; then
      echo "No events found for $app_name. Defaulting power-on duration to 43200 seconds (12 hours)."
      power_on_duration=43200
    else
      # Filter for 'audit.app.start' and check if any matches are found
      audit_start_events=$(echo "$events_output" | grep "audit.app.start" || echo "")

      if [[ -z "$audit_start_events" ]]; then
        echo "No 'audit.app.start' event found for $app_name. Defaulting power-on duration to 43200 seconds (12 hours)."
        power_on_duration=43200
      else
        # Extract the last 'audit.app.start' timestamp
        last_power_on=$(echo "$audit_start_events" | awk '{print $1, $2}' | tail -n 1 || echo "")

        if [[ -z "$last_power_on" ]]; then
          echo "Failed to extract timestamp for 'audit.app.start'. Defaulting power-on duration to 43200 seconds (12 hours)."
          power_on_duration=43200
        else
          # Safely calculate duration in seconds
          current_time=$(date +%s)
          power_on_time=$(date -ud "$last_power_on" +%s 2>/dev/null || echo "0")

          if [[ "$power_on_time" -eq "0" ]]; then
            echo "Invalid timestamp for last power-on. Defaulting power-on duration to 43200 seconds (12 hours)."
            power_on_duration=43200
          else
            power_on_duration=$((current_time - power_on_time))
          fi
        fi
      fi
    fi

    echo "Last power-on duration for $app_name: $power_on_duration seconds"

    if [ "$activity_duration" -le $(($activity_timeout * 60)) ] || [ "$power_on_duration" -le $(($activity_timeout * 60)) ]; then
      echo "$app_name has been active or powered on within the last $activity_timeout minutes. No action taken."

      ./automation/ci/scripts/release-lock.sh \
        "$env" \
        "$branch" \
        "$build" \
        "$job"
      continue
    fi
  fi

  # Perform the desired action on all apps in the environment group
  for prefix in "$primary_prefix" "${secondary_prefixes[@]}"; do
    app_name="${prefix}-${env_suffix}"
    echo "Processing app: $app_name"

    # Get the current state of the app
    current_state=$(cf apps | grep "$app_name" | awk '{print $2}' || echo "unknown")
    echo "Current state of $app_name: $current_state"

    # Perform the desired action
    case "$env_state" in
      stop)
        if [[ "$current_state" != "stopped" ]]; then
          echo "Stopping $app_name..."
          cf stop "$app_name"
        else
          echo "$app_name is already stopped."
        fi
        ;;
      start)
        if [[ "$current_state" != "started" ]]; then
          echo "Starting $app_name..."
          cf start "$app_name"
        else
          echo "$app_name is already started."
        fi
        ;;
      restart)
        echo "Restarting $app_name..."
        cf restart "$app_name"
        ;;
      restage)
        echo "Restaging $app_name..."
        cf restage "$app_name"
        ;;
      *)
        echo "Unknown env_state: $env_state"

        ./automation/ci/scripts/release-lock.sh \
          "$env" \
          "$branch" \
          "$build" \
          "$job"

        exit 1
        ;;
    esac
  done

  ./automation/ci/scripts/release-lock.sh \
    "$env" \
    "$branch" \
    "$build" \
    "$job"
done
