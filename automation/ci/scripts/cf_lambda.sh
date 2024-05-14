#!/bin/bash
set -x
# set -e
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
function validate_parameters() {
    local param="$1"
    if [[ -z "${param}" ]]; then
        log "ERROR" "Parameter is unset or empty."
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

# Validate JSON
function validate_json() {
    local json_data="$1"
    log "INFO" "Validating JSON..."
    if ! echo "${json_data}" | jq empty 2>/dev/null; then
        log "ERROR" "Invalid JSON format."
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
        return 1
    else
        log "INFO" "Object found: $found_object"
    fi

    echo "$found_object"
}

# Function to generate a list of files and their checksums from a given directory
function generate_file_list_with_checksums {
    local directory=$1
    local output_file=$2

    validate_parameters "$directory"
    validate_parameters "$output_file"

    # Find all files in the directory and generate checksums
    find "$directory" -type f -exec md5sum {} + > "$output_file"

    if [ $? -eq 0 ]; then
        log "INFO" "Generated file list with checksums at $output_file."
    else
        log "ERROR" "Failed to generate file list with checksums."
        return 1
    fi
}
# -----------------------------------------------------------------------------


# -----------------------------------------------------------------------------
# Service key functions
# -----------------------------------------------------------------------------
# Check if a service key exists
function check_service_key_exists() {
    local service_name=$1
    local key_name=$2
    log "INFO" "Checking if service key ${key_name} exists for service ${service_name}..."
    if cf service-keys "${service_name}" | grep -q "${key_name}"; then
        log "INFO" "Service key ${key_name} exists."
        return 0
    else
        log "ERROR" "Service key ${key_name} does not exist."
        return 2
    fi
}

# Create a service key
function create_service_key() {
    local service_name=$1
    local key_seed=$2
    local key_name=""

    # Check if key_seed is provided and not empty
    if [[ -n "$key_seed" ]]; then
        key_name="${service_name}-key-${key_seed}-$(date +%s)-$(uuidgen | tr -d '-')"
    else
        key_name="${service_name}-key-$(date +%s)-$(uuidgen | tr -d '-')"
    fi

    # Function logic to handle the key creation
    if check_service_key_exists "${service_name}" "${key_name}"; then
      log "INFO" "Service key with name ${key_name} already exists."
      echo "${key_name}"
    else
      echo "Creating service key with name ${key_name}..."  >&2
      if ! cf create-service-key "${service_name}" "${key_name}"; then
          log "ERROR" "Failed to create service key."
          exit 1
      elif ! check_service_key_exists "${service_name}" "${key_name}"; then
          log "ERROR" "Failed to create service key, even though it returned."
          exit 1
      fi
    fi
}

# Delete the service key if key exists
function delete_service_key() {
    local service_name="$1"
    local service_key="$2"
    if check_service_key_exists "${service_name}" "${service_key}"; then
        log "INFO" "Deleting service key ${service_key}..."
        if ! cf delete-service-key "${service_name}" "${service_key}" -f; then
            local cf_exit_code=$?
            log "ERROR" "Failed to delete service key ${service_key} with exit code $cf_exit_code."
            return $cf_exit_code
        fi
    else
        log "INFO" "No service key ${service_key} to delete."
    fi
}

# Fetch the service key credentials and check the return code for errors
function fetch_service_key() {
    local service_name=$1
    local key_name=$2
    local credentials_json=""

    # Execute cf command and capture its output and return code
    local full_output
    full_output=$(cf service-key "${service_name}" "${key_name}" 2>&1)
    local return_code=$?

    # Check return code from 'cf service-key'
    if [ "$return_code" -ne 0 ]; then
        log "ERROR" "Failed to retrieve service key '${key_name}' for service '${service_name}': $full_output"
        exit $return_code
    else
        # Extract JSON from the output if the command was successful
        credentials_json=$(echo "$full_output" | awk '/\{/,0')
        if [ -z "$credentials_json" ]; then
            log "ERROR" "No JSON data found in the output for service key '${key_name}'."
            exit 1
        fi
    fi

    # Validate JSON before parsing
    validate_json "${credentials_json}"

    echo "$credentials_json"
}

# prepare a service key
function prepare_s3_service_key() {
    local service_name=$1
    local key_seed="${CIRCLE_BUILD_NUM:-}"

    validate_parameters "$service_name"

    local service_key
    service_key=$(create_service_key "${service_name}" "${key_seed}")
    local credentials_json
    credentials_json=$(fetch_service_key "${service_name}" "${service_key}")

    # Extract credentials using jq
    local access_key
    local secret_key
    local bucket_name
    local region
    access_key=$(echo "${credentials_json}" | jq -r '.credentials.access_key_id')
    secret_key=$(echo "${credentials_json}" | jq -r '.credentials.secret_access_key')
    bucket_name=$(echo "${credentials_json}" | jq -r '.credentials.bucket')
    region=$(echo "${credentials_json}" | jq -r '.credentials.region')

    if [[ -z "${access_key}" || -z "${secret_key}" || -z "${bucket_name}" || -z "${region}" ]]; then
        log "ERROR" "Failed to extract all necessary credentials."
        exit 1
    fi

    # Corrected JSON manipulation to properly handle variable expansion
    credentials_json_updated=$(echo "${credentials_json}" | jq --arg sk "$service_key" '. + {"service_key": $sk}')

    # Validate JSON before returning
    validate_json "${credentials_json_updated}"

    echo "${credentials_json_updated}"
}

# cleanup service key
function cleanup_service_key() {
    local service_name=$1
    local credentials_json=$2

    validate_json "${credentials_json}"
    local service_key
    service_key=$(echo "$credentials_json" | jq -r '.service_key')

    validate_parameters "$service_name"
    validate_parameters "$service_key"

    delete_service_key "$service_name" "$service_key"
}
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# App management functions
# -----------------------------------------------------------------------------
# Function to see if app already exists
function check_app_exists {
    local app_name=$1

    # Check if an application exists by querying it
    local output
    output=$(cf app "$app_name" 2>&1)
    local status=$?

    if [ $status -eq 0 ]; then
        log "INFO" "Application '$app_name' exists."
        return 0  # true in Bash, application exists
    elif [[ "$output" == *"not found"* ]]; then
        log "ERROR" "Application '$app_name' does not exist."
        return 1  # false in Bash, application does not exist
    else
        log "ERROR" "Failed to verify if application '$app_name' exists. Error output: $output"
        return $status  # return the actual error code
    fi
}

# Function to check if an app is running
function check_app_running {
    local app_name=$1

    # Get the application information
    local output
    output=$(cf app "$app_name" 2>&1)
    local status=$?

    if [ $status -eq 0 ]; then
        if echo "$output" | grep -q "running"; then
            log "INFO" "Application '$app_name' is running."
            return 0  # true in Bash, application is running
        else
            log "INFO" "Application '$app_name' is not running."
            return 1  # false in Bash, application is not running
        fi
    else
        log "ERROR" "Failed to check if application '$app_name' is running. Error output: $output"
        return $status  # return the actual error code
    fi
}

# Push the app using a manifest from a specific directory
function push_app {
    local original_dir=$(pwd)  # Save the original directory
    local directory=$1
    local manifest_file=$2
    validate_parameters "$directory"
    validate_parameters "$manifest_file"

    # Change to the specified directory
    cd "$directory" || { log "ERROR" "Failed to change directory to $directory"; cd "$original_dir"; exit 1; }

    # Extract app name from the manifest file
    local app_name=$(grep 'name:' "$manifest_file" | awk '{print $3}' | tr -d '"')

    # Push the app without routing or starting it, capturing output
    local push_output
    if ! push_output=$(cf push -f "$manifest_file" --no-route --no-start 2>&1); then
        log "ERROR" "Failed to push application with error: $push_output"
        cd "$original_dir"  # Restore the original directory
        exit 1
    else
        log "INFO" "Application pushed successfully."
    fi

    # Restore the original directory
    cd "$original_dir"

    # Log and return the app name
    log "INFO" "The app name is: $app_name"
    echo $app_name
}


# Function to start an app
function start_app {
    local app_name=$1
    validate_parameters "$app_name"

    log "INFO" "Starting application '$app_name'..."
    if ! cf start "$app_name"; then
        log "ERROR" "Failed to start application '$app_name'."
        exit 1
    else
        log "INFO" "Application '$app_name' started successfully."
    fi
}

# Function to stop an app
function stop_app {
    local app_name=$1
    validate_parameters "$app_name"

    log "INFO" "Stopping application '$app_name'..."
    if ! cf stop "$app_name"; then
        log "ERROR" "Failed to stop application '$app_name'."
        exit 1
    else
        log "INFO" "Application '$app_name' stopped successfully."
    fi
}

# Function to manage the state of the application (start, restage, stop)
function manage_app {
    local app_name=$1
    local action=$2  # Action can be 'start', 'stop', or 'restage'

    # Validate the action parameter
    if [[ "$action" != "start" && "$action" != "stop" && "$action" != "restage" ]]; then
        log "ERROR" "Invalid action '$action'. Valid actions are 'start', 'stop', or 'restage'."
        return 1  # Exit with an error status
    fi

    # Perform the action on the application
    local output
    output=$(cf "$action" "$app_name" 2>&1)
    local status=$?

    if [ $status -eq 0 ]; then
        log "INFO" "Successfully $action application '$app_name'."
        return 0
    else
        log "ERROR" "Failed to $action application '$app_name'. Error output: $output"
        return $status
    fi
}

# Function to run a task with arguments
function run_task {
    local app_name=$1
    local task_name=$2
    local command=$3
    local args=$4

    validate_parameters "$app_name"
    validate_parameters "$command"
    validate_parameters "$task_name"

    # Deserialize JSON array into individual arguments
    local arg_array
    IFS=' ' read -r -a arg_array <<< "$(echo "$args" | jq -r '.[]')"

    log "INFO" "Running task: $task_name with args: ${arg_array[*]}"
    local full_command="$command ${arg_array[*]}"
    cf run-task "$app_name" --command "$full_command" --name "$task_name"
    local result=$?
    if [ $result -ne 0 ]; then
        log "ERROR" "Failed to start task $task_name with error code $result"
        exit $result
    fi
}


# Function to monitor task
function monitor_task {
    local app_name=$1
    local task_name=$2
    local timeout=${3:-120}  # Default timeout in seconds
    validate_parameters "$app_name"
    validate_parameters "$task_name"
    local start_time
    local task_id
    local task_state="PENDING"
    start_time=$(date +%s)
    log "INFO" "Monitoring task status. Waiting for task to complete..."
    while true; do
        local task_info=$(cf tasks "$app_name" | grep "$task_name" | head -n 1)
        local task_id=$(echo "$task_info" | awk '{print $1}')
        local task_state=$(echo "$task_info" | awk '{print $3}')
        log "INFO" "Task $task_id is currently $task_state."
        if [[ "$task_state" == "SUCCEEDED" ]]; then
            log "INFO" "Task completed successfully."
            return 0
        elif [[ "$task_state" == "FAILED" ]]; then
            log "ERROR" "Task failed."
            return 1
        fi
        local currentTime=$(date +%s)
        if (( currentTime - start_time >= timeout )); then
            log "ERROR" "Timeout reached while monitoring task $task_id."
            return 1
        fi
        sleep 10
    done
}

# Function to delete the app
function delete_app {
    local app_name=$1
    validate_parameters "$app_name"
    # Attempt to delete the application with options to force deletion without confirmation
    # and to recursively delete associated routes and services.
    cf delete "$app_name" -f -r
    local result=$?
    if [ $result -ne 0 ]; then
        log "ERROR" "Failed to delete $app_name with error code $result"
        exit $result
    else
        log "INFO" "App $app_name deleted successfully."
    fi
}
# -----------------------------------------------------------------------------

main() {
  # Check dependencies first
  check_dependencies cf awk date grep jq sleep uuidgen

  local json_input="$1"

  validate_parameters "$json_input"
  validate_json "$json_input"

  # Parse JSON and assign to variables
  local automation_dir manifest task_name command args
  automation_dir=$(echo "$json_input" | jq -r '.automation_dir // "./automation"')
  manifest=$(echo "$json_input" | jq -r '.manifest // "manifest.yml"')
  task_name=$(echo "$json_input" | jq -r '.task_name // "default-task-name"')
  command=$(echo "$json_input" | jq -r '.command // "bash /path/to/default-script.sh"')
  args=$(echo "$json_input" | jq -r '.args // "default-arg1 default-arg2"')

  local service_credentials

  app_name=$(push_app "$automation_dir" "$manifest")
  start_app "$app_name"

  if run_task "$app_name" "$task_name" "$command" "$args" && monitor_task "$app_name" "$task_name"; then
      log "INFO" "Task execution succeeded."
  else
      log "ERROR" "Task execution failed."
      exit 1
  fi

  # Clean up
  stop_app "$app_name"
  # Currently only turing off to aid in speeding up cycle time
  # delete_app "$app_name"
}

main "$@"
