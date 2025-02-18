#!/bin/bash

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

# Function to delete older service keys
delete_old_service_keys() {
    local cf_s3_service_name=$1
    local current_service_key=$2
    local current_time=$(date +%s)
    local six_hours_in_seconds=21600
    echo "Deleting older service keys for service instance ${cf_s3_service_name}..."

    cf service-keys "${cf_s3_service_name}" | grep -v $current_service_key | awk 'NR>1 {print $1}' | while read -r key_name; do
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
        # Check if the file exists in the S3 bucket
        if aws s3 ls "s3://${bucket_name}/${file}" >/dev/null 2>&1; then
            local url=$(aws s3 presign "s3://${bucket_name}/${file}" --expires-in 3600)
            urls+=("$url")
        else
            echo "Error: File s3://${bucket_name}/${file} does not exist."
            exit 1
        fi
    done

    echo "${urls[@]}"
}

# Function to list all ZIP and ZENC files in the same S3 path as the latest backup
list_all_backup_files() {
    local bucket_name=$1
    local s3_folder=$2
    local backup_files=$(aws s3 ls "s3://${bucket_name}/${s3_folder}" --recursive | grep -E '\.zip|\.zenc|\.pwd|\.md5|\.sha256')
    if [ -z "${backup_files}" ]; then
        echo "No backup files found in S3 bucket."
    else
        echo "Backup files in S3 bucket:"
        printf "%-50s %-7s %-5s %-5s %-5s %-15s %-5s\n" "Name" "Format" "pwd" "md5" "sha256" "size" "age(days)"
        current_date=$(date +%s)
        echo "${backup_files}" | \
        while IFS= read -r line; do \
          echo "${line##*.} ${line}";\
        done |\
        sort -rk5 |\
        tr '\n' ' ' | \
        sed 's~ \(zip\|zenc\) ~\n& ~g' |\
        sed -r 's/^[ \t]*//g' |\
        sed -r 's/[ \t]+/ /g' |\
        awk '{print $0 "\n"}' | \
        while IFS= read -r line; do
          backup_file=$(echo "${line}" | awk '{split($5, a, "/"); print a[length(a)]}')
          format=$(echo "${line}" | awk '{print $1}')
          has_pwd=$([[ $line == *" pwd "* ]] && echo "x" || echo "")
          has_md5=$([[ $line == *" md5 "* ]] && echo "x" || echo "")
          has_sha256=$([[ $line == *" sha256 "* ]] && echo "x" || echo "")
          
          # Extract the size and validate it's numeric before passing to numfmt
          backup_size=$(echo "${line}" | awk '{print $4}')
          if [[ "$backup_size" =~ ^[0-9]+$ ]]; then
            backup_size=$(numfmt --to=iec-i --suffix=B "$backup_size")
          else
            backup_size="N/A"  # Handle cases where the size is not a number
          fi

          if [[ "$OSTYPE" == "darwin"* ]]; then
            backup_age=$(( ( $(date +%s) - $(date -j -f "%Y-%m-%d" "$(echo "${line}" | awk '{print $2}')" +%s) ) / 86400 ))
          else
            backup_age=$(( ( $(date +%s) - $(date -d "$(echo "${line}" | awk '{print $2}')" +%s) ) / 86400 ))
          fi

          printf "%-50s %-7s %-5s %-5s %-5s %-15s %-5s\n" "$backup_file" "$format" "$has_pwd" "$has_md5" "$has_sha256" "$backup_size" "$backup_age"
        done |\
        sort -k1 |\
        grep -v "N/A"
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
    local backup_url=$1
    local backup_file_name=$2
    local password_url=$3
    local md5_url=$4
    local sha256_url=$5
    local format=$6

    # Check if wget is installed
    if command -v wget &>/dev/null; then
        echo "Using wget to download the file."
        downloader="wget -O -"
    else
        # If wget is not installed, use curl
        echo "wget is not installed. Using curl to download the file."
        downloader="curl -s"
    fi

    # Download password, SHA-256 checksum, and MD5 checksum directly into variables
    local password=$(curl -s "$password_url")
    local checksum_sha256=$(curl -s "$sha256_url")
    local checksum_md5=$(curl -s "$md5_url")

   # Download file
    echo "Downloading file..."
    $downloader "$backup_url" > "$backup_file_name"

    # Calculate hashes
    echo "Calculating hashes..."
    sha256sum "$backup_file_name" | awk '{print $1}' > "${backup_file_name}.sha256"
    md5sum "$backup_file_name" | awk '{print $1}' > "${backup_file_name}.md5"

    # Verify SHA-256 checksum
    echo "Verifying SHA-256 checksum..."
    if [[ $(cat "${backup_file_name}.sha256") != "$checksum_sha256" ]]; then
        echo "SHA-256 checksum verification failed."
        exit 1
    else
        echo "SHA-256 checksum verified."
    fi
    rm "${backup_file_name}.sha256"

    # Verify MD5 checksum
    echo "Verifying MD5 checksum..."
    if [[ $(cat "${backup_file_name}.md5") != "$checksum_md5" ]]; then
        echo "MD5 checksum verification failed."
        exit 1
    else
        echo "MD5 checksum verified."
    fi
    rm "${backup_file_name}.md5"

    if [ "$format" = "zip" ]; then
        # Unzip the file
        echo "Unzipping the file..."
        unzip -P "$password" "$backup_file_name"
        if [ $? -eq 0 ]; then
            echo "File unzipped successfully."
            # Rename the extracted file
            extracted_file=$(unzip -l "$backup_file_name" | awk 'NR==4 {print $4}')
            new_name="${backup_file_name%.zip}"
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
    elif [ "$format" = "zenc" ]; then
        # Decrypt and decompress the already downloaded file
        echo "Decrypting and decompressing the file..."
        openssl enc -d -aes-256-cbc -salt -pbkdf2 -k "${password}" -in "$backup_file_name" |\
          gzip -d -c > "${backup_file_name%.zenc}"
        if [ $? -eq 0 ]; then
            echo "File decrypted and decompressed successfully: ${backup_file_name%.zenc}"
        else
            echo "Failed to decrypt and decompress the file."
            exit 1
        fi
    else
        echo "Unknown backup format: $format"
        exit 1
    fi
}


# Function to erase a set of files from S3
erase_files() {
    local bucket_name=$1
    local s3_folder=$2
    local backup_file=$3

    local pwd_file="${backup_file%.zip}.pwd"
    local md5_file="${backup_file%.zip}.md5"
    local sha256_file="${backup_file%.zip}.sha256"

    local files_to_delete=("$backup_file" "$pwd_file" "$md5_file" "$sha256_file")

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
    local list_backup_files="${list_backup_files:-no}"  # Default to no listing of ZIP files if not provided
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
        delete_old_service_keys "$cf_s3_service_name" "$key_name"
    elif [ "${erase_file}" != "" ]; then
        # Erase the specified file along with its corresponding pwd, md5, and sha256 files
        erase_files "$bucket_name" "$s3_folder" "$erase_file"
    elif [ "${list_backup_files}" = "yes" ]; then
        # List all ZIP and ZENC files if the option is enabled
        list_all_backup_files "$bucket_name" "$s3_folder"
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
            backup_file_name=${backup_file_name#"$bucket_name/"}
        fi

        local md5_file_name="${backup_file_name%.zip}.md5"
        local sha256_file_name="${backup_file_name%.zip}.sha256"
        local password_file_name="${backup_file_name%.zip}.pwd"

        # Determine the backup format
        local format="zip"
        if [[ "$backup_file_name" == *.zenc ]]; then
            format="zenc"
            md5_file_name="${backup_file_name%.zenc}.md5"
            sha256_file_name="${backup_file_name%.zenc}.sha256"
            password_file_name="${backup_file_name%.zenc}.pwd"
        fi

        # Generate presigned URLs for these files
        local urls
        IFS=' ' read -r -a urls <<< "$(generate_presigned_urls "$bucket_name" "$backup_file_name" "$password_file_name" "$md5_file_name" "$sha256_file_name")"

        if [ "${download_and_verify}" = "yes" ]; then
            # Perform download and verify functionality
            download_and_verify "${urls[0]}" "$(basename "$backup_file_name")" "${urls[1]}" "${urls[2]}" "${urls[3]}" "$format"
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

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -n|--service-name) cf_s3_service_name="$2"; shift ;;
        -s|--s3-folder) s3_folder="$2"; shift ;;
        -a|--allow-deletion) deletion_allowed="yes" ;;
        -l|--list-backup-files) list_backup_files="yes" ;;
        -f|--specific-file) specific_file="$2"; shift ;;
        -d|--download-and-verify) download_and_verify="yes"; deletion_allowed="yes" ;;
        -e|--erase-file) erase_file="$2"; shift ;;
        -k|--delete-old-keys) delete_old_keys="yes" ;;
        -h|--help) echo "Usage: $0 [-n | --service-name <CF_S3_SERVICE_NAME>] [-s | --s3-folder <s3_folder>] [-a | --allow-deletion] [-l | --list-backup-files] [-f | --specific-file <file_name>] [-d | --download-and-verify] [-e | --erase-file <zip_file>] [-k | --delete-old-keys]"; exit 0 ;;
        *) echo "Unknown parameter passed: $1"; exit 12 ;;
    esac
    shift
done

# Check for required dependencies (cf CLI and AWS CLI)
if ! type cf >/dev/null 2>&1 || ! type aws >/dev/null 2>&1; then
    echo "Error: Make sure both Cloud Foundry CLI and AWS CLI are installed."
    exit 12
fi

# Fetch the latest backup information, generate URLs, and clean up the service key
fetch_latest_backup_info_and_cleanup
