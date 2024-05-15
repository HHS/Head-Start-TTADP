# S3 Backup Retrieval Tool

This script, named `latest_backup.sh`, is designed to interact with Cloud Foundry's S3 service instances to perform various operations such as creating service keys, retrieving and verifying AWS credentials, and generating presigned URLs for files stored in an S3 bucket. Additionally, the script handles the deletion of service keys post-operation based on user preference.

## Features

- **CF CLI Version Check**: Ensures that the installed Cloud Foundry CLI is version 8.0.0 or higher.
- **Service Key Management**: Creates and deletes service keys for interacting with AWS S3.
- **AWS Credential Verification**: Verifies that AWS credentials are valid.
- **Backup File Retrieval**: Retrieves the path for the latest backup file from an S3 bucket and downloads it.
- **Presigned URL Generation**: Generates AWS S3 presigned URLs for the specified files, allowing secure, temporary access without requiring AWS credentials.
- **Clean-up Options**: Optionally deletes the service key used during the operations to maintain security.

## Prerequisites

- Cloud Foundry CLI (cf CLI) version 8.0.0 or higher.
- AWS CLI installed and configured on the machine where the script will be run.
- JQ for parsing JSON output. It must be installed on the machine running the script.
- You must be logged into the Cloud Foundary production environment using the following command before running the script: cf login -a api.fr.cloud.gov --sso

## Usage

To use this script, you may need to provide up to three arguments:

1. **CF_S3_SERVICE_NAME**: The name of the Cloud Foundary S3 service instance (optional).
2. **s3_folder**: The specific folder within the S3 bucket where `latest-backup.txt` is located (optional).
3. **DELETION_ALLOWED**: Whether to allow deletion of the service key post-operation. Set this to 'yes' to enable deletion (optional).

### Basic Command

```bash
./latest_backup.sh [CF_S3_SERVICE_NAME] [s3_folder] [DELETION_ALLOWED]
```
