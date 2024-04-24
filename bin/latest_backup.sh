#!/bin/bash
# Script to retrieve information from latest-backup.txt in S3, get presigned URLs for the files listed,
# and then delete the service key created.

# Function to check if the installed version of cf CLI is at least version 8
check_cf_version() {
    # Get the current version of cf CLI
    current_version=$(cf --version | grep "cf version" | awk '{print $3}')

    # Define the minimum required version
    minimum_version="8.0.0"

    # Compare the current version with the minimum version
    if [[ "$(printf '%s\n' "$minimum_version" "$current_version" | sort -V | head -n1)" = "$minimum_version" ]]; then
        echo "Current cf version ($current_version) is greater than or equal to $minimum_version." >&2
    else
        echo "Current cf version ($current_version) is less than $minimum_version. Please update your cf CLI." >&2
        return 1  # Return 1 to indicate error
    fi
}

# Function to check if a service key exists
function check_service_key_exists() {
    local cf_s3_service_name=$1
    local key_name=$2
    echo "Checking if service key ${key_name} exists..."
    if cf service-keys "${cf_s3_service_name}" | grep -q "${key_name}"; then
        echo "Service key ${key_name} exists."
        return 0
    else
        echo "Service key ${key_name} does not exist."
        return 2
    fi
}

# Create a service key
function create_service_key() {
    local cf_s3_service_name=$1
    local key_name=$2
    if check_service_key_exists "${cf_s3_service_name}" "${key_name}"; then
      echo "Service key with name ${key_name} already exists"
    else
      echo "Creating service key with name ${key_name}..."
      if ! cf create-service-key "${cf_s3_service_name}" "${key_name}"; then
          echo "Failed to create service key." >&2
          exit 3
      elif ! check_service_key_exists "${cf_s3_service_name}" "${key_name}"; then
          echo "Failed to create service key, even though it returned success." >&2
          exit 4
      fi
    fi
}

# Fetch the service key credentials and filter out the JSON part
function fetch_service_key() {
    local cf_s3_service_name=$1
    local key_name=$2
    # Capture the entire output of the command, without echo commands affecting it
    full_output=$(cf service-key "${cf_s3_service_name}" "${key_name}" 2>&1)

    # Use awk to capture lines starting from the first '{' until the end of the file
    credentials_json=$(echo "${full_output}" | awk '/\{/,0')
    if [ -z "${credentials_json}" ]; then
        echo "No JSON data found." >&2
        exit 5
    fi

    # Output the filtered JSON, removing any extraneous output before it
    echo "${credentials_json}"
}


# Delete the S3 service key if deletion is allowed and the key exists
function delete_service_key() {
    local cf_s3_service_name=$1
    local key_name=$2
    local deletion_allowed=$3
    if [ "${deletion_allowed}" = "yes" ]; then
        if check_service_key_exists "${cf_s3_service_name}" "${key_name}"; then
            echo "Deleting service key ${key_name}..."
            if ! cf delete-service-key "${cf_s3_service_name}" "${key_name}" -f; then
                echo "Failed to delete service key ${key_name}." >&2
                exit 2
            fi
        else
            echo "No service key ${key_name} to delete."
        fi
    else
        echo "Service key deletion is not enabled. Set DELETION_ALLOWED=yes to enable."
    fi
}

# Validate JSON
function validate_json() {
    echo "Validating JSON..."
    if ! echo "$1" | jq empty 2>/dev/null; then
        echo "Invalid JSON format." >&2
        exit 6
    fi
}

# Verify AWS Credentials by checking the identity associated with them
function verify_aws_credentials() {
    echo "Verifying AWS credentials..."
    if ! aws sts get-caller-identity > /dev/null; then
        echo "Failed to verify AWS credentials. Check that your AWS Access Key ID and Secret Access Key are correct."
        exit 10
    fi
    echo "AWS credentials are valid."
}

# Function to re-verify AWS credentials before accessing S3
function re_verify_aws_credentials() {
    echo "Re-verifying AWS credentials before accessing S3..."
    if ! aws sts get-caller-identity > /dev/null; then
        echo "AWS credentials failed verification just before S3 access."
        exit 11
    fi
    echo "AWS credentials re-verified successfully."
}

# Function to list all files in the bucket and find the path of latest-backup.txt
function find_latest_backup_file_path() {
    local bucket_name=$1
    local s3_folder=$2
    # List all files in the bucket and grep for latest-backup.txt, extracting its path
    local latest_backup_file_path=$(aws s3 ls "s3://${bucket_name}/${s3_folder}" --recursive | awk '{print $4}' | grep 'latest-backup.txt')
    if [ -z "${latest_backup_file_path}" ]; then
        echo "latest-backup.txt not found in S3 bucket."
        exit 7
    fi
    echo "${latest_backup_file_path}"
}



# Function to retrieve and use S3 service credentials
function fetch_latest_backup_info_and_cleanup() {
    local cf_s3_service_name="${1:-ttahub-db-backups}"  # Default to 'db-backups' if not provided
    local s3_folder="${2:-}"  # Default to root of the bucket if not provided
    local deletion_allowed="${3:-no}"  # Default to no deletion if not provided

    # Generate a unique service key name using UUID
    local key_name="${cf_s3_service_name}-key-$(uuidgen)"
    echo "Using service key name: $key_name for service instance: $cf_s3_service_name"

    # Attempt to retrieve or create the service key
    create_service_key "$cf_s3_service_name" "$key_name"

    credentials_json=$(fetch_service_key "$cf_s3_service_name" "$key_name")

    # Parse AWS credentials and bucket name from service key output
    local aws_access_key_id=$(echo "${credentials_json}" | jq -r '.credentials.access_key_id')
    local aws_secret_access_key=$(echo "${credentials_json}" | jq -r '.credentials.secret_access_key')
    local aws_default_region=$(echo "${credentials_json}" | jq -r '.credentials.region')
    local bucket_name=$(echo "${credentials_json}" | jq -r '.credentials.bucket')

    # Set AWS environment variables to use AWS CLI
    export AWS_ACCESS_KEY_ID="$aws_access_key_id"
    export AWS_SECRET_ACCESS_KEY="$aws_secret_access_key"
    export AWS_DEFAULT_REGION="$aws_default_region"
    verify_aws_credentials

    aws s3 ls "s3://${bucket_name}/" --recursive

    re_verify_aws_credentials
    local latest_backup_file_path=$(aws s3 ls "s3://${bucket_name}/${s3_folder}" --recursive | awk '{print $4}' | grep 'latest-backup.txt')
    if [ -z "${latest_backup_file_path}" ]; then
        echo "latest-backup.txt not found in S3 bucket."
        exit 7
    fi
    echo "${latest_backup_file_path}"

   # Adjusted part of the fetch_latest_backup_info_and_cleanup function
    local latest_backup_file_path=$(find_latest_backup_file_path "$bucket_name" "$s3_folder")
    if [ -z "$latest_backup_file_path" ]; then
        echo "No latest-backup.txt file found."
        exit 8
    fi

    # Download and read the latest-backup.txt file using the full path
    aws s3 cp "s3://${bucket_name}/${latest_backup_file_path}" /tmp/latest-backup.txt

    cat /tmp/latest-backup.txt

    # Extract the names of the latest backup and password files
    local backup_file_name=$(awk 'NR==1' /tmp/latest-backup.txt)
    local password_file_name=$(awk 'NR==2' /tmp/latest-backup.txt)

    # Generate presigned URLs for these files
    local backup_file_url=$(aws s3 presign "s3://${backup_file_name}" --expires-in 3600)
    local password_file_url=$(aws s3 presign "s3://${password_file_name}" --expires-in 3600)

    # Echo the presigned URL for the latest backup file
    echo "Presigned URL for the latest backup file ($backup_file_name):"
    echo "$backup_file_url"
    echo ""  # This adds a blank line for better readability

    # Echo the presigned URL for the password file
    echo "Presigned URL for the password file ($password_file_name):"
    echo "$password_file_url"
    echo ""  # This adds a blank line for better readability


    # Clean up by deleting the service key
    delete_service_key "$cf_s3_service_name" "$key_name" "$deletion_allowed"
}

check_cf_version

# Main execution block
if [ "$#" -gt 3 ]; then
    echo "Usage: $0 [<CF_S3_SERVICE_NAME> [<s3_folder> [<DELETION_ALLOWED>]]]"
    exit 1
fi

# Check for required dependencies (cf CLI and AWS CLI)
if ! type cf >/dev/null 2>&1 || ! type aws >/dev/null 2>&1; then
    echo "Error: Make sure both Cloud Foundry CLI and AWS CLI are installed."
    exit 1
fi

# Fetch the latest backup information, generate URLs, and clean up the service key
fetch_latest_backup_info_and_cleanup "$1" "$2" "$3"
