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
    
    validate_parameters "$deb_file"
    validate_parameters "$bin_dir"

    log "INFO" "Extracting PostgreSQL tools from deb package..."
    mkdir -p extract-deb
    cd extract-deb || exit 3
    ar x "$deb_file"
    tar -xf data.tar.*
    for tool in "${tools[@]}"; do
        if [ -f "./usr/lib/postgresql/15/bin/$tool" ]; then
            cp "./usr/lib/postgresql/15/bin/$tool" "$bin_dir"
            log "INFO" "$tool installation completed successfully."
        else
            log "ERROR" "$tool not found in the deb package."
            exit 4
        fi
    done
    cd - || exit 5
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

    validate_parameters "$deb_file"

    log "INFO" "Cleanup install files and temporary directories"
    if [ -f "$deb_file" ]; then
        rm "$deb_file"
        log "INFO" "The deb file has been deleted."
    else
        log "INFO" "The deb file does not exist."
    fi
    if [ -d "extract-deb" ]; then
        rm -r "extract-deb"
        log "INFO" "Temporary extraction directory has been deleted."
    else
        log "INFO" "No temporary extraction directory to delete."
    fi
}

# Main function to control workflow
function main() {
    local deb_url="http://security.debian.org/debian-security/pool/updates/main/p/postgresql-15/postgresql-client-15_15.6-0+deb12u1_amd64.deb"
    local deb_file="/tmp/postgresql.deb"
    local bin_dir="/tmp/local/bin"
    local tools=("pg_dump" "pg_isready" "pg_restore" "psql" "reindexdb" "vacuumdb")

    check_dependencies wget tar ar cp rm date
    check_install_dir_and_verify_tools "$bin_dir" "${tools[@]}"
    download_postgresql_deb "$deb_url" "$deb_file"
    install_pg_tools "$deb_file" "$bin_dir" "${tools[@]}"
    verify_installation "$bin_dir" "${tools[@]}"
    cleanup "$deb_file"
}

# Calling the main function
main
