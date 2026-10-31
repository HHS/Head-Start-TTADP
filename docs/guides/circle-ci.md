# CircleCI Configuration Documentation

This document provides an overview of the CircleCI configuration for the project, focusing on workflows, manual triggers, and scheduled jobs. The configuration automates building, testing, deploying, and managing environments for the application across different stages (development, staging, production).

---

## Table of Contents

- [Introduction](#introduction)
- [Executors](#executors)
- [Commands](#commands)
- [Jobs](#jobs)
- [Workflows](#workflows)
  - [Build, Test, and Deploy Workflow](#build-test-and-deploy-workflow)
  - [Daily Scheduled Workflows](#daily-scheduled-workflows)
  - [Manually Triggered Workflows](#manually-triggered-workflows)
- [Environment Variables and Secrets](#environment-variables-and-secrets)
- [Secret-Printing Check](#secret-printing-check)
- [Conclusion](#conclusion)

---

## Introduction

This CircleCI configuration is designed to automate various tasks such as building, testing, deploying, and managing the application's environments. Key workflows include manual and scheduled tasks, automated testing pipelines, and deployment workflows for development, staging, and production environments.

---

## Executors

CircleCI executors define the environment in which each job runs.
- **Docker Executor**: Used for most tasks, leveraging a Node.js image with browser support for building and testing.
- **Docker Postgres Executor**: Combines Node.js with a PostgreSQL instance for database-related testing.
- **Machine Executor**: Provides a full virtual machine for tasks requiring more control, like dynamic security scans.
- **AWS Executor**: Configured for workflows requiring AWS tools or resources.

---

## Commands

Commands in this configuration abstract common steps for reuse across multiple jobs:
1. **Sparse Checkout**: Enables cloning only the necessary parts of the repository for specific workflows, reducing resource usage.
2. **Create Combined Yarn Lock**: Merges multiple `yarn.lock` files into one to use as a cache key.
3. **Notify New Relic**: Sends deployment notifications to New Relic for tracking environment changes.
4. **Notify Slack**: Posts messages to a specified Slack channel with customizable content.
5. **Cloud Foundry Deploy**: Handles logging in and deploying applications to Cloud Foundry environments.
6. **Cloud Foundry Automation Task**: Runs specific tasks in Cloud Foundry environments, such as database migrations or processing data.

---

## Jobs

The configuration includes jobs tailored to specific purposes:
- **Build and Lint**: Runs lint checks for backend and frontend code and builds assets.
- **Test Backend**: Runs backend tests, including database migration and seeding.
- **Test Frontend**: Executes frontend tests using Jest, with coverage checks for modified lines.
- **Test End-to-End**: Uses Playwright for E2E testing, ensuring workflows function correctly.
- **Dynamic Security Scan**: Runs OWASP ZAP scans to identify vulnerabilities in the application.
- **Secret Printing Check**: Fails the build on shell commands that print the environment or secret values (see [Secret-Printing Check](#secret-printing-check)).
- **Deploy**: Pushes applications to appropriate Cloud Foundry environments based on branch.
- **Backup Upload Production**: Creates a backup of the production database and uploads it to a secure location.
- **Restore and Process Data**: Restores a backup to a processing environment and runs scripts to anonymize or prepare the data.

---

## Workflows

Workflows orchestrate the execution of jobs, grouping them by purpose and defining triggers:

### Build, Test, and Deploy Workflow

This workflow automates the building, testing, and deployment process for the application. It triggers on pushes to specific branches unless manual flags are set. It consists of:
1. **Build and Lint**
2. **Backend, Frontend, and E2E Tests**, and the **Secret Printing Check**, which runs in parallel with the build and is required for the `tests_done` gate
3. **Dynamic Security Scan**
4. **Deploy**: Deploys to lower environments based on the branch. Production branch merges still use the existing production deploy job; production release tag and evidence handling are documented in the [Infrastructure guide](./infrastructure.md#production-release-provenance).

---

### Daily Scheduled Workflows

These workflows are triggered at regular intervals using cron schedules:
1. **Daily Security Scan**:
   - Runs a comprehensive set of tests and OWASP ZAP scans to detect vulnerabilities.
   - Scheduled at 12:00 UTC, Monday to Friday.

2. **Daily Backup Upload Production**:
   - Creates a backup of the production database, processes it, and restores it to staging and dev environments for testing.
   - Scheduled at 10:00 UTC, Monday to Friday.

---

### Manually Triggered Workflows

The configuration supports several workflows that can be manually triggered using flag variables:
1. **Manual Backup Upload Production** (`manual-trigger`):
   - Backs up the production database and uploads it to a secure location.

2. **Manual Restore Production** (`manual-restore`):
   - Restores the production database to a processing environment.

3. **Manual Process Production** (`manual-process`):
   - Processes data in the production environment, typically for anonymization or cleanup.

4. **Manual Process Backup** (`manual-backup`):
   - Processes and uploads a backup for distribution to other environments.

5. **Manual Restore to Staging or Dev** (`manual-restore-staging`, `manual-restore-dev`):
   - Restores processed backups to the respective environments for further testing or analysis.

---

## Environment Variables and Secrets

Environment variables store sensitive information such as API keys, database credentials, and Cloud Foundry login details. These are securely managed in CircleCI’s settings and passed into jobs as needed.

Key variables include:
- **Authentication Credentials**: For Cloud Foundry and other external services.
- **Database Connection Details**: For running migrations, tests, and backups.
- **Slack and New Relic Keys**: For notifications and deployment tracking.

---

## Secret-Printing Check

CircleCI job logs for this project are **publicly readable**, so any command that prints the environment or a secret value
publishes it. (A database credential was exposed this way in TTAHUB-5932, by an `env` dump in an automation script.)
The `secret_printing_check` job runs `node ./tools/checkSecretPrinting.js` on every branch build and fails when it finds
one of the commands below. It runs **before** `build_and_lint` (which requires it) in the build/test/deploy, manual
deploy and nightly reset workflows, so a build script that prints credentials can't run first and publish them. Run it locally with `yarn lint:secret-printing`. The pre-commit hook (`.githooks/pre-commit`)
runs it as `node ./tools/checkSecretPrinting.js --staged`, which reads the git index (including the staged exceptions file)
instead of the working tree.

**What it scans:** shell scripts under `automation/` and `bin/` (files ending in `.sh`/`.bash`, or with a shell shebang),
and `.circleci/config.yml`. It is a static check that does not run anything. It reads each command as a shell
reader would: backslash-continued lines are joined into one command, and control prefixes (`if ... then`, `do`, `{`, `!`,
function and `case` headers, leading `VAR=value`) are looked through. In the CircleCI config it scans only the values of
`run:` and `command:` keys, both inline (`- run: env`, `command: "set -x"`) and block scalars (`command: |` and the lines
under it; a folded `>` block is joined the way YAML folds it, so `echo` on one line and `"$VAR"` on the next are
read as one command). Names, descriptions and parameter values are not commands and are not scanned. Flow-style mappings
such as `run: { command: env }` are not handled.

| Rule           | Flags                                                                                                                                 | Why it is unsafe                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `env-dump`     | `env`, `printenv`, `export -p`, `/proc/*/environ` used to write the environment out                                                   | Prints every variable, including credentials                |
| `cf-env`       | any `cf env` that is not itself captured into a variable, such as `VAR=$(cf env APP \| ...)`; each `cf env` is judged on its own      | Prints the whole app environment, including `VCAP_SERVICES` |
| `shell-trace`  | `set -x`, `set -ex`, `set -o xtrace`, `bash -x`, or a `-x` shebang                                                                    | Prints every command with its variables expanded            |
| `print-secret` | `echo`/`printf` of `DATABASE_URL`, `POSTGRES_URL`, `VCAP_*`, or a variable whose name contains `PASSWORD`, `SECRET`, `TOKEN` or `KEY` | Writes the value into the log                               |

It does **not** flag ordinary uses: `#!/usr/bin/env bash`, `env FOO=bar cmd`, passing a secret to a command
(`cf login -p "$PASSWORD"`), printing a secret's length (`${#TOKEN}`) or whether it is set (`${TOKEN:+set}`), text that only
mentions a name, or variables ending in `_NAME`, `_PATH`, `_FILE`, `_DIR`, `_ID`, `_COUNT` or `_LENGTH` (for example
`service_key_name`).

**Commented lines are not scanned.** A comment such as `# set -x` or `# echo "$PASSWORD"` cannot run, so it passes. If a
commented example would be dangerous when someone uncomments it, say so in the comment and don't leave the live-looking
command behind (see the note in `automation/db-backup/scripts/db_restore.sh`).

### Requesting an exception

If a command is flagged but cannot print a secret, add an entry to
[`tools/secretPrintingExceptions.json`](../../tools/secretPrintingExceptions.json):

```json
{
  "file": "bin/example-script",
  "rule": "shell-trace",
  "text": "set -euxo pipefail",
  "justification": "Only runs docker compose commands with fixed arguments; no credential variables are referenced.",
  "ticket": "TTAHUB-0000"
}
```

- `text` is the exact command, trimmed (for a command continued with a backslash, the lines joined by single spaces).
  An exception covers matching commands in that file for that rule only, so editing the command, or adding the same
  one elsewhere, is flagged again.
- Every field is required, and the justification must say why no secret can reach the output. A reviewer must approve
  the exception in the PR, and should check that no credential-named variable can reach the command.
- An exception that no longer matches any line fails the check, so remove entries when you remove the code they cover.
- The check never prints the flagged line, because it could contain a secret. Failures show only the file, line number,
  rule and fix.

Before adding an exception, prefer a fix: print only non-secret fields, a length, or a `${VAR:+set}` check.

### Code review: do not dump the environment or secrets

When reviewing a script or CI change, reject anything that dumps the environment or logs a secret value, even for
debugging: `env`, `printenv`, `set -x`, `cf env`, `echo "$SOME_TOKEN"`, or error messages that echo a value from a
secrets-bearing file.

---

## Conclusion

This CircleCI configuration is designed to automate critical aspects of the application's lifecycle, ensuring consistent builds, thorough testing, and seamless deployments across environments. Manual triggers and scheduled jobs allow flexibility while maintaining reliability. For questions, consult the DevOps team or project documentation.
