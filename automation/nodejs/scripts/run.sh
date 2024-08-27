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

# Run the lifecycle shell and capture the exit code
/tmp/lifecycle/shell <<EOF
# Inside the lifecycle environment

# Print environment variables for debugging
echo "Environment variables:" >&2
printenv >&2

# Ensure Node.js is in the PATH or specify the full path if needed
export PATH="/home/vcap/app/.heroku/node/bin:$PATH"

# Set the app directory environment variable (if required)
export APP_DIR="/home/vcap/app"

# Set the working directory explicitly
cd /home/vcap/app

# Check Node.js version
echo "Node.js version:" >&2
node -v >&2

# Run the Node.js script
node $1
EOF

# Capture the exit code of the shell command
SHELL_EXIT_CODE=$?

echo "Shell exited with code $SHELL_EXIT_CODE" >&2

# Exit the script with the same exit code
exit $SHELL_EXIT_CODE
