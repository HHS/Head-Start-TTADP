# Monitoring Fact Tables

> **Audience**: Developers consuming monitoring data in TTA Hub.

## Purpose

The monitoring fact tables are pre-calculated, denormalized tables calculated from the raw Monitoring data imported from IT-AMS. They centralize business logic (status calculation, finding type resolution, active/closed determination) so that logic implementations aren't scattered and replicated across the rest of the TTA Hub.

## Conventions

- **Column naming**: snake_case (e.g., `report_delivery_date`), distinguishing calculated fact tables from raw Monitoring tables.
- **Timezone**: All date casts use UTC via `SET TIME ZONE 'UTC'` at the start of the update script, matching HSES's interpretation of IT-AMS data.
- **Soft deletes**: `DeliveredReviews` and `Citations` use paranoid soft deletes (`deletedAt`).
- **Junction tables**: All junction tables use hard deletes for stale records. `GrantDeliveredReviews` and `GrantCitations` carry grant-derived recipient/region data. `DeliveredReviewCitations` carries only the FK pair.
- **Update frequency**: Runs daily after the monitoring data import and maintenance pipeline, via `updateMonitoringFactTablesCLI.ts`.
- **Upsert strategy**: Entity tables, `GrantDeliveredReviews`, and `GrantCitations` use `ON CONFLICT ... DO UPDATE` with `IS DISTINCT FROM` guards to avoid unnecessary updates and thus Audit Log table entries. `DeliveredReviewCitations` uses `ON CONFLICT ... DO NOTHING`.

## Pipeline Order

```
importSystemCLI (download + process)
  -> createMonitoringGoalsCLI
  -> queryMonitoringDataCLI
  -> maintainMonitoringDataCLI
  -> updateMonitoringFactTablesCLI   <-- fact tables updated here
```

## Tables

### DeliveredReviews

One row per monitoring review (with findings) that has actually been delivered to recipients. Thus only reviews with a non-null `reportDeliveryDate` are included.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `mrid` | INTEGER | Convenience link to `MonitoringReviews.id` |
| `review_uuid` | TEXT | `MonitoringReviews.reviewId` — the IT-AMS review UUID |
| `review_type` | TEXT | Review type (e.g., FA-1, FA-2, RAN, Follow-up) |
| `review_status` | TEXT | Status name from `MonitoringReviewStatuses` (e.g., Complete) |
| `report_delivery_date` | DATE | When the review was delivered to the recipient |
| `report_start_date` | DATE | When the review started (currently unused) |
| `complete_date` | DATE | Null unless all linked findings have had their latest review delivered. In that case it's computed as `MAX(active_through)` across all of the review's citations. |
| `complete` | BOOLEAN | True if no linked finding is itself linked to an open review |
| `corrected` | BOOLEAN | True if all linked findings have had their last review delivered and none of the findings are still active (thus they've been corrected, withdrawn, etc.) |

### Citations

One row per monitoring Finding (which links to a "citation" in `MonitoringStandards`). Represents the flattened, pre-calculated state of a finding across its review history.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `mfid` | INTEGER | Convenience link to `MonitoringFindings.id` |
| `finding_uuid` | TEXT | `MonitoringFindings.findingId` — the IT-AMS finding UUID |
| `raw_status` | TEXT | Status name from `MonitoringFindingStatuses` (e.g., Active, Corrected) |
| `calculated_status` | TEXT | Effective status after applying business rules. An "Area of Concern" will never be marked "Corrected" so we consider it "Closed" if the monitoring goal was closed after the latest review delivery. A finding with an undelivered current review is "Active" regardless of its raw status. Otherwise uses `raw_status`. |
| `active` | BOOLEAN | True if `calculated_status` is "Active" or "Elevated Deficiency" |
| `last_review_delivered` | BOOLEAN | True if the most recent review for this finding has been delivered (non-null `reportDeliveryDate`) |
| `raw_finding_type` | TEXT | Finding type directly from `MonitoringFindings.findingType` |
| `calculated_finding_type` | TEXT | Effective finding type: uses the determination from the latest finding history if available, with "Concern" mapped to "Area of Concern". Falls back to `raw_finding_type`. |
| `source_category` | TEXT | Finding source/category from `MonitoringFindings.source` |
| `finding_deadline` | DATE | Correction deadline from `MonitoringFindings.correctionDeadLine` |
| `reported_date` | DATE | When the finding was reported (not currently used in TTA Hub) |
| `closed_date` | DATE | When the finding was closed (not currently used in TTA Hub) |
| `citation` | TEXT | Citation text from `MonitoringStandards` (e.g., "1302.3") |
| `standard_text` | TEXT | Full standard text from `MonitoringStandards.text` |
| `guidance_category` | TEXT | Guidance text from `MonitoringStandards.guidance` |
| `initial_review_uuid` | TEXT | Review UUID of the earliest delivered review where this finding appeared |
| `initial_narrative` | TEXT | Finding narrative from `MonitoringFindingHistories` linking to the initial review |
| `initial_determination` | TEXT | Determination from `MonitoringFindingHistories` linking to the initial review |
| `initial_report_delivery_date` | DATE | Delivery date of the initial review |
| `latest_review_uuid` | TEXT | Review UUID of the most recently delivered review where this finding appeared |
| `latest_narrative` | TEXT | Finding narrative from `MonitoringFindingHistories` linking to the latest review |
| `latest_determination` | TEXT | Determination from `MonitoringFindingHistories` linking to the latest review |
| `latest_report_delivery_date` | DATE | Delivery date of the latest review |
| `latest_goal_closure` | TIMESTAMP | Most recent closure timestamp of a related Monitoring Goal (from `GoalStatusChanges.performedAt`) This includes Monitoring goals on both the original Grant or the successor Grant |
| `active_through` | DATE | The date through which this finding is/was considered active. For active findings: tomorrow. For closed AOCs: `latest_goal_closure`. Otherwise: `latest_report_delivery_date`. |

### Junction Tables

#### DeliveredReviewCitations

Links `DeliveredReviews` to `Citations` in a many-to-many relationship. A citation appears in a delivered review if the finding has a `MonitoringFindingHistory` record for that review.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `deliveredReviewId` | INTEGER | FK to `DeliveredReviews.id` |
| `citationId` | INTEGER | FK to `Citations.id` |

Unique index on `(deliveredReviewId, citationId)`.

#### GrantDeliveredReviews

Links `Grants` to `DeliveredReviews` in a many-to-many relationship.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `grantId` | INTEGER | FK to `Grants.id` |
| `deliveredReviewId` | INTEGER | FK to `DeliveredReviews.id` |
| `recipient_id` | INTEGER | Link to `Recipients.id` for this grant |
| `recipient_name` | TEXT | Recipient name for this grant |
| `region_id` | INTEGER | Region for this grant |

Unique index on `(grantId, deliveredReviewId)`.

#### GrantCitations

Links `Grants` to `Citations` in a many-to-many relationship.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `grantId` | INTEGER | FK to `Grants.id` |
| `citationId` | INTEGER | FK to `Citations.id` |
| `recipient_id` | INTEGER | Link to `Recipients.id` for this grant |
| `recipient_name` | TEXT | Recipient name for this grant |
| `region_id` | INTEGER | Region for this grant |

Unique index on `(grantId, citationId)`.

## Key Business Rules

### Calculated Status

A finding's `calculated_status` is determined by:

1. If the finding type is "Area of Concern" and the monitoring goal was closed after the latest review delivery date, the status is **Closed**.
2. For ANCs and DEFs, if the most recent review is delivered and complete, the status is the **raw status** from IT-AMS.
3. If the most recent review is NOT delivered and complete, the status is **Active** regardless of the raw status.

### Calculated Finding Type

The `calculated_finding_type` uses the `determination` field from the latest `MonitoringFindingHistory` record if available. The value "Concern" is mapped to "Area of Concern". If no determination exists in that latest `MonitoringFindingHistory` record, the raw `findingType` from `MonitoringFindings` is used.

### Active Through

The `active_through` date defines the window during which a finding is considered active:

- **Active/Elevated Deficiency**: `CURRENT_DATE + 1` (always extends to tomorrow, recalculated daily)
- **Closed Area of Concern**: The date the monitoring goal was closed (`latest_goal_closure`)
- **All other closed findings**: The `latest_report_delivery_date`

### Review Completeness

A `DeliveredReview` is considered `complete` when none of its linked Findings are themselves linked to reviews that have not yet been delivered. The `complete_date` is the latest `active_through` date across all linked citations, or null if at least one linked finding is still waiting for its final review to be delivered. A review is `corrected` when all subsequent reviews have been delivered and no linked findings still show as being active. Thus a review that is `complete` but not `corrected` has gone through an entire sequence of reviews without fully addressing all their citations.

## Source Code

- **Models**: `src/models/deliveredReview.js`, `src/models/citation.js`, `src/models/deliveredReviewCitation.js`, `src/models/grantDeliveredReview.js`, `src/models/grantCitation.js`
- **Update script**: `src/tools/updateMonitoringFactTables.ts`
- **CLI wrapper**: `src/tools/updateMonitoringFactTablesCLI.ts`
- **Migration**: `src/migrations/20260219034204-create-monitoring-fact-tables.js`
