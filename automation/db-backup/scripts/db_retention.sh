#!/bin/bash
set -e
set -u
set -o pipefail
set -o noglob
set -o noclobber

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
        log "ERROR" "Parameter is unset or empty."
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
    script_output=$("$script_path" "$@")
    local script_exit_status=$?

    log "INFO" "Check the exit status of the script"
    if [ $script_exit_status -ne 0 ]; then
        log "ERROR" "Script execution failed with exit status $script_exit_status. Output: $script_output"
        set -e
        return $script_exit_status
    else
        echo "$script_output"
        set -e
        return 0
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

function aws_s3_check_file_exists() {
  local file_name=$1

  log "INFO" "Checking if file exists in S3: ${file_name}"
  parameters_validate "${file_name}"
  aws_s3_validate

  local s3_bucket=$AWS_DEFAULT_BUCKET
  if aws s3 ls "s3://${s3_bucket}/${file_name}" > /dev/null; then
      log "INFO" "File found in S3."
      set -e
      return 0
  else
      log "ERROR" "File not found in S3: ${file_name}"
      set -e
      return 1
  fi
}

# safely remove a file from S3 if it exists
function aws_s3_safe_remove_file() {
  local file_name=${1}

  parameters_validate "${file_name}"
  aws_s3_validate

  local s3_bucket=$AWS_DEFAULT_BUCKET

  if aws_s3_check_file_exists "${file_name}"; then
      log "INFO" "Removing ${file_name} from s3..."
      if ! aws s3 rm "s3://${s3_bucket}/${file_name}"; then
        log "ERROR" "Failed to remove ${file_name}"
        set -e
        return 1
      fi
      log "INFO" "Removed ${file_name} from s3"
  fi
}

# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Backup Retention
# -----------------------------------------------------------------------------
backup_retention() {
    log "INFO" "Starting backup retention process"

    local backup_filename_prefix=$1
    local s3_bucket=$AWS_DEFAULT_BUCKET

    log "INFO" "Fetching the list of backup objects"
    BACKUPS=$(aws s3api list-objects-v2 --bucket $s3_bucket --prefix ${backup_filename_prefix}/ --query 'Contents[].[Key, LastModified]' --output text) || {
        log "ERROR" "Failed to fetch list of backup objects"
        set -e
        return 1
    }

    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    date_diff() {
        d1=$(date -d "$1" +%s)
        d2=$(date -d "$2" +%s)
        echo $(( (d1 - d2) / 86400 ))
    }

    get_base_name() {
        echo "$1" | sed -e 's/\.[a-z0-9]*$//'
    }

    declare -A backup_sets
    declare -A processed_dates

    while IFS= read -r line; do
        KEY=$(echo $line | awk '{print $1}')
        LAST_MODIFIED=$(echo $line | awk '{print $2}')

        BASE_NAME=$(get_base_name "$KEY")
        if [ -z "${backup_sets[$BASE_NAME]+isset}" ]; then
            backup_sets[$BASE_NAME]="$LAST_MODIFIED"
        fi
    done <<< "$BACKUPS"

    delete_backup_set() {
        BASE_NAME=$1
        for EXT in ".zip" ".zenc" ".pwd" ".md5" ".sha256"; do
            KEY="${BASE_NAME}${EXT}"
            log "INFO" "Deleting $KEY"
            aws_s3_safe_remove_file ${KEY} || {
                log "ERROR" "Failed to delete $KEY"
                set -e
                return 1
            }
        done
    }

    local deleted_count=0  # Counter for deleted sets
    local max_deletes=15   # Maximum number of sets to delete

    for BASE_NAME in "${!backup_sets[@]}"; do
        LAST_MODIFIED=${backup_sets[$BASE_NAME]}
        AGE=$(date_diff "$NOW" "$LAST_MODIFIED")

        if [ $AGE -le 30 ]; then
            continue
        elif [ $AGE -le 60 ]; then
            DATE=$(date -d "$LAST_MODIFIED" +%Y-%m-%d)
            if [ "${processed_dates[$DATE]+isset}" ]; then
                delete_backup_set "$BASE_NAME" || {
                    log "ERROR" "Failed to delete backup set for $BASE_NAME"
                    set -e
                    return 1
                }
                ((deleted_count++))
            else
                processed_dates[$DATE]=true
            fi
        elif [ $AGE -le 90 ]; then
            if [ $(date -d "$LAST_MODIFIED" +%u) -eq 1 ] || [ $(date -d "$LAST_MODIFIED" +%d) -eq 1 ] || [ $(date -d "$LAST_MODIFIED" +%d) -eq 15 ]; then
                continue
            else
                delete_backup_set "$BASE_NAME" || {
                    log "ERROR" "Failed to delete backup set for $BASE_NAME"
                    set -e
                    return 1
                }
                ((deleted_count++))
            fi
        elif [ $AGE -le 730 ]; then
            if [ $(date -d "$LAST_MODIFIED" +%d) -eq 1 ]; then
                continue
            else
                delete_backup_set "$BASE_NAME" || {
                    log "ERROR" "Failed to delete backup set for $BASE_NAME"
                    set -e
                    return 1
                }
                ((deleted_count++))
            fi
        else
            delete_backup_set "$BASE_NAME" || {
                log "ERROR" "Failed to delete backup set for $BASE_NAME"
                set -e
                return 1
            }
            ((deleted_count++))
        fi

        # Exit the loop if the maximum number of deletions is reached
        if [ "$deleted_count" -ge "$max_deletes" ]; then
            log "INFO" "Maximum deletions reached: $deleted_count"
            break
        fi
    done

    log "INFO" "Backup retention process completed"
}
# -----------------------------------------------------------------------------

function main() {
  local backup_filename_prefix=$1
  local aws_s3_server=$2
  local duration=${3-86400}  # Default duration to 24 hours

  log "INFO" "Validate parameters and exports"
  parameters_validate "${backup_filename_prefix}"
  parameters_validate "${aws_s3_server}"
  parameters_validate "${duration}"

  export_validate "VCAP_SERVICES"

  log "INFO" "Verify or install awscli"
  run_script 'awscli_install.sh' '../../common/scripts/' || {
    log "ERROR" "Failed to install or verify awscli"
    set -e
    exit 1
  }

  log "INFO" "add the bin dir for the new cli tools to PATH"
  add_to_path '/tmp/local/bin'

  log "INFO" "check dependencies"
  check_dependencies aws

  aws_s3_prep "${VCAP_SERVICES}" "${aws_s3_server}" || {
    log "ERROR" "Failed to prepare AWS S3 credentials"
    set -e
    exit 1
  }

  s3_test_connectivity || {
    log "ERROR" "S3 connectivity test failed"
    set -e
    exit 1
  }

  log "INFO" "run backup retention"
  backup_retention "${backup_filename_prefix}" || {
    log "ERROR" "Backup retention process failed"
    set -e
    exit 1
  }

  log "INFO" "clear the populated env vars"
  aws_s3_clear
}

monitor_memory $$ &

main "$@"
