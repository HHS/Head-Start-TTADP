#!/usr/bin/env bash
# Usage: bin/check-email-testing-setup.sh <command...>

# check for "digests" flag
digests_flag=false
for arg in "$@"; do
  if [ "$arg" == "digests" ]; then
    digests_flag=true
    break
  fi
done

# create exit code variable to track if errors occurred
exit_code=0

# Read .env
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Check if the SMTP_HOST is set to mailpit
if [ "$SMTP_HOST" != "mailpit" ]; then
  echo "SMTP_HOST is not set to mailpit. Please set SMTP_HOST=mailpit in your .env file for email testing."
  exit_code=1
fi

if [ "$SEND_NOTIFICATIONS" != "true" ]; then
  echo "SEND_NOTIFICATIONS is not set to true. Please set SEND_NOTIFICATIONS=true in your .env file for email testing."
  exit_code=1
fi

if [ "$digests_flag" == "true" ]; then
  if [ "$FORCE_CRON" != "true" ]; then
    echo "FORCE_CRON is not set to true. Please set FORCE_CRON=true in your .env file for testing email digests."
    exit_code=1
  fi
fi

exit $exit_code