#!/bin/bash
#
# Summary:
# - Creates a CF service key for the S3-backed backup service, retrieves credentials,
#   and uses AWS CLI to locate the latest backup or a specified file.
# - Defaults to downloading and verifying the latest backup.
# - Can list backups, generate presigned URLs, optionally erase backups,
#   and optionally delete old service keys.
# - Cleans up the temporary service key when deletion is enabled.
#
# Dependencies:
# - Required: cf, aws, jq, uuidgen, unzip, openssl
# - Optional: curl or wget (HTTP fetch), sha256sum or shasum (SHA-256), md5sum or md5 (MD5), numfmt (size formatting)

# Constants
readonly SERVICE_KEY_MAX_AGE_SECONDS=86400  # 1 day
readonly PRESIGNED_URL_EXPIRATION_SECONDS=3600  # 1 hour

# Print usage info.
print_usage() {
    echo "Usage: $0 [-n | --service-name <CF_S3_SERVICE_NAME>] [-s | --s3-folder <s3_folder>] [-a | --allow-deletion] [-l | --list-backup-files] [-f | --specific-file <file_name>] [-d | --download-and-verify] [-g | --generate-urls] [-e | --erase-file <zip_file>] [-k | --delete-keys]"
    echo "Default behavior (no args): download and verify the latest backup."
}

# Return success if a command is available.
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Logging helpers.
log_info() {
    echo "[INFO] $*"
}

log_warn() {
    echo "[WARN] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# Return format and base name for a backup file.
backup_metadata() {
    local backup_file_name=$1
    local base_name="${backup_file_name%.*}"
    local ext="${backup_file_name##*.}"
    local format="zip"
    if [ "$ext" = "zenc" ]; then
        format="zenc"
    fi
    printf "%s %s\n" "$format" "$base_name"
}

# Load latest-backup.txt entries into latest_backup_files[].
load_latest_backup_file_list() {
    local bucket_name=$1
    local file_path=$2
    latest_backup_files=()
    while IFS= read -r line; do
        line=$(echo "$line" | tr -d '\r' | xargs)
        if [ -z "$line" ]; then
            continue
        fi
        line=${line#"$bucket_name/"}
        latest_backup_files+=("$line")
    done < "$file_path"
    if [ ${#latest_backup_files[@]} -eq 0 ]; then
        log_error "latest-backup.txt contains no file entries."
        exit 7
    fi
}

find_in_latest_backup_list() {
    local target=$1
    local file
    for file in "${latest_backup_files[@]}"; do
        if [ "$file" = "$target" ]; then
            echo "$file"
            return 0
        fi
    done
    return 1
}

# Function to check if the installed version of cf CLI is at least version 8
check_cf_version() {
    local current_version=$(cf --version | grep "cf version" | awk '{print $3}')
    local minimum_version="8.0.0"
    if version_ge "$current_version" "$minimum_version"; then
        log_info "Current cf version ($current_version) is >= $minimum_version."
    else
        log_error "Current cf version ($current_version) is < $minimum_version. Please update your cf CLI."
        exit 1  # Return 1 to indicate error
    fi
}

# Compare two semantic versions (version_ge current minimum).
version_ge() {
    local IFS=.
    local i
    local current=($1)
    local minimum=($2)

    for ((i = 0; i < 3; i++)); do
        local current_part=${current[i]:-0}
        local minimum_part=${minimum[i]:-0}
        if ((10#$current_part > 10#$minimum_part)); then
            return 0
        fi
        if ((10#$current_part < 10#$minimum_part)); then
            return 1
        fi
    done
    return 0
}

# Parse a date string to epoch seconds with GNU or BSD date.
parse_date_to_epoch() {
    local date_str=$1

    # Strip trailing/leading whitespace
    date_str=$(echo "$date_str" | xargs)

    # Try GNU date first (works on Linux)
    if date -d "$date_str" +%s >/dev/null 2>&1; then
        date -d "$date_str" +%s
        return 0
    fi

    # For BSD date (macOS), try common formats
    local formats=(
        "%Y-%m-%dT%H:%M:%S%z"           # ISO 8601 with timezone
        "%Y-%m-%dT%H:%M:%SZ"             # ISO 8601 UTC
        "%Y-%m-%dT%H:%M:%S.%fZ"          # ISO 8601 with milliseconds
        "%Y-%m-%d %H:%M:%S %z"           # Date time with timezone
        "%Y-%m-%d %H:%M:%S"              # Date time without timezone
        "%a %b %d %H:%M:%S %Z %Y"        # CF CLI common format
        "%Y/%m/%d %H:%M:%S"              # Alternative date format
    )

    local fmt
    for fmt in "${formats[@]}"; do
        if date -j -f "$fmt" "$date_str" +%s >/dev/null 2>&1; then
            date -j -f "$fmt" "$date_str" +%s
            return 0
        fi
    done

    # Try removing milliseconds if present (e.g., "2024-01-15T14:23:45.123Z" -> "2024-01-15T14:23:45Z")
    if [[ "$date_str" =~ \.[0-9]+Z$ ]]; then
        local cleaned_date=$(echo "$date_str" | sed 's/\.[0-9]*Z$/Z/')
        if date -j -f "%Y-%m-%dT%H:%M:%SZ" "$cleaned_date" +%s >/dev/null 2>&1; then
            date -j -f "%Y-%m-%dT%H:%M:%SZ" "$cleaned_date" +%s
            return 0
        fi
    fi

    return 1
}

# Fetch a URL with curl or wget.
fetch_url() {
    local url=$1
    if command_exists curl; then
        curl -s "$url"
    elif command_exists wget; then
        wget -q -O - "$url"
    else
        echo "Error: Neither curl nor wget is installed." >&2
        exit 1
    fi
}

# Hash helpers for GNU or BSD tools.
hash_sha256() {
    local file=$1
    if command_exists sha256sum; then
        sha256sum "$file" | awk '{print $1}'
    elif command_exists shasum; then
        shasum -a 256 "$file" | awk '{print $1}'
    else
        echo "Error: sha256sum/shasum not found." >&2
        exit 1
    fi
}

hash_md5() {
    local file=$1
    if command_exists md5sum; then
        md5sum "$file" | awk '{print $1}'
    elif command_exists md5; then
        md5 -q "$file"
    else
        echo "Error: md5sum/md5 not found." >&2
        exit 1
    fi
}

# Function to check if a service key exists
check_service_key_exists() {
    local cf_s3_service_name=$1
    local key_name=$2
    log_info "Checking if service key ${key_name} exists..."
    if cf service-keys "${cf_s3_service_name}" | awk 'NR>1 {print $1}' | grep -F -x -q -- "${key_name}"; then
        log_info "Service key ${key_name} exists."
        return 0
    else
        log_info "Service key ${key_name} does not exist."
        return 2
    fi
}

# Create a service key
create_service_key() {
    local cf_s3_service_name=$1
    local key_name=$2
    if check_service_key_exists "${cf_s3_service_name}" "${key_name}"; then
        log_info "Service key with name ${key_name} already exists."
    else
        log_info "Creating service key with name ${key_name}..."
        if ! cf create-service-key "${cf_s3_service_name}" "${key_name}"; then
            log_error "Failed to create service key"
            exit 3
        elif ! check_service_key_exists "${cf_s3_service_name}" "${key_name}"; then
            log_error "Failed to create service key, even though it returned success."
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
        log_error "No JSON data found."
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
            log_info "Deleting service key ${key_name}..."
            if ! cf delete-service-key "${cf_s3_service_name}" "${key_name}" -f; then
                log_error "Failed to delete service key ${key_name}."
                exit 2
            fi
        else
            log_info "No service key ${key_name} to delete."
        fi
    else
        log_info "To enable automatic key deletion, set -a or export DELETION_ALLOWED=yes"
    fi
}

# Function to delete service keys
delete_service_keys() {
    local cf_s3_service_name=$1
    local current_service_key=$2
    local current_time=$(date +%s)
    log_info "Deleting service keys older than ${SERVICE_KEY_MAX_AGE_SECONDS}s for ${cf_s3_service_name}..."

    local service_guid
    service_guid=$(cf service "${cf_s3_service_name}" --guid 2>/dev/null)
    if [ -z "${service_guid}" ]; then
        log_error "Failed to fetch service GUID for ${cf_s3_service_name}."
        exit 6
    fi

    local bindings_json
    bindings_json=$(cf curl "/v3/service_credential_bindings?service_instance_guids=${service_guid}&type=key" 2>/dev/null)
    if [ -z "${bindings_json}" ]; then
        log_error "Failed to list service keys for ${cf_s3_service_name}."
        exit 6
    fi

    echo "${bindings_json}" | jq -r '.resources[] | [.name, .created_at] | @tsv' | while IFS=$'\t' read -r key_name created_at; do
        if [ -z "${key_name}" ] || [ -z "${created_at}" ]; then
            continue
        fi
        if [ "${key_name}" = "${current_service_key}" ]; then
            continue
        fi
        if [[ ! "${key_name}" =~ ^${cf_s3_service_name}-key- ]]; then
            continue
        fi
        if ! key_created_epoch=$(parse_date_to_epoch "${created_at}"); then
            log_warn "Could not parse created_at for ${key_name}, skipping."
            continue
        fi
        key_age_seconds=$((current_time - key_created_epoch))
        if [ "${key_age_seconds}" -ge "${SERVICE_KEY_MAX_AGE_SECONDS}" ]; then
            log_info "Deleting service key ${key_name} (age $((key_age_seconds / 86400)) days)..."
            cf delete-service-key "${cf_s3_service_name}" "${key_name}" -f
        fi
    done
}

# Verify AWS Credentials by checking the identity associated with them
verify_aws_credentials() {
    local retries=5
    local delay=2
    local attempt=1
    log_info "Verifying AWS credentials..."
    while [ $attempt -le $retries ]; do
        if aws sts get-caller-identity > /dev/null; then
            log_info "AWS credentials are valid."
            return 0
        else
            log_warn "Failed to verify AWS credentials. Attempt $attempt of $retries."
            attempt=$((attempt + 1))
            sleep $delay
            delay=$((delay * 2))
        fi
    done
    log_error "Failed to verify AWS credentials after $retries attempts. Check your AWS Access Key ID and Secret Access Key."
    exit 10
}

# Function to find the latest-backup.txt file path in S3
find_latest_backup_file_path() {
    local bucket_name=$1
    local s3_folder=$2
    local latest_backup_file_path=$(
        aws s3 ls "s3://${bucket_name}/${s3_folder}" --recursive | \
        awk '$4 ~ /latest-backup\.txt$/ {print $1, $2, $4}' | \
        sort | \
        tail -n1 | \
        awk '{print $3}'
    )
    if [ -z "${latest_backup_file_path}" ]; then
        log_error "latest-backup.txt not found in S3 bucket."
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
        if [ -z "$file" ]; then
            log_error "Cannot generate presigned URL: empty S3 key."
            exit 1
        fi
        # Check if the file exists in the S3 bucket
        if aws s3 ls "s3://${bucket_name}/${file}" >/dev/null 2>&1; then
            local url=$(aws s3 presign "s3://${bucket_name}/${file}" --expires-in "$PRESIGNED_URL_EXPIRATION_SECONDS")
            urls+=("$url")
        else
            log_error "File s3://${bucket_name}/${file} does not exist."
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
        log_info "No backup files found in S3 bucket."
    else
        log_info "Backup files in S3 bucket:"
        printf "%-50s %-7s %-5s %-5s %-5s %-15s %-5s\n" "Name" "Format" "pwd" "md5" "sha256" "size" "age(days)"
        # Normalize S3 listing into grouped backup rows with metadata.
        local current_time
        current_time=$(date +%s)
        echo "${backup_files}" | \
        awk '
          {
            date=$1; time=$2; size=$3; key=$4;
            if (key ~ /\.(zip|zenc|pwd|md5|sha256)$/) {
              ext=key; sub(/^.*\./,"",ext);
              base=key;
              if (ext == "pwd" || ext == "md5" || ext == "sha256") {
                sub("\\." ext "$","",base);
              }
              if (ext == "zip" || ext == "zenc") {
                fmt[base]=ext; sz[base]=size; d[base]=date; t[base]=time;
              }
              if (ext == "pwd") { pwd[base]=1; }
              if (ext == "md5") { md5[base]=1; }
              if (ext == "sha256") { sha[base]=1; }
            }
          }
          END {
            for (b in fmt) {
              printf "%s %s %d %d %d %s %s %s\n", b, fmt[b], (pwd[b]?1:0), (md5[b]?1:0), (sha[b]?1:0), sz[b], d[b], t[b];
            }
          }
        ' | \
        sort -k1 | \
        while IFS= read -r line; do
          backup_path=$(echo "${line}" | awk '{print $1}')
          format=$(echo "${line}" | awk '{print $2}')
          has_pwd_flag=$(echo "${line}" | awk '{print $3}')
          has_md5_flag=$(echo "${line}" | awk '{print $4}')
          has_sha256_flag=$(echo "${line}" | awk '{print $5}')
          backup_size=$(echo "${line}" | awk '{print $6}')
          line_date=$(echo "${line}" | awk '{print $7}')
          line_time=$(echo "${line}" | awk '{print $8}')
          line_date_epoch=""

          backup_file=$(basename "${backup_path}")
          has_pwd=$([ "$has_pwd_flag" = "1" ] && echo "x" || echo "")
          has_md5=$([ "$has_md5_flag" = "1" ] && echo "x" || echo "")
          has_sha256=$([ "$has_sha256_flag" = "1" ] && echo "x" || echo "")

          if [[ "$backup_size" =~ ^[0-9]+$ ]]; then
            if command_exists numfmt; then
              backup_size=$(numfmt --to=iec-i --suffix=B "$backup_size")
            fi
          else
            backup_size="N/A"
          fi

          if [ -n "$line_date" ] && [ -n "$line_time" ]; then
            if line_date_epoch=$(parse_date_to_epoch "$line_date $line_time"); then
              backup_age=$(( (current_time - line_date_epoch) / 86400 ))
            else
              backup_age="N/A"
              # Debug: uncomment to see parsing failures
              # echo "Warning: Could not parse date '$line_date $line_time' for $backup_file" >&2
            fi
          else
            backup_age="N/A"
          fi

          printf "%-50s %-7s %-5s %-5s %-5s %-15s %-5s\n" "$backup_file" "$format" "$has_pwd" "$has_md5" "$has_sha256" "$backup_size" "$backup_age"
        done
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

    # Download password, SHA-256 checksum, and MD5 checksum directly into variables
    local password=$(fetch_url "$password_url")
    local checksum_sha256=$(fetch_url "$sha256_url")
    local checksum_md5=$(fetch_url "$md5_url")

    # Download file
    log_info "Downloading file..."
    if command_exists wget; then
        log_info "Using wget to download the file."
        wget -O "$backup_file_name" "$backup_url"
    elif command_exists curl; then
        log_info "Using curl to download the file."
        curl -s -o "$backup_file_name" "$backup_url"
    else
        log_error "Neither curl nor wget is installed."
        exit 1
    fi

    # Calculate hashes
    log_info "Calculating hashes..."
    local calculated_sha256
    local calculated_md5
    calculated_sha256=$(hash_sha256 "$backup_file_name")
    calculated_md5=$(hash_md5 "$backup_file_name")

    # Verify SHA-256 checksum
    log_info "Verifying SHA-256 checksum..."
    if [ "$calculated_sha256" != "$checksum_sha256" ]; then
        log_error "SHA-256 checksum verification failed."
        exit 1
    else
        log_info "SHA-256 checksum verified."
    fi

    # Verify MD5 checksum
    log_info "Verifying MD5 checksum..."
    if [ "$calculated_md5" != "$checksum_md5" ]; then
        log_error "MD5 checksum verification failed."
        exit 1
    else
        log_info "MD5 checksum verified."
    fi

    if [ "$format" = "zip" ]; then
        # Unzip the file
        log_info "Unzipping the file..."
        if unzip -P "$password" "$backup_file_name"; then
            log_info "File unzipped successfully."
            # Rename the extracted file - use -Z1 for clean filename listing
            extracted_file=$(unzip -Z1 "$backup_file_name" | head -n1)
            if [ -z "$extracted_file" ]; then
                log_error "Could not determine extracted filename."
                exit 1
            fi
            new_name="${backup_file_name%.zip}"
            if mv "$extracted_file" "$new_name"; then
                log_info "File renamed to $new_name."
            else
                log_error "Failed to rename the file."
                exit 1
            fi
        else
            log_error "Failed to unzip the file."
            exit 1
        fi
    elif [ "$format" = "zenc" ]; then
        # Decrypt and decompress the already downloaded file
        log_info "Decrypting and decompressing the file..."
        if openssl enc -d -aes-256-cbc -salt -pbkdf2 -k "${password}" -in "$backup_file_name" | gzip -d -c > "${backup_file_name%.zenc}"; then
            log_info "File decrypted and decompressed successfully: ${backup_file_name%.zenc}"
        else
            log_error "Failed to decrypt and decompress the file."
            exit 1
        fi
    else
        log_error "Unknown backup format: $format"
        exit 1
    fi
}


# Function to erase a set of files from S3
erase_files() {
    local bucket_name=$1
    local s3_folder=$2
    local backup_file=$3

    local base_name="${backup_file%.*}"
    local pwd_file="${base_name}.pwd"
    local md5_file="${base_name}.md5"
    local sha256_file="${base_name}.sha256"

    local files_to_delete=("$backup_file" "$pwd_file" "$md5_file" "$sha256_file")

    log_info "Deleting files from S3:"
    for file in "${files_to_delete[@]}"; do
        local file_path="${s3_folder}/${file}"
        if aws s3 ls "s3://${bucket_name}/${file_path}" > /dev/null 2>&1; then
            log_info "Deleting ${file_path}..."
            if aws s3 rm "s3://${bucket_name}/${file_path}"; then
                log_info "${file_path} deleted successfully."
            else
                log_error "Failed to delete ${file_path}."
                exit 9
            fi
        else
            log_info "${file_path} does not exist, skipping deletion."
        fi
    done
}

# Function to retrieve and use S3 service credentials
main() {
    local cf_s3_service_name="${cf_s3_service_name:-ttahub-db-backups}"  # Default to 'db-backups' if not provided
    local s3_folder="${s3_folder:-production}"  # Default to root of the bucket if not provided
    local deletion_allowed="${deletion_allowed:-no}"  # Default to no deletion if not provided
    local list_backup_files="${list_backup_files:-no}"  # Default to no listing of ZIP files if not provided
    local specific_file="${specific_file:-}"
    local download_and_verify="${download_and_verify:-yes}"
    local generate_urls="${generate_urls:-no}"
    local erase_file="${erase_file:-}"
    local delete_keys="${delete_keys:-no}"

    # Generate a daily service key name to enable reuse within a day.
    local username=$(cf target | grep user | awk '{print $2}')
    local key_name="${cf_s3_service_name}-key-${username}-$(date +%Y%m%d)"
    log_info "Using service key name: $key_name for service instance: $cf_s3_service_name"

    # Attempt to retrieve or create the service key
    cf target -s ttahub-prod
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

    if [ "${delete_keys}" = "yes" ]; then
        delete_service_keys "$cf_s3_service_name" "$key_name"
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
                log_error "Specified file does not exist in S3 bucket."
                exit 8
            fi
        else
            local latest_backup_file_path=$(find_latest_backup_file_path "$bucket_name" "$s3_folder")

            # Download and read the latest-backup.txt file using the full path
            aws s3 cp "s3://${bucket_name}/${latest_backup_file_path}" /tmp/latest-backup.txt

            # Load latest-backup.txt entries and find the backup file.
            load_latest_backup_file_list "$bucket_name" /tmp/latest-backup.txt
            local backup_file_name=""
            local candidate
            for candidate in "${latest_backup_files[@]}"; do
                if [[ "$candidate" == *.zip || "$candidate" == *.zenc ]]; then
                    backup_file_name="$candidate"
                    break
                fi
            done
        fi
        if [ -z "$backup_file_name" ]; then
            log_error "Latest backup file name is empty. Check latest-backup.txt contents."
            exit 7
        fi

        local format
        local base_name
        local password_file_name
        local md5_file_name
        local sha256_file_name
        read -r format base_name <<< "$(backup_metadata "$backup_file_name")"
        password_file_name="${base_name}.pwd"
        md5_file_name="${base_name}.md5"
        sha256_file_name="${base_name}.sha256"
        if [ ${#latest_backup_files[@]} -gt 0 ]; then
            if candidate=$(find_in_latest_backup_list "${base_name}.pwd"); then
                password_file_name="$candidate"
            fi
            if candidate=$(find_in_latest_backup_list "${base_name}.md5"); then
                md5_file_name="$candidate"
            fi
            if candidate=$(find_in_latest_backup_list "${base_name}.sha256"); then
                sha256_file_name="$candidate"
            fi
        fi
        if [ -z "$password_file_name" ] || [ -z "$md5_file_name" ] || [ -z "$sha256_file_name" ]; then
            log_error "Companion file names resolved to empty values."
            exit 11
        fi

        # Validate that all required companion files exist before proceeding
        log_info "Validating companion files exist in S3..."
        local missing_files=()
        for file in "$password_file_name" "$md5_file_name" "$sha256_file_name"; do
            if ! verify_file_exists "$bucket_name" "$file"; then
                missing_files+=("$file")
            fi
        done

        if [ ${#missing_files[@]} -gt 0 ]; then
            log_error "Missing required companion files in S3:"
            for missing in "${missing_files[@]}"; do
                log_error "  - $missing"
            done
            exit 11
        fi
        log_info "All companion files found."
        if [ "${generate_urls}" = "yes" ]; then
            log_info "Presign keys:\n $backup_file_name\n $password_file_name\n $md5_file_name\n $sha256_file_name"
        elif [ "${download_and_verify}" = "yes" ]; then
            log_info "Download keys:\n $backup_file_name\n $password_file_name\n $md5_file_name\n $sha256_file_name"
        fi

        # Generate presigned URLs for these files
        local urls
        IFS=' ' read -r -a urls <<< "$(generate_presigned_urls "$bucket_name" "$backup_file_name" "$password_file_name" "$md5_file_name" "$sha256_file_name")"

        if [ "${generate_urls}" = "yes" ]; then
            # Print presigned URLs
            echo "Presigned URLs for the files:"
            for url in "${urls[@]}"; do
                echo "$url"
                echo ""
            done
        elif [ "${download_and_verify}" = "yes" ]; then
            # Perform download and verify functionality
            download_and_verify "${urls[0]}" "$(basename "$backup_file_name")" "${urls[1]}" "${urls[2]}" "${urls[3]}" "$format"
        else
            log_error "No action selected. Use --generate-urls or --download-and-verify."
            exit 13
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
        -d|--download-and-verify) download_and_verify="yes"; generate_urls="no"; deletion_allowed="yes" ;;
        -g|--generate-urls) generate_urls="yes"; download_and_verify="no" ;;
        -e|--erase-file) erase_file="$2"; shift ;;
        -k|--delete-keys|--delete-old-keys) delete_keys="yes" ;;
        -h|--help) print_usage; exit 0 ;;
        *) echo "Unknown parameter passed: $1"; exit 12 ;;
    esac
    shift
done

# Check for required dependencies.
required_commands=(cf aws jq uuidgen unzip openssl)
missing_commands=()
for cmd in "${required_commands[@]}"; do
    if ! command_exists "$cmd"; then
        missing_commands+=("$cmd")
    fi
done
if (( ${#missing_commands[@]} > 0 )); then
    log_error "Missing required commands: ${missing_commands[*]}"
    exit 12
fi

# Fetch the latest backup information, generate URLs, and clean up the service key
main
