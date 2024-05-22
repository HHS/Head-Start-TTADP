#!/bin/bash

# Exit Codes:
# 0 - Installation directory already exists, no installation needed
# 1 - General error
# 2 - Failed to download AWS CLI
# 3 - Failed to unzip AWS CLI package
# 4 - Failed to install AWS CLI
# 5 - AWS CLI verification failed
# 6 - Parameter validation failed
# 7 - Missing files or directories during cleanup

# Set bash flags
set -e
set -u
set -o pipefail
set -o noglob
set -o noclobber

# Logging function
function log() {
    local type="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $type: $message" >&2
}

# Parameter Validation
function validate_parameters() {
    local param="$1"
    if [[ -z "${param}" ]]; then
        log "ERROR" "Parameter is unset or empty."
        exit 6
    fi
}

# Function to check if the installation directory exists
function check_install_dir() {
    local install_dir="$1"  # Pass the installation directory as an argument

    validate_parameters "$install_dir"

    # Check if the directory exists
    if [ -d "$install_dir" ]; then
        log "INFO" "Installation directory $install_dir already exists. Exiting the script."
        exit 0
    else
        log "INFO" "Installation directory $install_dir does not exist. Continuing with installation."
    fi
}

# Function to download AWS CLI
function download_aws_cli() {
    local aws_cli_url="$1"
    local zip_file="$2"

    validate_parameters "$aws_cli_url"
    validate_parameters "$zip_file"

    log "INFO" "Downloading AWS CLI..."
    if ! wget "$aws_cli_url" -O "$zip_file"; then
        log "ERROR" "Failed to download AWS CLI."
        exit 2
    fi

    if command -v gpg > /dev/null 2>&1; then
      if ! wget "$aws_cli_url.sig" -O "$zip_file.sig"; then
          log "ERROR" "Failed to download AWS CLI."
          exit 2
      fi

      if ! gpg --verify "${sig_file}" "${file}"; then
          log "ERROR" "Sig verification failed for AWS CLI."
          exit 2
      fi
    fi
    log "INFO" "Download completed successfully."
}

function verify_file_hash() {
    local file_name="$1"
    local expected_hash="$2"

    log "INFO" "Verifying hash of the downloaded file..."
    local computed_hash=$(sha256sum "$file_name" | awk '{print $1}')

    if [ "$computed_hash" == "$expected_hash" ]; then
        log "INFO" "Hash verification successful."
    else
        log "ERROR" "Hash verification failed. Computed hash: $computed_hash, expected hash: $expected_hash."
        exit 3
    fi
}

# Function to install AWS CLI
function install_aws_cli() {
    local zip_file="$1"
    local install_dir="$2"
    local bin_dir="$3"

    validate_parameters "$zip_file"
    validate_parameters "$install_dir"
    validate_parameters "$bin_dir"

    log "INFO" "Installing AWS CLI..."
    if ! unzip -l "$zip_file" |\
      grep -vE 'examples|docutils' |\
      awk 'NR>3 {print $4}' |\
      xargs -I {} unzip -o "$zip_file" {} -d "/tmp/local"; then
        log "ERROR" "Failed to unzip AWS CLI package."
        exit 3
    fi
    if ! /tmp/local/aws/install -i "$install_dir" -b "$bin_dir"; then
        log "ERROR" "Failed to install AWS CLI."
        exit 4
    fi
    log "INFO" "Installation completed successfully."
}

# Function to verify installation
function verify_installation() {
    local bin_dir="$1"

    validate_parameters "$bin_dir"

    log "INFO" "Verifying AWS CLI installation..."
    local aws_version
    if ! aws_version=$("$bin_dir/aws" --version); then
        log "ERROR" "Verification failed."
        exit 5
    fi
    log "INFO" "AWS CLI is installed successfully: $aws_version"
}


# Function to clean up installation files
function cleanup() {
    local zip_file="$1"
    local aws_dir="$2"

    validate_parameters "$zip_file"
    validate_parameters "$aws_dir"

    log "INFO" "Cleanup install files"
    if [ -f "$zip_file" ]; then
        rm "$zip_file"
        log "INFO" "The zip file has been deleted."
    else
        log "INFO" "The zip file does not exist."
    fi
    if [ -f "$zip_file.sig" ]; then
        rm "$zip_file.sig"
        log "INFO" "The zip sig file has been deleted."
    else
        log "INFO" "The zip file does not exist."
    fi
    if [ -d "$aws_dir" ]; then
        rm -r "$aws_dir"
        log "INFO" "The 'aws' directory has been deleted."
    else
        log "INFO" "The 'aws' directory does not exist."
    fi
}

# Main function to control workflow
main() {
    local aws_cli_url="https://awscli.amazonaws.com/awscli-exe-linux-x86_64-2.15.56.zip"
    local install_dir="/tmp/local/aws-cli"
    local zip_file="/tmp/awscliv2.zip"
    local zip_sha256="f68d3cc42d08a346b55aa531bcc2a0320700e374d87a3282a0f7e48c0f75bff7"
    local bin_dir="/tmp/local/bin"
    local aws_dir="/tmp/local/aws"

    check_install_dir "${install_dir}"
    download_aws_cli "${aws_cli_url}" "${zip_file}"
    verify_file_hash "${zip_file}" "${zip_sha256}"
    install_aws_cli "${zip_file}" "${install_dir}" "${bin_dir}"
    verify_installation "${bin_dir}"
    cleanup "${zip_file}" "${aws_dir}"
}

# Calling the main function
main
