#!/bin/bash -x

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
echo "Contents of directory:" >&2
ls -al >&2

# Set the PATH from the lifecycle environment
export PATH=/home/vcap/deps/0/bin:/bin:/usr/bin:/home/vcap/app/bin:/home/vcap/app/node_modules/.bin

# Extract the MEMORY_LIMIT environment variable and determine the unit
if [[ $MEMORY_LIMIT == *G ]]; then
  # Convert gigabytes to megabytes
  MEMORY_LIMIT_MB=$((${MEMORY_LIMIT%G} * 1024))
elif [[ $MEMORY_LIMIT == *M ]]; then
  # Use megabytes as is
  MEMORY_LIMIT_MB=${MEMORY_LIMIT%M}
else
  echo "Unsupported MEMORY_LIMIT format."
  exit 1
fi

# Calculate 80% of the MEMORY_LIMIT
MAX_OLD_SPACE_SIZE=$(echo "$MEMORY_LIMIT_MB * 0.8" | bc)

# Round to the nearest whole number
MAX_OLD_SPACE_SIZE=${MAX_OLD_SPACE_SIZE%.*}

# Run the Node.js script
node --max-old-space-size=$MAX_OLD_SPACE_SIZE  $1

# Capture the exit code of the Node.js command
SHELL_EXIT_CODE=$?

echo "Script exited with code $SHELL_EXIT_CODE" >&2

# Exit the script with the same exit code
exit $SHELL_EXIT_CODE
