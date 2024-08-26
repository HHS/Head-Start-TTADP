#!/bin/bash

# Check if an argument is passed
if [ -z "$1" ]; then
    echo "Error: No path to the JavaScript file provided."
    echo "Usage: ./run_process_data.sh <path_to_js_file>"
    exit 1
fi

JS_FILE_PATH=$1

/tmp/lifecycle/shell <<EOF
# Now you're inside the /tmp/lifecycle/shell environment
node $JS_FILE_PATH
EOF
