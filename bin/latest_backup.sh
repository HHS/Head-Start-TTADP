#!/bin/bash

# Function to check if the installed version of cf CLI is at least version 8
check_cf_version() {
    local current_version=$(cf --version | grep "cf version" | awk '{print $3}')
    local minimum_version="8.0.0"
    if [[ "$(printf '%s\n' "$minimum_version" "$current_version" | sort -V | head -n1)" = "$minimum_version" ]]; then
        echo "Current cf version ($current_version) is greater than or equal to $minimum_version." >&2
    else
        echo "Current cf version ($current_version) is less than $minimum_version. Please update your cf CLI." >&2
        return 1  # Return 1 to indicate error
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
    local credentials_json=$(echo "${full_output}" | awk '/\{/,0')
    if [ -z "${credentials_json}" ]; then
        echo "No JSON data found." >&2
        exit 5
    fi
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

# Function to delete service keys older than 6 hours
delete_old_service_keys() {
    local cf_s3_service_name=$1
    local current_time=$(date +%s)
    local six_hours_in_seconds=21600
    echo "Deleting service keys older than 6 hours for service instance ${cf_s3_service_name}..."
    
    cf service-keys "${cf_s3_service_name}" | awk 'NR>1 {print $1}' | while read -r key_name; do
        if [[ $key_name =~ ^${cf_s3_service_name}-key- ]]; then
            local key_creation_time=$(cf service-key "${cf_s3_service_name}" "${key_name}" | grep -oP '(?<=created:\s).+')
            local key_creation_timestamp=$(date --date="$key_creation_time" +%s)
            local key_age=$((current_time - key_creation_timestamp))
            if (( key_age > six_hours_in_seconds )); then
                echo "Deleting old service key ${key_name}..."
                cf delete-service-key "${cf_s3_service_name}" "${key_name}" -f
            fi
        fi
    done
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
        local url=$(aws s3 presign "s3://${bucket_name}/${file}" --expires-in 3600)
        urls+=("$url")
    done
    echo "${urls[@]}"
}

# Function to list all ZIP files in the same S3 path as the latest backup
list_all_zip_files() {
    local bucket_name=$1
    local s3_folder=$2
    local zip_files=$(aws s3 ls "s3://${bucket_name}/${s3_folder}" --recursive | grep '.zip\|.pwd\|.md5\|.sha256')
    if [ -z "${zip_files}" ]; then
        echo "No ZIP files found in S3 bucket."
    else
        echo "ZIP files in S3 bucket:"
        printf "%-50s %-5s %-5s %-5s %-15s %-5s\n" "Name" "pwd" "md5" "sha256" "size(zip)" "age(days)"
        current_date=$(date +%s)
        echo "${zip_files}" | awk -v current_date="$current_date" '
        function get_age(date_str, time_str) {
            split(date_str, date_parts, "-")
            split(time_str, time_parts, ":")
            file_time = mktime(date_parts[1] " " date_parts[2] " " date_parts[3] " " time_parts[1] " " time_parts[2] " " time_parts[3])
            return int((current_date - file_time) / 86400)
        }
        {
            split($4, parts, "/")
            file = parts[length(parts)]
            split(file, nameparts, ".")
            base = nameparts[1]
            for (i=2; i<length(nameparts); i++) {
                base = base "." nameparts[i]
            }
            ext = nameparts[length(nameparts)]
            files[base][ext] = 1
            sizes[base] = $3
            ages[base] = get_age($1, $2)
        }
        END {
            for (base in files) {
                pwd_file = (files[base]["pwd"] ? "x" : " ")
                md5_file = (files[base]["md5"] ? "x" : " ")
                sha256_file = (files[base]["sha256"] ? "x" : " ")
                human_readable_size = sizes[base] " B"
                cmd = "numfmt --to=iec-i --suffix=B " sizes[base]
                cmd | getline human_readable_size
                close(cmd)
                data[base] = sprintf("%-50s %-5s %-5s %-5s  %-15s %-5s\n", base".zip", pwd_file, md5_file, sha256_file, human_readable_size, ages[base])
            }
            n = asorti(data, sorted)
            for (i = 1; i <= n; i++) {
                printf "%s", data[sorted[i]]
            }
        }'
    fi
}

# Function to verify that a file exists in S3
verify_file_exists() {
    local bucket_name=$1
    local file_name=$2
    if aws s3 ls "s3://${bucket_name}/${file_name}" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to download and verify files
download_and_verify() {
    local zip_url=$1
    local zip_file_name=$2
    local password_url=$3
    local md5_url=$4
    local sha256_url=$5

    # Download the zip file
    wget -O "$zip_file_name" "$zip_url"

    # Download password, SHA-256 checksum, and MD5 checksum directly into variables
    local password=$(curl -s "$password_url")
    local checksum_sha256=$(curl -s "$sha256_url")
    local checksum_md5=$(curl -s "$md5_url")

    # Verify SHA-256 checksum
    echo "Verifying SHA-256 checksum..."
    echo "$checksum_sha256 $zip_file_name" | sha256sum -c
    if [ $? -ne 0 ]; then
        echo "SHA-256 checksum verification failed."
        exit 1
    else
        echo "SHA-256 checksum verified."
    fi

    # Verify MD5 checksum
    echo "Verifying MD5 checksum..."
    echo "$checksum_md5 $zip_file_name" | md5sum -c
    if [ $? -ne 0 ]; then
        echo "MD5 checksum verification failed."
        exit 1
    else
        echo "MD5 checksum verified."
    fi

    # Unzip the file
    echo "Unzipping the file..."
    unzip -P "$password" "$zip_file_name"
    if [ $? -eq 0 ]; then
        echo "File unzipped successfully."

        # Rename the extracted file
        extracted_file="-"
        new_name="${zip_file_name%.zip}"
        mv "$extracted_file" "$new_name"
        if [ $? -eq 0 ]; then
            echo "File renamed to $new_name."
        else
            echo "Failed to rename the file."
            exit 1
        fi
    else
        echo "Failed to unzip the file."
        exit 1
    fi
}

# Function to erase a set of files from S3
erase_files() {
    local bucket_name=$1
    local s3_folder=$2
    local zip_file=$3

    local pwd_file="${zip_file%.zip}.pwd"
    local md5_file="${zip_file%.zip}.md5"
    local sha256_file="${zip_file%.zip}.sha256"

    local files_to_delete=("$zip_file" "$pwd_file" "$md5_file" "$sha256_file")

    echo "Deleting files from S3:"
    for file in "${files_to_delete[@]}"; do
        local file_path="${s3_folder}/${file}"
        if aws s3 ls "s3://${bucket_name}/${file_path}" > /dev/null 2>&1; then
            echo "Deleting ${file_path}..."
            if aws s3 rm "s3://${bucket_name}/${file_path}"; then
                echo "${file_path} deleted successfully."
            else
                echo "Failed to delete ${file_path}."
                exit 9
            fi
        else
            echo "${file_path} does not exist, skipping deletion."
        fi
    done
}


# Function to retrieve and use S3 service credentials
fetch_latest_backup_info_and_cleanup() {
    local cf_s3_service_name="${cf_s3_service_name:-ttahub-db-backups}"  # Default to 'db-backups' if not provided
    local s3_folder="${s3_folder:-production}"  # Default to root of the bucket if not provided
    local deletion_allowed="${deletion_allowed:-no}"  # Default to no deletion if not provided
    local list_zip_files="${list_zip_files:-no}"  # Default to no listing of ZIP files if not provided
    local specific_file="${specific_file:-}"
    local download_and_verify="${download_and_verify:-no}"
    local erase_file="${erase_file:-}"
    local delete_old_keys="${delete_old_keys:-no}"

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

    if [ "${delete_old_keys}" = "yes" ]; then
        delete_old_service_keys "$cf_s3_service_name"
    fi

    if [ "${erase_file}" != "" ]; then
        # Erase the specified file along with its corresponding pwd, md5, and sha256 files
        erase_files "$bucket_name" "$s3_folder" "$erase_file"
    elif [ "${list_zip_files}" = "yes" ]; then
        # List all ZIP files if the option is enabled
        list_all_zip_files "$bucket_name" "$s3_folder"
    else
        if [ -n "$specific_file" ]; then
            backup_file_name="${s3_folder}/${specific_file}"
            if ! verify_file_exists "$bucket_name" "$backup_file_name"; then
                echo "Specified file does not exist in S3 bucket."
                exit 8
            fi
        else
            local latest_backup_file_path=$(find_latest_backup_file_path "$bucket_name" "$s3_folder")

            # Download and read the latest-backup.txt file using the full path
            aws s3 cp "s3://${bucket_name}/${latest_backup_file_path}" /tmp/latest-backup.txt

            # Extract the names of the latest backup and password files
            local backup_file_name=$(awk 'NR==1' /tmp/latest-backup.txt)
        fi

        local md5_file_name="${backup_file_name%.zip}.md5"
        local sha256_file_name="${backup_file_name%.zip}.sha256"
        local password_file_name="${backup_file_name%.zip}.pwd"

        # Generate presigned URLs for these files
        local urls
        IFS=' ' read -r -a urls <<< "$(generate_presigned_urls "$bucket_name" "$backup_file_name" "$password_file_name" "$md5_file_name" "$sha256_file_name")"

        if [ "${download_and_verify}" = "yes" ]; then
            # Perform download and verify functionality
            download_and_verify "${urls[0]}" "$(basename "$backup_file_name")" "${urls[1]}" "${urls[2]}" "${urls[3]}"
        else
            # Print presigned URLs
            echo "Presigned URLs for the files:"
            for url in "${urls[@]}"; do
                echo "$url"
                echo ""
            done
        fi
    fi

    # Clean up by deleting the service key
    delete_service_key "$cf_s3_service_name" "$key_name" "$deletion_allowed"
}

check_cf_version

# Main execution block
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -n|--service-name) cf_s3_service_name="$2"; shift ;;
        -s|--s3-folder) s3_folder="$2"; shift ;;
        -a|--allow-deletion) deletion_allowed="yes" ;;
        -l|--list-zip-files) list_zip_files="yes" ;;
        -f|--specific-file) specific_file="$2"; shift ;;
        -d|--download-and-verify) download_and_verify="yes"; deletion_allowed="yes" ;;
        -e|--erase-file) erase_file="$2"; shift ;;
        -k|--delete-old-keys) delete_old_keys="yes" ;;
        -h|--help) echo "Usage: $0 [-n | --service-name <CF_S3_SERVICE_NAME>] [-s | --s3-folder <s3_folder>] [-a | --allow-deletion] [-l | --list-zip-files] [-f | --specific-file <file_name>] [-d | --download-and-verify] [-e | --erase-file <zip_file>] [-k | --delete-old-keys]"; exit 0 ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Check for required dependencies (cf CLI and AWS CLI)
if ! type cf >/dev/null 2>&1 || ! type aws >/dev/null 2>&1; then
    echo "Error: Make sure both Cloud Foundry CLI and AWS CLI are installed."
    exit 1
fi

# Fetch the latest backup information, generate URLs, and clean up the service key
fetch_latest_backup_info_and_cleanup
