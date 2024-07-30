#!/bin/bash -x
# Script to retrieve information from latest-backup.txt in S3, get presigned URLs for the files listed,
# and then delete the service key created.

# Function to check if the installed version of cf CLI is at least version 8
check_cf_version() {
    local current_version=$(cf --version | grep "cf version" | awk '{print $3}')
    local minimum_version="8.0.0"
    if [[ "$(printf '%s\n' "$minimum_version" "$current_version" | sort -V | head -n1)" = "$minimum_version" ]]; then
        echo "Current cf version ($current_version) is greater than or equal to $minimum_version." >&2
    else
        echo "Current cf version ($current_version) is less than $minimum_version. Please update your cf CLI." >&2
        exit 1  # Return 1 to indicate error
    fi
}

# Function to check if a service key exists
check_service_key_exists() {
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
create_service_key() {
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
fetch_service_key() {
    local cf_s3_service_name=$1
    local key_name=$2
    local full_output=$(cf service-key "${cf_s3_service_name}" "${key_name}" 2>&1)
    echo "Service key full output: $full_output"
    local credentials_json=$(echo "${full_output}" | awk '/\{/,0')
    if [ -z "${credentials_json}" ]; then
        echo "No JSON data found." >&2
        exit 5
    fi
    echo "Credentials JSON: $credentials_json"
    echo "${credentials_json}"
}

# Delete the S3 service key if deletion is allowed and the key exists
delete_service_key() {
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

# Verify AWS Credentials by checking the identity associated with them
verify_aws_credentials() {
    local retries=5
    local delay=2
    local attempt=1
    echo "Verifying AWS credentials..."
    while [ $attempt -le $retries ]; do
        if aws sts get-caller-identity > /dev/null; then
            echo "AWS credentials are valid."
            return 0
        else
            echo "Failed to verify AWS credentials. Attempt $attempt of $retries."
            attempt=$((attempt + 1))
            sleep $delay
            delay=$((delay * 2))
        fi
    done
    echo "Failed to verify AWS credentials after $retries attempts. Check that your AWS Access Key ID and Secret Access Key are correct."
    exit 10
}

# Function to find the latest-backup.txt file path in S3
find_latest_backup_file_path() {
    local bucket_name=$1
    local s3_folder=$2
    local latest_backup_file_path=$(aws s3 ls "s3://${bucket_name}/${s3_folder}" --recursive | awk '{print $4}' | grep 'latest-backup.txt')
    if [ -z "${latest_backup_file_path}" ]; then
        echo "latest-backup.txt not found in S3 bucket."
        exit 7
    fi
    echo "${latest_backup_file_path}"
}

# Function to generate presigned URLs for given files
generate_presigned_urls() {
    local bucket_name=$1
    local files=("$@")
    local urls=()
    for file in "${files[@]:1}"; do
        local url=$(aws s3 presign "s3://${file}" --expires-in 3600)
        urls+=("$url")
    done
    echo "${urls[@]}"
}

# Function to retrieve and use S3 service credentials
fetch_latest_backup_info_and_cleanup() {
    local cf_s3_service_name="${1:-ttahub-db-backups}"  # Default to 'db-backups' if not provided
    local s3_folder="${2:-production}"  # Default to root of the bucket if not provided
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

    # Debugging output
    echo "AWS_ACCESS_KEY_ID: $aws_access_key_id"
    echo "AWS_SECRET_ACCESS_KEY: $aws_secret_access_key"
    echo "AWS_DEFAULT_REGION: $aws_default_region"
    echo "BUCKET_NAME: $bucket_name"

    # Set AWS environment variables to use AWS CLI
    export AWS_ACCESS_KEY_ID="$aws_access_key_id"
    export AWS_SECRET_ACCESS_KEY="$aws_secret_access_key"
    export AWS_DEFAULT_REGION="$aws_default_region"
    verify_aws_credentials

    local latest_backup_file_path=$(find_latest_backup_file_path "$bucket_name" "$s3_folder")

    # Download and read the latest-backup.txt file using the full path
    aws s3 cp "s3://${bucket_name}/${latest_backup_file_path}" /tmp/latest-backup.txt

    # Extract the names of the latest backup and password files
    local backup_file_name=$(awk 'NR==1' /tmp/latest-backup.txt)
    local md5_file_name=$(awk 'NR==2' /tmp/latest-backup.txt)
    local sha256_file_name=$(awk 'NR==3' /tmp/latest-backup.txt)
    local password_file_name=$(awk 'NR==4' /tmp/latest-backup.txt)

    # Generate presigned URLs for these files
    local urls=$(generate_presigned_urls "$bucket_name" "$backup_file_name" "$password_file_name" "$md5_file_name" "$sha256_file_name")

    # Print presigned URLs
    echo "Presigned URLs for the files:"
    for url in ${urls[@]}; do
        echo "$url"
        echo ""
    done

    # Clean up by deleting the service key
    delete_service_key "$cf_s3_service_name" "$key_name" "$deletion_allowed"
}

check_cf_version

# Main execution block
if [ "$#" -gt 3 ]; then
    echo "Usage: $0 [<CF_S3_SERVICE_NAME> [<s3_folder> [<DELETION_ALLOWED>]]]"
    exit 12
fi

# Check for required dependencies (cf CLI and AWS CLI)
if ! type cf >/dev/null 2>&1 || ! type aws >/dev/null 2>&1; then
    echo "Error: Make sure both Cloud Foundry CLI and AWS CLI are installed."
    exit 12
fi

# Fetch the latest backup information, generate URLs, and clean up the service key
fetch_latest_backup_info_and_cleanup "$1" "$2" "$3"
