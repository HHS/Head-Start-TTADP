#!/bin/bash

set -euo pipefail
set -x

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
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

if [[ -z "${env_list:-}" || -z "${env_state:-}" || -z "${check_activity:-}" || -z "${cg_api:-}" || -z "${cg_org:-}" ]]; then
  echo "Error: Missing required arguments."
  exit 1
fi

# Define prefixes for environments
primary_prefix="tta-smarthub"
secondary_prefixes=("tta-similarity-api")

# Convert the comma-separated list into an array using substitution
apps=(${env_list//,/ })

for env in "${apps[@]}"; do
  echo "Processing environment group: $env"

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

  # Perform activity check only for the primary prefix (tta-smarthub)
  if [[ "$check_activity" == "true" && "$env_state" == "stop" ]]; then
    app_name="${primary_prefix}-${env_suffix}"
    echo "Checking activity for $app_name..."

    # Get the last activity timestamp for the app
    last_activity=$(cf logs --recent "$app_name" | grep "\"label\":\"REQUEST\"" | grep "api" | awk '{print $1}' | tail -n 1)

    if [ -z "$last_activity" ]; then
      # Default to 12 hours if no activity found
      activity_duration=43200
    else
      # Calculate duration in seconds
      activity_duration=$(( $(date +%s) - $(date -ud "${last_activity}" +%s) ))
    fi

    echo "Last activity duration for $app_name: $activity_duration seconds"
    
    # Get the last power-on timestamp for the app
    last_power_on=$(cf events "$app_name" | grep "audit.app.start" | awk '{print $1, $2}' | tail -n 1)

    if [ -z "$last_power_on" ]; then
      # Default to an arbitrarily long time ago if no power-on event found
      power_on_duration=43200
    else
      # Calculate power-on duration in seconds
      power_on_duration=$(( $(date +%s) - $(date -ud "${last_power_on}" +%s) ))
    fi

    echo "Last power-on duration for $app_name: $power_on_duration seconds"

    if [ "$activity_duration" -le $(($activity_timeout * 60)) ] || [ "$power_on_duration" -le $(($activity_timeout * 60)) ]; then
      echo "$app_name has been active or powered on within the last $activity_timeout minutes. No action taken."
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
        exit 1
        ;;
    esac
  done
done
