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

function rds_dump_prep() {
  rds_validate

  # all arguments are read from exports directly
  echo "pg_dump"
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


function aws_s3_copy_file_prep() {
  local file_name=$1
  local sub_dir=$2

  parameters_validate "${file_name}"
  parameters_validate "${sub_dir}"
  aws_s3_validate

  local s3_bucket=$AWS_DEFAULT_BUCKET

  echo "aws s3 cp - \"s3://${s3_bucket}/${sub_dir}/${file_name}\""
}

function aws_s3_copy_file() {
  local file_name=$1
  exec "$(aws_s3_copy_file_prep "${file_name}")"
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

aws_s3_verify_file_integrity() {
  local zip_file_path="$1"
  local md5_file_path="$2"
  local sha256_file_path="$3"

  log "INFO" "Stream the expected hashes directly from S3"
  local expected_md5 expected_sha256
  expected_md5=$(aws s3 cp "s3://${md5_file_path}" -)
  expected_sha256=$(aws s3 cp "s3://${sha256_file_path}" -)

  log "INFO" "Prepare the command to stream the S3 file and calculate hashes"
  set +e
  log "INFO" "Execute the command and capture its exit status"
  aws s3 cp "s3://${zip_file_path}" - |\
      tee \
        >(sha256sum |\
          awk '{print $1}' > /tmp/computed_sha256 &\
          echo $? > /tmp/md5_status \
        ) \
        >(md5sum |\
          awk '{print $1}' > /tmp/computed_md5 &\
          echo $? > /tmp/sha256_status \
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

# -----------------------------------------------------------------------------
# Backup & Upload helper functions
# -----------------------------------------------------------------------------
zip_prep() {
  local zip_password=$1

  parameters_validate "${zip_password}"

  echo "zip -P \"${zip_password}\" - -"
}

perform_backup_and_upload() {
  local backup_filename_prefix=$1

  parameters_validate "${backup_filename_prefix}"

  local s3_bucket=$AWS_DEFAULT_BUCKET

  local zip_password timestamp
  zip_password=$(openssl rand -base64 12)
  timestamp="$(date --utc +%Y-%m-%d-%H-%M-%S)-UTC"

  local zip_filename="${backup_filename_prefix}-${timestamp}.sql.zip"
  local md5_filename="${backup_filename_prefix}-${timestamp}.sql.md5"
  local sha256_filename="${backup_filename_prefix}-${timestamp}.sql.sha256"
  local password_filename="${backup_filename_prefix}-${timestamp}.sql.pwd"
  local latest_backup_filename="${backup_filename_prefix}-latest-backup.txt"

  local rds_dump_cmd
  rds_dump_cmd=$(rds_dump_prep)
  parameters_validate "${rds_dump_cmd}"

  local zip_cmd
  zip_cmd=$(zip_prep "${zip_password}")
  parameters_validate "${zip_cmd}"

  local aws_s3_copy_zip_file_cmd
  aws_s3_copy_zip_file_cmd=$(aws_s3_copy_file_prep "$zip_filename" "${backup_filename_prefix}")
  parameters_validate "${aws_s3_copy_zip_file_cmd}"

  local aws_s3_copy_md5_file_cmd
  aws_s3_copy_md5_file_cmd=$(aws_s3_copy_file_prep "$md5_filename" "${backup_filename_prefix}")
  parameters_validate "${aws_s3_copy_md5_file_cmd}"

  local aws_s3_copy_sha256_file_cmd
  aws_s3_copy_sha256_file_cmd=$(aws_s3_copy_file_prep "$sha256_filename" "${backup_filename_prefix}")
  parameters_validate "${aws_s3_copy_sha256_file_cmd}"

  local aws_s3_copy_password_file_cmd
  aws_s3_copy_password_file_cmd=$(aws_s3_copy_file_prep "$password_filename" "${backup_filename_prefix}")
  parameters_validate "${aws_s3_copy_password_file_cmd}"

  local aws_s3_copy_latest_backup_file_cmd
  aws_s3_copy_latest_backup_file_cmd=$(aws_s3_copy_file_prep "$latest_backup_filename" "${backup_filename_prefix}")
  parameters_validate "${aws_s3_copy_latest_backup_file_cmd}"

  log "INFO" "Execute the command and capture its exit status"
  set +e
  pg_dump |\
    zip -P "${zip_password}" - - |\
    tee \
      >(md5sum |\
        awk '{print $1}' |\
        aws s3 cp - "s3://${s3_bucket}/${backup_filename_prefix}/${md5_filename}" ;\
        echo $? > /tmp/md5_status \
      ) \
      >(sha256sum |\
        awk '{print $1}' |\
        aws s3 cp - "s3://${s3_bucket}/${backup_filename_prefix}/${sha256_filename}" ;\
        echo $? > /tmp/sha256_status \
      ) |\
    aws s3 cp - "s3://${s3_bucket}/${backup_filename_prefix}/${zip_filename}"
  local main_exit_status=$?

  log "INFO" "Wait for all subprocesses and check their exit statuses"
  local md5_exit_status sha256_exit_status

  # Read from FIFOs to get the exit statuses
  read md5_exit_status < /tmp/md5_status
  read sha256_exit_status < /tmp/sha256_status

  # Clean up named pipes
  rm -f /tmp/md5_status /tmp/sha256_status

  log "INFO" "Check if any of the backup uploads or integrity checks failed"
  if [ "$md5_exit_status" -ne 0 ] || [ "$sha256_exit_status" -ne 0 ] || [ "$main_exit_status" -ne 0 ]; then
      log "ERROR" "Backup upload failed."
      aws_s3_safe_remove_file "${zip_filename}"
      aws_s3_safe_remove_file "${md5_filename}"
      aws_s3_safe_remove_file "${sha256_filename}"
      set -e
      return 1
  fi

  log "INFO" "Upload the ZIP password"
  if ! echo -n "${zip_password}" |\
    eval "$aws_s3_copy_password_file_cmd"; then
    log "ERROR" "Password file upload failed."
    aws_s3_safe_remove_file "${password_filename}"
    aws_s3_safe_remove_file "${zip_filename}"
    aws_s3_safe_remove_file "${md5_filename}"
    aws_s3_safe_remove_file "${sha256_filename}"
    set -e
    return 1
  fi

  local zip_file_path="${s3_bucket}/${backup_filename_prefix}/${zip_filename}"
  local md5_file_path="${s3_bucket}/${backup_filename_prefix}/${md5_filename}"
  local sha256_file_path="${s3_bucket}/${backup_filename_prefix}/${sha256_filename}"
  local password_file_path="${s3_bucket}/${backup_filename_prefix}/${password_filename}"

  if ! aws_s3_verify_file_integrity "${zip_file_path}" "${md5_file_path}" "${sha256_file_path}"; then
    log "ERROR" "Verification of file integrity check failed"
    aws_s3_safe_remove_file "${password_filename}"
    aws_s3_safe_remove_file "${zip_filename}"
    aws_s3_safe_remove_file "${md5_filename}"
    aws_s3_safe_remove_file "${sha256_filename}"
    set -e
    return 1
  fi

  log "INFO" "Update the latest backup file list"
  if ! printf "%s\n%s\n%s\n%s" "${zip_file_path}" "${md5_file_path}" "${sha256_file_path}" "${password_file_path}" |\
    eval "${aws_s3_copy_latest_backup_file_cmd}"; then
    log "ERROR" "Latest backup file list upload failed."
    set -e
    return 1
  fi
  set -e
}
# -----------------------------------------------------------------------------

function main() {
  local backup_filename_prefix=$1
  local rds_server=$2
  local aws_s3_server=$3

  log "INFO" "Validate parameters and exports"
  parameters_validate "${backup_filename_prefix}"
  parameters_validate "${rds_server}"
  parameters_validate "${aws_s3_server}"

  export_validate "VCAP_SERVICES"

  log "INFO" "Verify or install awscli"
  run_script 'awscli_install.sh' '../../common/scripts/'
  log "INFO" "Verify or install postgrescli"
  run_script 'postgrescli_install.sh' '../../common/scripts/'

  log "INFO" "add the bin dir for the new cli tools to PATH"
  add_to_path '/tmp/local/bin'

  log "INFO" "check dependancies"
  check_dependencies aws md5sum openssl pg_dump pg_isready sha256sum zip

  log "INFO" "collect and configure credentials"
  rds_prep "${VCAP_SERVICES}" "${rds_server}"
  aws_s3_prep "${VCAP_SERVICES}" "${aws_s3_server}"

  log "INFO" "verify rds & s3 connectivity"
  rds_test_connectivity
  s3_test_connectivity

  log "INFO" "backup, upload, verfity db"
  perform_backup_and_upload "${backup_filename_prefix}"

  log "INFO" "clear the populated env vars"
  rds_clear
  aws_s3_clear
}

monitor_memory $$ &

main "$@"
