#!/bin/bash

while true; do
  node build/server/src/index.js
  APP_EXIT_CODE=$?
  if [ "$APP_EXIT_CODE" -eq 111 ]; then
    echo "SequelizeConnectionAcquireTimeoutError detected. Restarting the application..."
  else
    echo "Application exited with code $APP_EXIT_CODE. Not restarting."
    exit $APP_EXIT_CODE
  fi
done
