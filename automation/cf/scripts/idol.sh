#!/bin/bash

while true; do
  # Check if the 'stop' file exists in the root or /tmp directory
  if [ -f /stop ] || [ -f /tmp/stop ]; then
    echo "Stop file found. Exiting loop."
    break
  fi
  sleep 1
done
