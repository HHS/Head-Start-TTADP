#!/bin/bash
set -e
set -u
set -o pipefail
set -o noglob
set -o noclobber

# Clears the scratch database the nightly restore_db_cron job anonymizes production data in, so
# a failed run never leaves unanonymized production data behind. Drops and recreates the database
# (the same reset db_restore.sh does before a restore), then confirms it is empty using counts only.
#
# Usage: ./db_clear.sh <rds_server>
# Only ttahub-process may be cleared.

ALLOWED_RDS_SERVER="ttahub-process"

# -----------------------------------------------------------------------------
# Generic helper functions
# -----------------------------------------------------------------------------
# Enhanced logging function with timestamp and output stream handling
function log() {
    local type="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $type: $message" >&2
}

# Parameter Validation
function parameters_validate() {
    local param="$1"
    if [[ -z "${param}" ]]; then
        log "ERROR" "Parameter is unset or empty @ $(caller)."
        set -e
        exit 1
    fi
}

# Export Validation
function export_validate() {
    local param="$1"

    # Check if the parameter is set
    if ! declare -p "$param" &>/dev/null; then
        log "ERROR" "Parameter '$param' is unset."
        set -e
        exit 1
    fi

    # Check if the parameter is exported
    if [[ "$(declare -p "$param")" != *" -x "* ]]; then
        log "ERROR" "Parameter '$param' is not exported."
        set -e
        exit 1
    fi
}

# Check for required dependencies
function check_dependencies() {
    local dependencies=("$@")
    for dep in "${dependencies[@]}"; do
        if ! type "${dep}" > /dev/null 2>&1; then
            log "ERROR" "Dependency ${dep} is not installed."
            set -e
            exit 1
        fi
    done
}

# Add a directory to PATH if it is not already included
function add_to_path() {
    local new_dir="$1"

    if [[ ":$PATH:" != *":$new_dir:"* ]]; then
        export PATH="$new_dir:$PATH"
        log "INFO" "Added $new_dir to PATH."
    else
        log "INFO" "$new_dir is already in PATH."
    fi
}
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# JSON helper functions
# -----------------------------------------------------------------------------
# Validate JSON
function validate_json() {
    local json_data="$1"
    log "INFO" "Validating JSON..."
    if ! echo "${json_data}" | jq empty 2>/dev/null; then
        log "ERROR" "Invalid JSON format."
        set -e
        exit 6
    fi
}

# Find object in array by key & value
function find_json_object() {
    local json_data="$1"
    local key="$2"
    local value="$3"

    validate_json "$json_data"

    # Search for the object in the JSON array
    local found_object
    found_object=$(jq -c --arg key "$key" --arg value "$value" '.[] | select(.[$key] == $value)' <<< "$json_data")

    # Check if an object was found
    if [ -z "$found_object" ]; then
        log "INFO" "No object found with $key = $value."
        set -e
        return 1
    else
        log "INFO" "Object found"
    fi

    echo "$found_object"
}

# Function to process JSON with a jq query and handle jq errors
process_json() {
    local json_string="$1"
    local jq_query="$2"
    local jq_flag="${3-}"

    # Use jq to process the JSON string with the provided jq query
    # Capture stderr in a variable to handle jq errors
    local result
    result=$(echo "$json_string" | jq $jq_flag "$jq_query" 2>&1)
    local jq_exit_status=$?

    # Check jq execution status
    if [ $jq_exit_status -ne 0 ]; then
        log "ERROR" "jq execution failed: $result"
        set -e
        return $jq_exit_status  # Return with an error status
    fi

    # Check if the result is empty or null (jq returns 'null' if no data matches the query)
    if [[ -z $result || $result == "null" ]]; then
        log "ERROR" "No value found for the provided jq query."
        set -e
        return 1  # Return with an error status
    else
        echo "$result"
        set -e
        return 0
    fi
}
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# File & Script helper functions
# -----------------------------------------------------------------------------
# run an script and return its output if successful
run_script() {
    local script_name="$1"
    local script_dir="$2"
    shift 2  # Shift the first two arguments out, leaving any additional arguments

    parameters_validate "${script_name}"

    log "INFO" "Resolve the full path of the script"
    local script_path
    if [[ -d "$script_dir" ]]; then
        script_path="$(cd "$script_dir" && pwd)/$script_name"
    else
        log "ERROR" "The specified directory $script_dir does not exist."
        set -e
        return 1  # Return with an error status
    fi

    log "INFO" "Check if the script exists"
    if [ ! -f "$script_path" ]; then
        log "ERROR" "The script $script_name does not exist at $script_path."
        set -e
        return 1  # Return with an error status
    fi

    log "INFO" "Check if the script is executable"
    if [ ! -x "$script_path" ]; then
        log "ERROR" "The script $script_name is not executable."
        set -e
        return 1  # Return with an error status
    fi

    log "INFO" "Execute the script with any passed arguments and capture its output"
    script_output=$("$script_path" "$@" 2>&1)
    local script_exit_status=$?

    log "INFO" "Check the exit status of the script"
    if [ $script_exit_status -ne 0 ]; then
        log "ERROR" "Script execution failed with exit status $script_exit_status. Output: $script_output"
        set -e
        return $script_exit_status
    else
        set -e
        return 0
    fi
}
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Postgres helper functions
# -----------------------------------------------------------------------------
function rds_validate() {
  export_validate "PGHOST"
  export_validate "PGPORT"
  export_validate "PGUSER"
  export_validate "PGPASSWORD"
  export_validate "PGDATABASE"
}

function rds_prep() {
  local json_blob=$1
  local db_server=$2

  log "INFO" "Preparing RDS configurations."
  parameters_validate "${json_blob}"
  parameters_validate "${db_server}"

  log "INFO" "Extracting RDS data from provided JSON."
  local rds_data
  rds_data=$(process_json "${json_blob}" '."aws-rds"')
  parameters_validate "${rds_data}"
  local server_data
  server_data=$(find_json_object "${rds_data}" "name" "${db_server}")
  parameters_validate "${server_data}"
  local db_host
  db_host=$(process_json "${server_data}" ".credentials.host" "-r")
  parameters_validate "${db_host}"
  local db_port
  db_port=$(process_json "${server_data}" ".credentials.port" "-r")
  parameters_validate "${db_port}"
  local db_username
  db_username=$(process_json "${server_data}" ".credentials.username" "-r")
  parameters_validate "${db_username}"
  local db_password
  db_password=$(process_json "${server_data}" ".credentials.password" "-r")
  parameters_validate "${db_password}"
  local db_name
  db_name=$(process_json "${server_data}" ".credentials.name" "-r")
  parameters_validate "${db_name}"

  log "INFO" "Configuring PostgreSQL client environment."
  export PGHOST="${db_host}"
  export PGPORT="${db_port}"
  export PGUSER="${db_username}"
  export PGPASSWORD="${db_password}"
  export PGDATABASE="${db_name}"

  rds_validate
}

function rds_clear() {
  unset PGHOST
  unset PGPORT
  unset PGUSER
  unset PGPASSWORD
  unset PGDATABASE
}

function rds_test_connectivity() {
    rds_validate

    log "INFO" "Testing RDS connectivity using pg_isready..."

    if pg_isready > /dev/null 2>&1; then
        log "INFO" "RDS database is ready and accepting connections."
    else
        log "ERROR" "Failed to connect to RDS database. Check server status, credentials, and network settings."
        set -e
        return 1
    fi
}
# -----------------------------------------------------------------------------

# Print only counts, never row values, so the output is safe to record as verification
function verify_cleared() {
    local table_count row_count

    table_count=$(psql -At -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema');")
    row_count=$(psql -At -c "SELECT COALESCE(SUM(n_live_tup), 0) FROM pg_stat_user_tables;")

    log "INFO" "Verification counts: tables=${table_count} rows=${row_count}"

    if [[ "${table_count}" != "0" || "${row_count}" != "0" ]]; then
        log "ERROR" "Database is not empty after clearing"
        return 1
    fi
}

function perform_clear() {
    local rds_server=$1

    log "INFO" "Validate parameters and exports"
    parameters_validate "${rds_server}"

    if [[ "${rds_server}" != "${ALLOWED_RDS_SERVER}" ]]; then
        log "ERROR" "Refusing to clear '${rds_server}'; only '${ALLOWED_RDS_SERVER}' may be cleared"
        exit 1
    fi

    export_validate "VCAP_SERVICES"

    log "INFO" "Verify or install postgrescli"
    run_script 'postgrescli_install.sh' '../../common/scripts/' || {
        log "ERROR" "Failed to install or verify postgrescli"
        set -e
        exit 1
    }

    log "INFO" "add the bin dir for the new cli tools to PATH"
    add_to_path '/tmp/local/bin'

    log "INFO" "check dependencies"
    check_dependencies jq psql pg_isready

    log "INFO" "collect and configure credentials"
    rds_prep "${VCAP_SERVICES}" "${rds_server}" || {
        log "ERROR" "Failed to prepare RDS credentials"
        set -e
        exit 1
    }

    log "INFO" "verify rds connectivity"
    rds_test_connectivity || {
        log "ERROR" "RDS connectivity test failed"
        set -e
        exit 1
    }

    log "INFO" "Drop and recreate the database"
    # WITH (FORCE) (PostgreSQL 13+) terminates connections as part of the drop, so a client that
    # reconnects after pg_terminate_backend (such as a task still cancelling) cannot block it
    psql -v ON_ERROR_STOP=1 -d postgres <<EOF
select pg_terminate_backend(pid) from pg_stat_activity where datname='${PGDATABASE}';
DROP DATABASE IF EXISTS "${PGDATABASE}" WITH (FORCE);
CREATE DATABASE "${PGDATABASE}";
EOF

    log "INFO" "Database cleared"

    verify_cleared || {
        set -e
        exit 1
    }

    log "INFO" "clear the populated env vars"
    rds_clear
}

perform_clear "$@"
