#!/bin/bash

set -e
set -u
set -o pipefail
set -o noglob
set -o noclobber

# Source the environment file to get the URLs
source /etc/environment

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
    local app_name="tta-automation"

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
    local app_name="tta-automation"

    # Get the application information
    local output
    output=$(cf app "$app_name" 2>&1)
    local status=$?

    if [ $status -eq 0 ]; then
        # Extract the 'requested state' and 'instances' lines
        local requested_state
        requested_state=$(echo "$output" | awk -F": *" '/requested state:/ {print $2}' | xargs)
        local instances_line
        instances_line=$(echo "$output" | awk -F": *" '/instances:/ {print $2}' | xargs)

        # Extract the number of running instances
        local running_instances=$(echo "$instances_line" | cut -d'/' -f1)
        local total_instances=$(echo "$instances_line" | cut -d'/' -f2)

        if [[ "$requested_state" == "started" && "$running_instances" -ge 1 ]]; then
            log "INFO" "Application '$app_name' is running."
            return 0  # Application is running
        else
            log "INFO" "Application '$app_name' is not running."
            return 1  # Application is not running
        fi
    else
        log "ERROR" "Failed to check if application '$app_name' is running. Error output: $output"
        return $status  # Return the actual error code
    fi
}

# Function to check if app logs have changed
function check_logs_idle {
    local app_name="$1"
    local previous_logs="$2"

    log "INFO" "Checking logs for activity..."

    # Capture logs for comparison
    local current_logs
    current_logs=$(cf logs --recent "$app_name" 2>&1)

    if [[ "$previous_logs" == "$current_logs" ]]; then
        log "INFO" "No new logs detected for application '$app_name'."
        return 0  # Logs indicate idle
    else
        log "INFO" "Activity detected in logs for application '$app_name'."
        return 1  # Logs indicate activity
    fi
}

# Function to check if tasks are idle
function check_tasks_idle {
    local app_name="$1"
    local previous_tasks="$2"

    log "INFO" "Checking tasks for activity..."

    # Capture tasks for comparison
    local current_tasks
    current_tasks=$(cf tasks "$app_name" 2>&1)

    # Extract the most recent task status
    local recent_task_status
    recent_task_status=$(echo "$current_tasks" | awk '/^[0-9]+/ {latest=$0} END {print latest}' | awk '{print $NF}')

    if [[ "$previous_tasks" == "$current_tasks" && "$recent_task_status" != "PENDING" && "$recent_task_status" != "RUNNING" && "$recent_task_status" != "CANCELING" ]]; then
        log "INFO" "No new tasks detected and no active tasks for application '$app_name'."
        return 0  # Tasks indicate idle
    else
        log "INFO" "Active or pending tasks detected for application '$app_name'."
        return 1  # Tasks indicate activity
    fi
}

# Updated ensure_app_stopped function
function ensure_app_stopped {
    local app_name="tta-automation"
    local timeout=${1:-300}  # Default timeout is 300 seconds (5 minutes)

    log "INFO" "Ensuring application '$app_name' is stopped..."
    local start_time=$(date +%s)
    local current_time

    # Initialize previous values for logs and tasks
    local previous_logs=$(cf logs --recent "$app_name" 2>&1)
    local previous_tasks=$(cf tasks "$app_name" 2>&1)

    while true; do
        current_time=$(date +%s)

        # Check logs and tasks every 60 seconds
        if (( (current_time - start_time) % 60 < 10 )); then
            log "INFO" "Performing periodic checks for logs and tasks."
            if check_logs_idle "$app_name" "$previous_logs" && check_tasks_idle "$app_name" "$previous_tasks"; then
                log "INFO" "Application '$app_name' appears to be idle. Sending shutdown command."
                cf stop "$app_name"
            else
                previous_logs=$(cf logs --recent "$app_name" 2>&1)
                previous_tasks=$(cf tasks "$app_name" 2>&1)
            fi
        fi

        if ! check_app_running; then
            log "INFO" "Application '$app_name' is already stopped."
            return 0  # App is stopped
        fi

        if (( current_time - start_time >= timeout )); then
            log "ERROR" "Timeout reached while waiting for application '$app_name' to stop."
            return 1  # Timeout reached
        fi

        log "INFO" "Waiting for application '$app_name' to stop..."
        sleep 10
    done
}

# Unbind all services from the application
function unbind_all_services() {
    local app_name="tta-automation"
    validate_parameters "$app_name"

    # Get the list of services bound to the application
    local services
    services=$(cf services | grep "$app_name" | awk '{print $1}') >&2 || true

    if [[ -z "$services" ]]; then
        return 0
    fi

    # Loop through each service and unbind it from the application
    for service in $services; do
        if ! cf unbind-service "$app_name" "$service" >&2; then
            log "ERROR" "Failed to unbind service $service from application $app_name."
            return 1
        fi
    done

    return 0
}

# Push the app using a manifest from a specific directory
function push_app {
    local app_name="tta-automation"
    local original_dir=$(pwd)  # Save the original directory
    local directory=$1
    local config=$2

    validate_parameters "$directory"
    validate_parameters "$config"

    # Change to the specified directory and find the manifest file
    cd "$directory" || { log "ERROR" "Failed to change directory to $directory"; cd "$original_dir"; exit 1; }
    local manifest_file=$(find . -type f -name "dynamic-manifest.yml" | head -n 1)

    if [ -z "$manifest_file" ]; then
        log "ERROR" "Manifest file dynamic-manifest.yml not found in directory $directory or its subdirectories"
        cd "$original_dir"
        exit 1
    fi

    # Load the environment from the config file relative to the manifest directory
    local config_file="$(dirname "$manifest_file")/configs/${config}.yml"

    if [ ! -f "$config_file" ]; then
        log "ERROR" "Config file $config_file not found"
        cd "$original_dir"
        exit 1
    fi

    # Unbind services and push the app
    unbind_all_services

    # Scale down all processes to zero
    for process in $(cf app $app_name --guid | jq -r '.process_types[]'); do
        if ! cf scale $app_name -i 0 -p "$process" 2>&1; then
            log "ERROR" "Failed to scale down process: $process"
            cd "$original_dir"
            exit 1
        else
            log "INFO" "Scaled down process: $process."
        fi
    done

    # Delete all processes
    for process in $(cf app $app_name --guid | jq -r '.process_types[]'); do
        if ! cf delete-process $app_name "$process" -f 2>&1; then
            log "ERROR" "Failed to delete process: $process"
            cd "$original_dir"
            exit 1
        else
            log "INFO" "Deleted process: $process."
        fi
    done

    # Push the app
    if ! cf push -f "$manifest_file" --vars-file "$config_file" --no-route --no-start 2>&1; then
        log "ERROR" "Failed to push application"

        cd "$original_dir"
        exit 1
    else
        log "INFO" "Application pushed successfully."
    fi

    # Restore original directory
    cd "$original_dir"
}

# Function to start an app
function start_app {
    local app_name="tta-automation"

    log "INFO" "Starting application '$app_name'..."
    if ! cf start "$app_name"; then
        log "ERROR" "Failed to start application '$app_name'."
        stop_app
        exit 1
    else
        log "INFO" "Application '$app_name' started successfully."
    fi
}

# Function to stop an app
function stop_app {
    local app_name="tta-automation"

    # Unbind all services after stopping the app
    unbind_all_services

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
    local app_name="tta-automation"
    local action=$1  # Action can be 'start', 'stop', or 'restage'

    # Validate the action parameter
    if [[ "$action" != "start" && "$action" != "stop" && "$action" != "restage" ]]; then
        log "ERROR" "Invalid action '$action'. Valid actions are 'start', 'stop', or 'restage'."
        return 1  # Exit with an error status
    fi

    log "INFO" "Telling application '$app_name' to $action..."
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
    local app_name="tta-automation"
    local task_name=$1
    local command=$2
    local args_json=$3
    local config=$4  # New parameter for config

    validate_parameters "$command"
    validate_parameters "$task_name"
    validate_parameters "$args_json"
    validate_parameters "$config"

    # Load the environment from the config file relative to the manifest directory
    local config_file="./automation/configs/${config}.yml"

    if [ ! -f "$config_file" ]; then
        log "ERROR" "Config file $config_file not found"
        exit 1
    fi

    # Extract memory value from config file using awk
    local memory
    memory=$(awk '/memory:/ {print $2}' "$config_file")

    if [ -z "$memory" ]; then
        log "ERROR" "Memory value not found in config file $config_file"
        exit 1
    fi

    # Convert memory from GB to G if necessary
    memory=$(echo "$memory" | sed 's/GB/G/')

    # Convert JSON array to space-separated list of arguments
    local args=$(echo "$args_json" | jq -r '.[]' | sed 's/\(.*\)/"\1"/' | tr '\n' ' ' | sed 's/ $/\n/')

    log "INFO" "Running task: $task_name with args: $args and memory: $memory"
    local full_command="$command $args"
    cf run-task "$app_name" --command "$full_command" --name "$task_name" -m "$memory"
    local result=$?
    if [ $result -ne 0 ]; then
        log "ERROR" "Failed to start task $task_name with error code $result"
        exit $result
    fi
}

# Function to monitor task
function monitor_task {
    local app_name="tta-automation"
    local task_name=$1
    local timeout=${2:-300}  # Default timeout in seconds

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

# Check for active tasks in the application
function check_active_tasks() {
    local app_name="tta-automation"
    local timeout=${1:-300}  # Default timeout is 300 seconds (5 minutes)

    log "INFO" "Checking for active tasks in application '$app_name'..."
    local start_time=$(date +%s)
    local current_time
    local active_tasks

    while true; do
        active_tasks=$(cf tasks "$app_name" | grep -E "RUNNING|PENDING")

        if [ -z "$active_tasks" ]; then
            log "INFO" "No active tasks found in application '$app_name'."
            return 0  # No active tasks
        fi

        current_time=$(date +%s)
        if (( current_time - start_time >= timeout )); then
            log "ERROR" "Timeout reached while waiting for active tasks to complete in application '$app_name'."
            return 1  # Timeout reached
        fi

        log "INFO" "Active tasks found. Waiting for tasks to complete..."
        sleep 10
    done
}

# Function to delete the app
function delete_app {
    local app_name="tta-automation"

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
  local directory config task_name command args timeout_active_tasks timeout_ensure_app_stopped
  directory=$(echo "$json_input" | jq -r '.directory // "./automation"')
  config=$(echo "$json_input" | jq -r '.config // "error"')
  task_name=$(echo "$json_input" | jq -r '.task_name // "default-task-name"')
  command=$(echo "$json_input" | jq -r '.command // "bash /path/to/default-script.sh"')
  args=$(echo "$json_input" | jq -r '.args // "default-arg1 default-arg2"')
  timeout_active_tasks=$(echo "$json_input" | jq -r '.timeout_active_tasks // 300')
  timeout_ensure_app_stopped=$(echo "$json_input" | jq -r '.timeout_ensure_app_stopped // 300')

  # Check for active tasks and ensure the app is stopped before pushing
  if check_app_exists; then
      if ! check_active_tasks "$timeout_active_tasks"; then
          log "ERROR" "Cannot proceed with pushing the app due to active tasks."
          exit 1
      fi
      if ! ensure_app_stopped "$timeout_ensure_app_stopped"; then
          log "ERROR" "Cannot proceed with pushing the app as it is still running."
          exit 1
      fi
  fi

  # Push the app without returning memory
  push_app "$directory" "$config"
  start_app

  # Pass the config to run_task instead of memory
  if run_task "$task_name" "$command" "$args" "$config" && monitor_task "$task_name" $timeout_active_tasks; then
      log "INFO" "Task execution succeeded."
  else
      log "ERROR" "Task execution failed."
      stop_app
      exit 1
  fi

  # Clean up
  stop_app
  # Currently only turning off to aid in speeding up cycle time
  # delete_app "tta-automation"
}

main "$@"
