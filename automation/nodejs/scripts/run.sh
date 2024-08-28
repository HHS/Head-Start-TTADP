#!/bin/bash -x

# Function to log messages with a timestamp
function log() {
    local type="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $type: $message" >&2
}

# Function to monitor memory usage
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

# Check if an argument is passed
if [ -z "$1" ]; then
    echo "Error: No path to the JavaScript file provided."
    echo "Usage: ./run_process_data.sh <path_to_js_file>"
    exit 1
fi

# Change to the application directory
cd /home/vcap/app || exit

echo "Current directory:" $(pwd) >&2
echo "JS File Path:" $1 >&2
echo "env:" $(env) >&2

# Set the PATH from the lifecycle environment
export PATH=/home/vcap/deps/0/bin:/bin:/usr/bin:/home/vcap/app/bin:/home/vcap/app/node_modules/.bin

# Extract the MEMORY_LIMIT environment variable and determine the unit
if [[ $MEMORY_LIMIT == *GB ]]; then
  # Convert gigabytes to megabytes
  MEMORY_LIMIT_MB=$((${MEMORY_LIMIT%GB} * 1024))
elif [[ $MEMORY_LIMIT == *MB ]]; then
  # Use megabytes as is
  MEMORY_LIMIT_MB=${MEMORY_LIMIT%MB}
else
  echo "Unsupported MEMORY_LIMIT format: '$MEMORY_LIMIT'"
  exit 1
fi

# Calculate 80% of the MEMORY_LIMIT
MAX_OLD_SPACE_SIZE=$(echo "$MEMORY_LIMIT_MB * 0.8" | bc)

# Round to the nearest whole number
MAX_OLD_SPACE_SIZE=${MAX_OLD_SPACE_SIZE%.*}

# Start memory monitoring in the background
monitor_memory $$ &

# Run the Node.js script
node --max-old-space-size=$MAX_OLD_SPACE_SIZE --expose-gc $1

# Capture the exit code of the Node.js command
SHELL_EXIT_CODE=$?

echo "Script exited with code $SHELL_EXIT_CODE" >&2

# Exit the script with the same exit code
exit $SHELL_EXIT_CODE
