#!/bin/bash

# check_python_version_compatibility.sh
# Script to fetch the required Python version and compare with buildpack

# Read Python version from .python-version file
python_version_required=$(cat similarity_api/.python-version | tr -d '\r' | tr -d '\n')

# Fetch the latest release data from GitHub
latest_release_info=$(curl -s https://api.github.com/repos/cloudfoundry/python-buildpack/releases/latest)

# Parse the release data to extract supported Python versions using jq, grep, awk, and sort
supported_versions=$(echo "$latest_release_info" | jq -r '.body' | grep python | awk '{print $4}' | grep -vP '[^.0-9]' | sort -u)

# Check if the required version is supported by iterating over the array
version_found=0
for version in $supported_versions; do
  echo "Checking if $version == $python_version_required"
  if [[ "$version" == "$python_version_required" ]]; then
    version_found=1
    break
  fi
done

echo ""

if [[ $version_found -eq 1 ]]; then
  echo "Required Python version $python_version_required is supported."
  exit 0  # Exit with success
else
  echo "Required Python version $python_version_required is not supported."
  echo "Supported Versions: $supported_versions"
  exit 1  # Exit with error
fi
