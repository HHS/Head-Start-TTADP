#!/bin/bash
set -e
set -u
set -o pipefail
set -o noglob
set -o noclobber

# S3 service instance name in Cloud Foundry
S3_SERVICE_BUCKET="ttahub-db-backups"

# -----------------------------------------------------------------------------
# Script to restore a Postgres database from an encrypted backup stored in AWS S3
# -----------------------------------------------------------------------------
# Usage: db_restore.sh <source_prefix> <source_date> <rds_target> 
# Examples: 
#   db_restore.sh processed latest ttahub-dev-blue
#   db_restore.sh production 2025-09-22 ttahub-dev-green
#
# Parameters:
#   source_prefix: The prefix in the S3 bucket where backups are stored (e.g., "production" or "processed")
#   source_date: The date of the backup to restore (e.g., "2025-09-22" or "latest" for the most recent)
#   rds_target: The name of the RDS instance to restore the backup to (e.g., "ttahub-dev-blue")

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

# monitor memory usage
function monitor_memory() {
    local pid=$1
    local interval=${2-0.5}
    local max_mem_mb=0
    local max_system_mem_mb=0
    local mem_kb
    local mem_mb
    local system_mem_bytes
    local system_mem_mb
    local start_time
    start_time=$(date +%s)  # Record start time in seconds

    # Path to the container's memory cgroup
    local MEM_CGROUP_PATH="/sys/fs/cgroup/memory"

    # Trap to handle script exits and interruptions
    local exit_code duration end_time
    trap 'exit_code=$?; \
      end_time=$(date +%s); \
      duration=$((end_time - start_time)); \
      log "STAT" "Exit code: $exit_code"; \
      log "STAT" "Maximum memory used by the process: $max_mem_mb MB"; \
      log "STAT" "Maximum container memory used: $max_system_mem_mb MB"; \
      log "STAT" "Duration of the run: $duration seconds from $start_time to $end_time"; \
      exit $exit_code' EXIT SIGINT SIGTERM

    # Monitor memory usage
    log "INFO" "Monitoring started at: $start_time";
    while true; do
        if [ ! -e "/proc/$pid" ]; then
            break
        fi
        # Process-specific memory in kilobytes, then convert to megabytes
        mem_kb=$(awk '/VmRSS/{print $2}' "/proc/$pid/status" 2>/dev/null)
        mem_mb=$((mem_kb / 1024))
        if [[ "$mem_mb" -gt "$max_mem_mb" ]]; then
            max_mem_mb=$mem_mb
        fi

        # Container-specific memory (used memory) in bytes, then convert to megabytes
        system_mem_bytes=$(cat $MEM_CGROUP_PATH/memory.usage_in_bytes)
        system_mem_mb=$((system_mem_bytes / 1024 / 1024))
        if [[ "$system_mem_mb" -gt "$max_system_mem_mb" ]]; then
            max_system_mem_mb=$system_mem_mb
        fi

        sleep "$interval"
    done
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

# Append to a JSON array
function append_to_json_array() {
    local existing_json="$1"
    local new_json="$2"

    validate_json "$existing_json"
    validate_json "$new_json"

    # Use jq to append the new JSON object to the existing array
    updated_json=$(jq --argjson obj "$new_json" '. += [$obj]' <<< "$existing_json")

    # Check if the update was successful
    if ! updated_json=$(jq --argjson obj "$new_json" '. += [$obj]' <<< "$existing_json"); then
        log "ERROR" "Failed to append JSON object."
        set -e
        return 1
    fi

    validate_json "$updated_json"

    echo "$updated_json"
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

# -----------------------------------------------------------------------------
# AWS S3 helper functions
# -----------------------------------------------------------------------------
function aws_s3_validate() {
  export_validate "AWS_ACCESS_KEY_ID"
  export_validate "AWS_SECRET_ACCESS_KEY"
  export_validate "AWS_DEFAULT_BUCKET"
  export_validate "AWS_DEFAULT_REGION"
}

function aws_s3_prep() {
  local json_blob=$1
  local s3_server=$2

  log "INFO" "Preparing AWS S3 configurations using input parameters."
  parameters_validate "${json_blob}"
  parameters_validate "${s3_server}"

  log "INFO" "Processing JSON data for S3 configuration."
  local s3_data
  s3_data=$(process_json "${json_blob}" '."s3"')
  parameters_validate "${s3_data}"
  local server_data
  server_data=$(find_json_object "${s3_data}" "name" "${s3_server}")
  parameters_validate "${server_data}" 
  local s3_access_key_id
  s3_access_key_id=$(process_json "${server_data}" ".credentials.access_key_id" "-r")
  parameters_validate "${s3_access_key_id}"
  local s3_secret_access_key
  s3_secret_access_key=$(process_json "${server_data}" ".credentials.secret_access_key" "-r")
  parameters_validate "${s3_secret_access_key}"
  local s3_bucket
  s3_bucket=$(process_json "${server_data}" ".credentials.bucket" "-r")
  parameters_validate "${s3_bucket}"
  local s3_region
  s3_region=$(process_json "${server_data}" ".credentials.region" "-r")
  parameters_validate "${s3_region}"
  log "INFO" "Setting AWS CLI environment variables."
  export AWS_ACCESS_KEY_ID="${s3_access_key_id}"
  export AWS_SECRET_ACCESS_KEY="${s3_secret_access_key}"
  export AWS_DEFAULT_BUCKET="${s3_bucket}"
  export AWS_DEFAULT_REGION="${s3_region}"

  aws_s3_validate
}

function aws_s3_clear() {
  unset AWS_ACCESS_KEY_ID
  unset AWS_SECRET_ACCESS_KEY
  unset AWS_DEFAULT_BUCKET
  unset AWS_DEFAULT_REGION
}

function s3_test_connectivity() {
    aws_s3_validate

    log "INFO" "Testing AWS S3 connectivity..."

    if aws s3 ls "s3://$AWS_DEFAULT_BUCKET" > /dev/null 2>&1; then
        log "INFO" "Successfully connected to AWS S3."
    else
        log "ERROR" "Failed to connect to AWS S3. Check credentials and network settings."
        set -e
        return 1
    fi
}

# Download the latest backup file list
function aws_s3_get_latest_backup() {
    local source_prefix=$1
    local latest_backup_filename="${source_prefix}-latest-backup.txt"

    log "INFO" "Downloading latest backup file list from S3..."
    if aws s3 cp "s3://${AWS_DEFAULT_BUCKET}/${source_prefix}/${latest_backup_filename}" - > latest_backup.txt; then
        log "INFO" "Successfully downloaded latest backup file list."

        # Check if the file exists and is not empty
        if [ -f latest_backup.txt ]; then
            if [ -s latest_backup.txt ]; then
                log "INFO" "Latest backup file list exists and is not empty."
            else
                log "ERROR" "Downloaded latest backup file list is empty."
                set -e
                return 1
            fi
        else
            log "ERROR" "Downloaded latest backup file list does not exist."
            set -e
            return 1
        fi
    else
        log "ERROR" "Failed to download latest backup file list."
        set -e
        return 1
    fi
}


# Function to download the backup password from S3
function aws_s3_download_password() {
    local password_file_path=$1

    log "INFO" "Downloading backup password from S3..."
    local password
    password=$(aws s3 cp "s3://${password_file_path}" -)
    parameters_validate "${password}"

    echo "${password}"
}

# Verify the integrity of the file downloaded from S3
function aws_s3_verify_file_integrity() {
    local backup_file_path="$1"
    local md5_file_path="$2"
    local sha256_file_path="$3"

    log "INFO" "Stream the expected hashes directly from S3"
    local expected_md5 expected_sha256
    expected_md5=$(aws s3 cp "s3://${md5_file_path}" -)
    expected_sha256=$(aws s3 cp "s3://${sha256_file_path}" -)

    log "INFO" "Prepare the command to stream the S3 file and calculate hashes"
    set +e
    log "INFO" "Execute the command and capture its exit status"
    aws s3 cp "s3://${backup_file_path}" - |\
        tee \
          >(sha256sum |\
            awk '{print $1}' > /tmp/computed_sha256 &\
            echo $? > /tmp/sha256_status \
          ) \
          >(md5sum |\
            awk '{print $1}' > /tmp/computed_md5 &\
            echo $? > /tmp/md5_status \
          ) \
        >/dev/null
    local main_exit_status=$?

    log "INFO" "Wait for all subprocesses and check their exit statuses"
    local md5_exit_status sha256_exit_status
    read md5_exit_status < /tmp/md5_status
    read sha256_exit_status < /tmp/sha256_status
    rm -f /tmp/md5_status /tmp/sha256_status

    log "INFO" "Check if any of the hash calculations failed"
    if [ "$md5_exit_status" -ne 0 ] || [ "$sha256_exit_status" -ne 0 ] || [ "$main_exit_status" -ne 0 ]; then
        log "ERROR" "Error during file verification."
        set -e
        return 1
    fi

    log "INFO" "Read computed hash values from temporary storage"
    local computed_md5 computed_sha256
    read computed_md5 < /tmp/computed_md5
    read computed_sha256 < /tmp/computed_sha256
    rm -f /tmp/computed_md5 /tmp/computed_sha256

    log "INFO" "Verify hashes"
    if [ "$computed_md5" != "$expected_md5" ] || [ "$computed_sha256" != "$expected_sha256" ]; then
        log "ERROR" "File verification failed."
        log "ERROR" "Expected MD5: $expected_md5, Computed MD5: $computed_md5"
        log "ERROR" "Expected SHA256: $expected_sha256, Computed SHA256: $computed_sha256"
        set -e
        return 1
    fi

    log "INFO" "File hashes verified"
    set -e
    return 0
}

# -----------------------------------------------------------------------------
# Main restore function
# -----------------------------------------------------------------------------
function perform_restore() {
    local source_prefix=$1
    local source_date=$2
    local rds_target=$3

    log "INFO" "Starting db restore from: ${source_prefix}/${source_date} to db: ${rds_target}"

    log "INFO" "Validate parameters and exports"
    parameters_validate "${source_prefix}"
    parameters_validate "${rds_target}"

    export_validate "VCAP_SERVICES"

    log "INFO" "Verify or install awscli"
    run_script 'awscli_install.sh' '../../common/scripts/' || {
        log "ERROR" "Failed to install or verify awscli"
        set -e
        exit 1
    }

    log "INFO" "Verify or install postgrescli"
    run_script 'postgrescli_install.sh' '../../common/scripts/' || {
        log "ERROR" "Failed to install or verify postgrescli"
        set -e
        exit 1
    }

    log "INFO" "add the bin dir for the new cli tools to PATH"
    add_to_path '/tmp/local/bin'

    log "INFO" "check dependencies"
    check_dependencies aws md5sum pg_restore sha256sum gzip openssl

    log "INFO" "collect and configure credentials"
    rds_prep "${VCAP_SERVICES}" "${rds_target}" || {
        log "ERROR" "Failed to prepare RDS credentials"
        set -e
        exit 1
    }

    aws_s3_prep "${VCAP_SERVICES}" "${S3_SERVICE_BUCKET}" || {
        log "ERROR" "Failed to prepare AWS S3 credentials"
        set -e
        exit 1
    }

    log "INFO" "verify rds & s3 connectivity"
    rds_test_connectivity || {
        log "ERROR" "RDS connectivity test failed"
        set -e
        exit 1
    }

    s3_test_connectivity || {
        log "ERROR" "S3 connectivity test failed"
        set -e
        exit 1
    }

    local backup_file_path md5_file_path sha256_file_path password_file_path
    if [[ $source_date == "latest" ]]; then
        log "INFO" "Searching for latest backup file list"
        aws_s3_get_latest_backup "${source_prefix}" || {
            log "ERROR" "Failed to download latest backup file list"
            set -e
            exit 1
        log "INFO" "Reading backup file paths from the latest backup file list"
        backup_file_path=$(awk 'NR==1' latest_backup.txt)
    }
    else 
        echo "Searching for backup from: ${source_date}"
        result=$(aws s3api list-objects --bucket ${BUCKET_NAME} --query "Contents[?contains(Key, 'production/production-${source_date}')]")
        if [[ $result == "[]" ]]; then
            echo "No backups found for date: ${source_date}"
            exit 1
        else 
            backup_file_path=$($result | jq -r '.[].Key' | grep "zenc")
            echo "Found backup for ${source_date}: ${backup_file_path}"
        fi
    fi

    exit 1

    md5_file_path="${backup_file_path%.zenc}.md5"
    sha256_file_path="${backup_file_path%.zenc}.sha256"
    password_file_path="${backup_file_path%.zenc}.pwd"
    parameters_validate "${backup_file_path}"
    parameters_validate "${md5_file_path}"
    parameters_validate "${sha256_file_path}"
    parameters_validate "${password_file_path}"

    log "INFO" "Downloading backup password"
    local backup_password
    backup_password=$(aws_s3_download_password "${password_file_path}") || {
        log "ERROR" "Failed to download backup password"
        set -e
        exit 1
    }

    log "INFO" "Verifying the backup file from S3"
    aws_s3_verify_file_integrity "${backup_file_path}" "${md5_file_path}" "${sha256_file_path}" || {
        log "ERROR" "Failed to verify the backup file"
        set -e
        exit 1
    }

    #set -x
    set -o pipefail

    log "INFO" "Reset database before restore"

    psql -d postgres <<EOF
select pg_terminate_backend(pid) from pg_stat_activity where datname='${PGDATABASE}';
DROP DATABASE IF EXISTS "${PGDATABASE}";
CREATE DATABASE "${PGDATABASE}";
EOF

    if [[ $? -ne 0 ]]; then
        log "ERROR" "Failed to reset database"
        exit 1
    fi

    log "INFO" "Database reset successfully"

    log "INFO" "Restoring the database from the backup file"
    aws s3 cp "s3://${backup_file_path}" - |\
     openssl enc -d -aes-256-cbc -salt -pbkdf2 -k "${backup_password}" |\
     gzip -d |\
     psql  || {
        log "ERROR" "failed to restore"
        set -e
        exit 1
    }

    log "INFO" "Database restore completed successfully"

    log "INFO" "clear the populated env vars"
    rds_clear
    aws_s3_clear
}

monitor_memory $$ &

perform_restore "$@"
