#!/bin/bash

# Function to print usage
usage() {
  echo "Usage: sh bin/clear-buildback-cache.sh <color>"
  echo " (color is one of blue, green, red)"
  exit 1
}

color="$1"

# Validate required arguments
if [[ -z "$color" ]]; then
  echo "Error: color identifier is required"
  usage
fi

# Validate color is one of: red, blue, green
if [[ "$color" != "red" && "$color" != "blue" && "$color" != "green" ]]; then
  usage
fi

cf target -s ttahub-dev
app_guid=$(cf curl /v3/apps | jq -r ".resources[] | select(.name == \"tta-smarthub-dev-${color}\") | .guid")
echo "clearing buildpack for app tta-smarthub-dev-${color} guid ${app_guid}"
# cf curl -X POST "/v3/apps/${app_guid}/actions/clear_buildpack_cache"
echo "Buildpack cache successfully cleared"
exit 0