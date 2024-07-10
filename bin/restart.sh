#!/bin/bash

while true; do
  yarn start:web
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 1234 ]; then
    echo "SequelizeConnectionAcquireTimeoutError detected. Restarting the application..."
  else
    echo "Application exited with code $EXIT_CODE. Not restarting."
    exit $EXIT_CODE
  fi
done
