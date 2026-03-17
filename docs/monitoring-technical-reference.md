# Import System Documentation

> **Audience**: Developers working on the monitoring import pipeline.

## Purpose

The import system automatically collects ZIP files from an external SFTP source (e.g., IT-AMS), processes contained XML files, maps them to internal database models, stores them, and optionally runs post-processing (like creating Monitoring Goals).

---

## High-Level Flow

1. **Scheduled Execution** via cron or manual trigger.

2. **Download Phase**

   - Connects to SFTP using stored credentials
   - Lists & filters available files
   - Downloads a file and uploads it to S3
   - Tracks attempts, retries on failure

3. **Processing Phase**

   - Downloads the ZIP file from S3
   - Extracts required XML files based on definitions
   - Parses, maps, and stores data into corresponding DB tables
   - Soft-deletes missing records

4. **Post-Processing Phase** (optional)

   - Executes tasks for creating and reopening Monitoring Goals

---

## Code Modules

### `index.ts`

Exports orchestrator functions:

- `download(importId, timeBox)`
- `process(importId)`
- `moreToDownload(importId)`
- `moreToProcess(importId)`
- `getImportSchedules()`

### `download.ts`

- Collects available files from SFTP
- Uploads to S3 (with hash)
- Tracks collection attempts
- Skips if time-boxed

### `processZipFileFromS3.ts`

- Pulls file from S3
- Uses `ZipStream` to extract contents
- Records available XMLs
- Calls `processFilesFromZip.ts`

### `processFilesFromZip.ts`

- Iterates through process definitions
- Uses `zipClient` to pull stream
- Passes to `processFile.ts`

### `processFile.ts`

- Pipes file stream through Hasher + Encoding Converter
- Initializes XML parser
- Calls `processRecords.ts`

### `processRecords.ts`

- Remaps raw XML
- Filters for DB model columns
- Based on keys:
  - Insert new
  - Update existing
  - Mark missing as soft-deleted

### `record.ts`

Handles:

- File status & metadata tracking
- Insertion & update of ImportFile / ImportDataFile
- Determines prior file for delta logic

### `postProcess.ts`

Runs post-processing functions defined in `Import.postProcessingActions`. Example:

- `createMonitoringGoals`
  - creates monitoring goals for grants with active findings, regardless if the grant is active.
  - marks eligible AR/RTR monitoring goals as follow-up TTA eligible (`createdVia = 'monitoring'`)
- `updateMonitoringFactTables` (via CLI after import pipeline)
  - updates the [Monitoring Fact Tables](./monitoring-fact-tables.md) (`DeliveredReviews`, `Citations`, and their junction tables)
  - runs after `maintainMonitoringData` in the CI pipeline

## Monitoring Goal Logic

The `createMonitoringGoals` post-processing function is run after the import completes successfully.

Monitoring goal creation runs only when `ENABLE_MONITORING_GOAL_CREATION=true`.

It currently handles two operations based on monitoring review and finding data:

### When Monitoring Goals Are Created
--------------------------------

A new goal is created if:

* Monitoring goal creation is enabled (`ENABLE_MONITORING_GOAL_CREATION=true`)
* A monitoring review was delivered between 2025-01-21 and now
* It is of a type like 'AIAN-DEF', 'RAN', 'FA-1', 'Follow-up', 'FA1-FR',
          'FA1-PSR', 'FA-2', 'FA2-CR', 'FA2-CSR', 'Special'
* There is at least one open finding linked to the grant
  * A finding is considered open if it is currently 'Active' or 'Elevated Deficiency', or if its most recent linked review is not yet delivered.
  * A finding is excluded when a Monitoring Goal was closed after that finding's latest delivered review date.
* The grant is not CDI
* The grant does not already have a non-closed Monitoring goal

In short:

"If a non-CDI grant has open findings tied to a recent delivered monitoring review and no non-closed Monitoring goal => create one."

#### Goal Create flow diagram

[`monitoring-goal-create-flow.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/flow-diagrams/monitoring-goal-create-flow.puml)

### Follow-up TTA Eligibility Marking
---------------------------------

Existing Monitoring goals created via `rtr` or `activityReport` are re-marked as `createdVia='monitoring'` when they are on replacement grants that correspond to grants with recently created curated Monitoring goals.

In short:

"If a replacement grant has RTR/AR-created Monitoring goals and its replaced grant has recent curated Monitoring goals => mark those replacement-grant goals as monitoring-created."

---

## Sample Process Definition JSON

```json
{
  "keys": ["reviewId"],
  "path": ".",
  "encoding": "utf16le",
  "fileName": "Review.xml",
  "remapDef": {
        ".": "toHash.*",
        "Name": "name",
        "EndDate": "endDate",
        "Outcome": "outcome",
        "ReviewId": "reviewId",
        "StatusId": "statusId",
        "ContentId": "contentId",
        "StartDate": "startDate",
        "ReviewType": "reviewType",
        "ReportAttachmentId": "reportAttachmentId",
        "ReportDeliveryDate": "reportDeliveryDate"
      },
    "tableName": "MonitoringReviews"
}
```
---

## Import Flow Diagram

[`monitoring-import-flow.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/flow-diagrams/monitoring-import-flow.puml)

---

## Entity Relationship Diagrams

### Monitoring Feature ERD

Included in [`monitoring-erd.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/monitoring-erd.puml)

### Import System ERD

Included in [`import-erd.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/import-erd.puml)

---

## Developer Tips

- Add new file types via new **process definitions**
- Remap incoming XML fields with `remapDef`
- For new post-processing, add to `postProcess.ts`

---

## Running Manual Import

Manual imports are helpful for debugging, re-processing specific data, or performing ad hoc runs outside of the cron schedule.

Add new file types via new process definitions
Remap incoming XML fields with remapDef

#### Prerequisites
- ssh into production
- /tmp/lifecycle/shell

---
### Triggering Imports Manually
You can manually trigger each import phase with the following CLI command:
```
yarn cli:import-system -- <action> <importId> [timeBox]
```
### Actions
| Action | Description |
| --- | --- |
| download | Connects to SFTP and streams files to S3 |
| process | Pulls ZIP from S3 and processes XML files |
| queueDownload | Queues a background job to run download |
| queueProcess | Queues a background job to run process |

### Example
```
yarn cli:import-system -- download 7
yarn cli:import-system -- process 7
```
Note: You must be logged into the production environment for this to work on real data.

---

### Manual Import Flow Diagram

[`manual-monitoring-import-flow.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/flow-diagrams/manual-monitoring-import-flow.puml)

### Triggering Imports via Queued Background Jobs
While the import system is usually triggered directly, it also supports background job queuing using Bull.
```
yarn cli:import-system -- queueDownload <importId>
yarn cli:import-system -- queueProcess <importId>
```
These enqueue jobs to be picked up by a queue worker running the appropriate logic asynchronously.

### Queued Import Flow Diagram

[`queued-monitoring-import-flow.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/flow-diagrams/queued-monitoring-import-flow.puml)
