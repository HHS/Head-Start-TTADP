# Import System Documentation

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
  - creates monitoring goals
  - reopens monitoring goals

## Monitoring Goal Logic

The `createMonitoringGoals` post-processing function is run after the import completes successfully. It handles three operations based on monitoring review and finding data:

### When Monitoring Goals Are Created
--------------------------------

A new goal is created if:

* A monitoring review was delivered after 2025-01-21
* The review is Complete
* It is of a type like 'AIAN-DEF', 'RAN', 'FA-1', 'Follow-up', 'FA1-FR',
          'FA-2', 'FA2-CR', 'Special'
* There is at least one valid 'Active' Finding linked to the grant
  * Findings are considered the be active if they have an 'Active' or 'Elevated Deficiency' status OR if their most recent follow-up review is not yet delivered.
  * Because 'Area of Concern' (AOC) Findings mostly remain in an 'Active' status indefinitely, they will not be considered active if a Monitoring Goal has been closed since the Finding's most recent review's reportDeliveryDate.
* The grant has no existing goal linked to the Monitoring goal template

In short:

"If a grant had a recent, complete monitoring review with active findings and doesn’t already have a goal => create one."

#### Goal Create flow diagram

[`monitoring-goal-create-flow.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/flow-diagrams/monitoring-goal-create-flow.puml)

### When Monitoring Goals Are Reopened
---------------------------------

An existing goal is reopened (set to "Not Started") if:

* A monitoring goal exists and was previously marked "Closed" or "Suspended"
* The related review is still Complete, delivered after 2025-01-21
* There are still active findings connected to that review

In short:

"If a previously closed/suspended monitoring goal is still valid due to active findings => reopen it."

#### Goal Reopening flow diagram

[`monitoring-goal-reopen-flow.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/flow-diagrams/monitoring-goal-reopen-flow.puml)

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
yarn import:system <action> <importId> [timeBox]
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
yarn import:system download 7 yarn import:system process 7
```
Note: You must be logged into the production environment for this to work on real data.

---

### Manual Import Flow Diagram

[`manual-monitoring-import-flow.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/flow-diagrams/manual-monitoring-import-flow.puml)

### Triggering Imports via Queued Background Jobs
While the import system is usually triggered directly, it also supports background job queuing using Bull.
```
yarn import:system queueDownload <importId>
yarn import:system queueProcess <importId>
```
These enqueue jobs to be picked up by a queue worker running the appropriate logic asynchronously.

### Queued Import Flow Diagram

[`queued-monitoring-import-flow.puml`](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/flow-diagrams/queued-monitoring-import-flow.puml)
