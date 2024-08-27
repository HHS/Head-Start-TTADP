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

# Run the Node.js script
node $1

# Capture the exit code of the Node.js command
SHELL_EXIT_CODE=$?

echo "Script exited with code $SHELL_EXIT_CODE" >&2

# Exit the script with the same exit code
exit $SHELL_EXIT_CODE
