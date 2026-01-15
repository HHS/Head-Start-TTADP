# S3 Backup Retrieval Tool - latest_backup.sh

Retrieve database backups from a Cloud Foundry S3 service instance.

## Features

- Download and verify backups (.zip and .zenc) by default
- Generate presigned URLs (1-hour expiration)
- List backups with metadata (format, size, age, checksum presence)
- Delete backup files from S3
- Delete service keys older than 6 hours

## Prerequisites

**Required tools:**
- Cloud Foundry CLI ≥ 8.0.0
- AWS CLI
- jq (JSON parser)
- curl or wget
- uuidgen, unzip, openssl

**Authentication:**
```bash
cf login -a api.fr.cloud.gov --sso
cf target -s ttahub-prod
```

## Usage

```bash
./latest_backup.sh [OPTIONS]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-l, --list-backup-files` | List all backups | - |
| `-d, --download-and-verify` | Download and verify (optional; default behavior) | Default |
| `-g, --generate-urls` | Output presigned URLs | - |
| `-e, --erase-file <file>` | Delete file from S3 | - |
| `-f, --specific-file <file>` | Target specific file | Latest |
| `-k, --delete-keys` | Remove keys >6h old | - |
| `-a, --allow-deletion` | Allow service key cleanup | - |
| `-n, --service-name <name>` | CF S3 service instance | `ttahub-db-backups` |
| `-s, --s3-folder <path>` | S3 folder path | `production` |
| `-h, --help` | Show usage | - |

## Examples

**Download and verify the latest backup (default):**
```bash
./latest_backup.sh
```

**Download and verify a specific backup:**
```bash
./latest_backup.sh --specific-file backup-2024-01-15.zenc
```


**Get presigned download URLs for latest backup and delete service key:**
```bash
./latest_backup.sh --generate-urls -a
# Outputs 4 URLs: backup file, password, MD5, SHA-256
```

**List all available backups:**
```bash
./latest_backup.sh --list-backup-files
# Shows: name, format, checksums, size, age
```

**Delete old backup file:**
```bash
./latest_backup.sh --erase-file old-backup.zip
# Removes: .zip, .pwd, .md5, .sha256
```

**Cleanup old service keys (older than 1 day):**
```bash
./latest_backup.sh --delete-keys
```
