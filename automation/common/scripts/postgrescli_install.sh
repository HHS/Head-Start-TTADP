#!/bin/bash

# Exit Codes:
# 0 - All tools are already installed
# 1 - General error
# 2 - Failed to download PostgreSQL deb package
# 3 - Failed to change to the directory 'extract-deb'
# 4 - PostgreSQL tool not found in the deb package
# 5 - Failed to change back to the previous directory
# 6 - Verification of PostgreSQL tool installation failed

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
        exit 1
    fi
}

# Export Validation
function validate_exports() {
    local param="$1"

    # Check if the parameter is set and exported
    if ! declare -p "$param" &>/dev/null; then
        log "ERROR" "Parameter '$param' is unset."
        exit 1
    elif [[ "$(declare -p "$param")" != *"export"* ]]; then
        log "ERROR" "Parameter '$param' is not exported."
        exit 1
    fi
}

# Function to check for required dependencies
function check_dependencies() {
    local dependencies=("$@")
    for dep in "${dependencies[@]}"; do
        if ! type "${dep}" > /dev/null 2>&1; then
            log "ERROR" "Dependency ${dep} is not installed."
            exit 1
        fi
    done
}

# Function to check if the installation directory exists and verify tools
function check_install_dir_and_verify_tools() {
    local install_dir="$1"
    local tools=("${@:2}")
    local all_tools_installed=true

    validate_parameters "$install_dir"

    # Check if the directory exists and verify each tool
    if [ -d "$install_dir" ]; then
        log "INFO" "Installation directory $install_dir exists."
        for tool in "${tools[@]}"; do
            if ! [ -f "$install_dir/$tool" ]; then
                log "WARNING" "$tool is missing in the installation directory."
                all_tools_installed=false
                break
            fi
        done

        if [ "$all_tools_installed" = true ]; then
            log "INFO" "All necessary tools are already installed. Exiting the script."
            exit 0
        else
            log "INFO" "Some tools are missing. Continuing with installation."
        fi
    else
        log "INFO" "Installation directory $install_dir does not exist. Continuing with installation."
    fi
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

# Function to download the PostgreSQL deb package
function download_postgresql_deb() {
    local deb_url="$1"
    local deb_file="$2"

    validate_parameters "$deb_url"
    validate_parameters "$deb_file"

    log "INFO" "Downloading PostgreSQL deb package..."
    if ! wget "$deb_url" -O "$deb_file"; then
        log "ERROR" "Failed to download PostgreSQL deb package."
        exit 2
    fi
    log "INFO" "Download completed successfully."
}

# Function to extract and install PostgreSQL tools
function install_pg_tools() {
    local deb_file="$1"
    local bin_dir="$2"
    local tools=("${@:3}")

    # Validate parameters
    validate_parameters "$deb_file"
    validate_parameters "$bin_dir"

    # Starting in the current directory
    local start_dir=$(pwd)

    # Trap to ensure returning to the starting directory on any exit
    cd "$(dirname "${deb_file}")"

    log "INFO" "Extracting PostgreSQL tools from deb package..."
    mkdir -p extract-deb
    # Safely change directory
    if ! cd extract-deb; then
        log "ERROR" "Failed to change directory to extract-deb."
        cd "$start_dir"
        exit 3
    fi

    ar x "$deb_file"
    tar -xf data.tar.xz
    for tool in "${tools[@]}"; do
        if [ -f "./usr/lib/postgresql/15/bin/$tool" ]; then
            cp "./usr/lib/postgresql/15/bin/$tool" "$bin_dir"
            log "INFO" "$tool installation completed successfully."
        else
            log "ERROR" "$tool not found in the deb package."
            cd "$start_dir"
            exit 4
        fi
    done

    cd "$start_dir"
}



# Function to verify installation of tools
function verify_installation() {
    local bin_dir="$1"
    local tools=("${@:2}")

    validate_parameters "$bin_dir"

    log "INFO" "Verifying installation of tools..."
    local tool_version
    for tool in "${tools[@]}"; do
        if ! tool_version=$("$bin_dir/$tool" --version); then
            log "ERROR" "Verification failed for $tool."
            exit 6
        fi
        log "INFO" "$tool is installed successfully: $tool_version"
    done
}


# Function to clean up installation files and temporary directories
function cleanup() {
    local deb_file="$1"

    # Validate the parameter
    validate_parameters "$deb_file"

    log "INFO" "Cleanup install files and temporary directories"

    # Derive the directory where the deb file is located
    local deb_dir=$(dirname "$deb_file")
    local deb_basename=$(basename "$deb_file")

    # Use the directory path to check and remove the deb file
    if [ -f "$deb_file" ]; then
        rm "$deb_file"
        log "INFO" "The deb file has been deleted."
    else
        log "INFO" "The deb file does not exist."
    fi

    # Change to the directory of the deb file before removing the extract-deb directory
    if pushd "$deb_dir" > /dev/null 2>&1; then
        if [ -d "extract-deb" ]; then
            rm -r "extract-deb"
            log "INFO" "Temporary extraction directory has been deleted."
        else
            log "INFO" "No temporary extraction directory to delete."
        fi
        popd > /dev/null 2>&1
    else
        log "ERROR" "Failed to change directory to where the deb file is located."
    fi
}



# Main function to control workflow
function main() {
    local deb_url="https://security.debian.org/debian-security/pool/updates/main/p/postgresql-15/postgresql-client-15_15.10-0+deb12u1_amd64.deb"
    local deb_file="/tmp/postgresql.deb"
    local deb_sha256="cb193447c404d85eed93cb0f61d2f189dd1c94c3f1af4d74afe861e06f8b34db"
    local bin_dir="/tmp/local/bin"
    local tools=("pg_dump" "pg_isready" "pg_restore" "psql" "reindexdb" "vacuumdb")

    check_dependencies wget tar ar cp rm date
    check_install_dir_and_verify_tools "$bin_dir" "${tools[@]}"
    download_postgresql_deb "$deb_url" "$deb_file"
    verify_file_hash "$deb_file" "$deb_sha256"
    install_pg_tools "$deb_file" "$bin_dir" "${tools[@]}"
    verify_installation "$bin_dir" "${tools[@]}"
    cleanup "$deb_file"
}

# Calling the main function
main
