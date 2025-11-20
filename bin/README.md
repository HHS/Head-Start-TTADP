# S3 Backup Retrieval Tool

This script, named `latest_backup.sh`, is designed to interact with Cloud Foundry's S3 service instances to perform various operations such as creating service keys, retrieving and verifying AWS credentials, generating presigned URLs for files stored in an S3 bucket, and handling the deletion of service keys post-operation based on user preference. Additionally, it can list all ZIP and ZENC files in the S3 folder, download and verify specific backup files, and erase files from S3.

## Features

- **CF CLI Version Check**: Ensures that the installed Cloud Foundry CLI is version 8.0.0 or higher.
- **Service Key Management**: Creates and deletes service keys for interacting with AWS S3.
- **AWS Credential Verification**: Verifies that AWS credentials are valid.
- **Backup File Retrieval**: Retrieves the path for the latest backup file from an S3 bucket and downloads it.
- **Presigned URL Generation**: Generates AWS S3 presigned URLs for the specified files, allowing secure, temporary access without requiring AWS credentials.
- **File Listing**: Lists all ZIP and ZENC files in the specified S3 folder, along with their corresponding pwd, md5, sha256 files, sizes, and ages.
- **Download and Verification**: Downloads a specific backup file and verifies its integrity using MD5 and SHA-256 checksums.
- **File Erasure**: Deletes a specified set of files (ZIP, ZENC, pwd, md5, sha256) from S3.
- **Old Service Key Deletion**: Deletes service keys older than 6 hours.
- **Clean-up Options**: Optionally deletes the service key used during the operations to maintain security.

## Prerequisites

- Cloud Foundry CLI (cf CLI) version 8.0.0 or higher.
- AWS CLI installed and configured on the machine where the script will be run.
- JQ for parsing JSON output. It must be installed on the machine running the script.
- You must be logged into the Cloud Foundry production environment using the following command before running the script:

```bash
cf login -a api.fr.cloud.gov --sso
```

## Usage

To use this script, you may need to provide various arguments based on the required operation:

1. **CF_S3_SERVICE_NAME**: The name of the Cloud Foundry S3 service instance (optional, default: `ttahub-db-backups`).
2. **s3_folder**: The specific folder within the S3 bucket where `latest-backup.txt` is located (optional, default: `production`).
3. **DELETION_ALLOWED**: Whether to allow deletion of the service key post-operation. Set this to 'yes' to enable deletion (optional, default: `no`).
4. **list_backup_files**: Whether to list all ZIP and ZENC files in the S3 folder. Set this to 'yes' to enable listing (optional, default: `no`).
5. **specific_file**: The specific backup file to process (optional).
6. **download_and_verify**: Whether to download and verify the specific backup file. Set this to 'yes' to enable download and verification (optional, default: `no`).
7. **erase_file**: The specific file to erase from S3 (optional).
8. **delete_old_keys**: Whether to delete old service keys. Set this to 'yes' to enable deletion (optional, default: `no`).

### Basic Command

```bash
./latest_backup.sh [--service-name <CF_S3_SERVICE_NAME>] [--s3-folder <s3_folder>] [--allow-deletion] [--list-backup-files] [--specific-file <file_name>] [--download-and-verify] [--erase-file <zip_file>] [--delete-old-keys]
```

### Example Commands

- Generate presigned URLs for the latest backup:

```bash
./latest_backup.sh
```

- List all ZIP and ZENC files in the specified S3 folder:

```bash
./latest_backup.sh --list-backup-files
```

- Download and verify a specific backup file:

```bash
./latest_backup.sh --specific-file my-backup.zip --download-and-verify
```

- Erase a specific file and its associated files from S3:

```bash
./latest_backup.sh --erase-file my-backup.zip
```

- Delete old service keys older than 6 hours:

```bash
./latest_backup.sh --delete-old-keys
```
