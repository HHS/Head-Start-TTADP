# Monitoring Fact Tables

> **Audience**: Developers consuming monitoring data in TTA Hub.

## Purpose

The monitoring fact tables are pre-calculated, denormalized tables calculated from the raw Monitoring data imported from IT-AMS. They centralize business logic (status calculation, finding type resolution, active/closed determination) so that logic implementations aren't scattered and replicated across the rest of the TTA Hub. All service code that reads monitoring data should query these tables — direct queries against the raw Monitoring tables are legacy and should be migrated away.

## Conventions

- **Column naming**: snake_case (e.g., `report_delivery_date`), distinguishing calculated fact tables from raw Monitoring tables.
- **Timezone**: All date casts use UTC via `SET TIME ZONE 'UTC'` at the start of the update script, matching HSES's interpretation of IT-AMS data.
- **Soft deletes**: `DeliveredReviews`, `Citations`, and `FindingCategories` use paranoid soft deletes (`deletedAt`).
- **Junction tables**: All junction tables use hard deletes for stale records. `GrantDeliveredReviews` and `GrantCitations` carry grant-derived recipient/region data. `DeliveredReviewCitations` carries the FK pair plus per-review-citation metadata (`determination`, `latest_review_start`, `latest_review_end`, `calculated_review_finding_type`).
- **Grant snapshot columns**: `updateMonitoringFactTables` also updates three denormalized columns included within `Grants` (`latestMonitoringReviewDate`, `latestMonitoringReviewType`, `latestMonitoringReviewOutcome`).
- **Update frequency**: Runs daily after the monitoring data import and maintenance pipeline, via `updateMonitoringFactTablesCLI.ts`.
- **Upsert strategy**: Entity tables and all junction tables use `ON CONFLICT ... DO UPDATE` with `IS DISTINCT FROM` guards to avoid unnecessary updates and thus Audit Log table entries.

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

One row per monitoring review that has actually been delivered to recipients (non-null `reportDeliveryDate`). Includes both compliance reviews (FA-1, RAN, etc.) and CLASS reviews; CLASS reviews have no linked findings and carry scores in `class_es`, `class_co`, and `class_is` instead.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `mrid` | INTEGER | Convenience link to `MonitoringReviews.id` |
| `review_uuid` | TEXT | `MonitoringReviews.reviewId` — the IT-AMS review UUID |
| `review_type` | TEXT | Review type (e.g., FA-1, FA-2, RAN, Follow-up) |
| `review_status` | TEXT | Status name from `MonitoringReviewStatuses` (e.g., Complete) |
| `review_name` | TEXT | Review name from `MonitoringReviews.name` |
| `report_delivery_date` | DATE | When the review was delivered to the recipient |
| `report_start_date` | DATE | When the review started (unused) |
| `report_end_date` | DATE | When the review ended (unused) |
| `outcome` | TEXT | Review outcome (Compliant, Non Compliant, Deficient) |
| `class_es` | DECIMAL(5,4) | CLASS Emotional Support score from `MonitoringClassSummaries.emotionalSupport`. Null for non-CLASS reviews. |
| `class_co` | DECIMAL(5,4) | CLASS Classroom Organization score from `MonitoringClassSummaries.classroomOrganization`. Null for non-CLASS reviews. |
| `class_is` | DECIMAL(5,4) | CLASS Instructional Support score from `MonitoringClassSummaries.instructionalSupport`. Null for non-CLASS reviews. |
| `complete_date` | DATE | Null unless all linked findings have had their latest review delivered. In that case it's computed as `MAX(latest_report_delivery_date)` across all of the review's citations — i.e., the delivery date of the last review in the chain. Null for reviews with no findings (e.g. CLASS reviews). |
| `complete` | BOOLEAN | True if no linked finding is itself linked to an open review. Null for reviews with no findings. |
| `corrected` | BOOLEAN | True if all linked findings have had their last review delivered and none of the findings are still active (thus they've been corrected, withdrawn, etc.). Null for reviews with no findings. |

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
| `standard_id` | INTEGER | `MonitoringStandards.standardId` for this finding's citation, used by the citations service |
| `citation` | TEXT | Citation text from `MonitoringStandards` (e.g., "1302.3") |
| `standard_text` | TEXT | Full standard text from `MonitoringStandards.text` |
| `guidance_category` | TEXT | Guidance text from `MonitoringStandards.guidance` |
| `findingCategoryId` | INTEGER | FK to `FindingCategories.id` — the normalized category row for this `guidance_category` value |
| `initial_review_uuid` | TEXT | Review UUID of the earliest delivered review where this finding appeared |
| `initial_narrative` | TEXT | Finding narrative from `MonitoringFindingHistories` linking to the initial review |
| `initial_determination` | TEXT | Determination from `MonitoringFindingHistories` linking to the initial review |
| `initial_report_delivery_date` | DATE | Delivery date of the initial review |
| `latest_review_uuid` | TEXT | Review UUID of the most recently delivered review where this finding appeared |
| `latest_narrative` | TEXT | Finding narrative from `MonitoringFindingHistories` linking to the latest review |
| `latest_determination` | TEXT | Determination from `MonitoringFindingHistories` linking to the latest review |
| `latest_report_delivery_date` | DATE | Delivery date of the latest review |
| `latest_goal_closure` | TIMESTAMP | Most recent closure timestamp of a related Monitoring Goal (from `GoalStatusChanges.performedAt`) This includes Monitoring goals on both the original Grant or the successor Grant |
| `active_through` | DATE | The date through which this finding is/was considered active. See the Active Through business rule below for the full logic. |

### FindingCategories

Mostly to keep a list of active category values that can be referenced by TTA Hub, FindingCategories is maintained as a dimensional table of unique `guidance_category` values observed across all Citations. It contains one row per distinct `MonitoringStandards.guidance` value seen in reports delivered since the monitoring start date. Populated and maintained by the same update script that manages Citations; a row is soft-deleted when no non-deleted Citation references that category name.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `name` | TEXT | Unique guidance category value (from `MonitoringStandards.guidance`) |

### Junction Tables

#### DeliveredReviewCitations

Links `DeliveredReviews` to `Citations` in a many-to-many relationship. A citation appears in a delivered review if the finding has a `MonitoringFindingHistory` record for that review. Each row also records the time window during which that review was the *most recent* delivered review for the citation. The citations service uses this to return the most correct review name for a given AR start date.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `deliveredReviewId` | INTEGER | FK to `DeliveredReviews.id` |
| `citationId` | INTEGER | FK to `Citations.id` |
| `determination` | TEXT | `MonitoringFindingHistories.determination` for this finding in this specific review |
| `latest_review_start` | DATE | First date on which this review was the most recent delivered review for the citation (equal to `report_delivery_date`). |
| `latest_review_end` | DATE | Last date on which this review was the most recent delivered review for the citation. One day before the next review's `report_delivery_date`, or `Citations.active_through` if this record is for the most recent review. |
| `calculated_review_finding_type` | TEXT | Effective finding type for this citation as it appeared in this specific review. As with `Citations.calculated_finding_type`, `calculated_review_finding_type` is computed from `determination` if present, falling back to `MonitoringFindings.findingType`. "Concern" and "Area of Concern" are both normalized to "Area of Concern". |

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

## Live Value Views

Two read-only views compute live, join-derived fields on top of the fact tables. They are recreated nightly by `updateMonitoringFactTablesCLI.ts` and are also created on fresh environments by migration `20260424000000-create_live_values_views.js`.

### citations_live_values

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Matches `Citations.id` — join key |
| `last_tta` | DATE | `endDate` of the most recent approved Activity Report that references this citation (via `ActivityReportObjectiveCitations`) |
| `last_ar_id` | INTEGER | `id` of that Activity Report |
| `last_closed_goal` | TIMESTAMP | `performedAt` of the most recent `GoalStatusChange` with `newStatus = 'Closed'` on a Monitoring Goal linked to any Grant that has this Citation (via `GrantCitations`) |
| `last_closed_goal_id` | INTEGER | `id` of that Goal |

### deliveredreviews_live_values

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Matches `DeliveredReviews.id` — join key |
| `last_tta` | DATE | `endDate` of the most recent approved Activity Report referencing any Citation on this review |
| `last_ar_id` | INTEGER | `id` of that Activity Report |
| `last_closed_goal` | TIMESTAMP | `performedAt` of the most recent closed Monitoring Goal linked to any Grant associated with this review (via `GrantDeliveredReviews`) |
| `last_closed_goal_id` | INTEGER | `id` of that Goal |

### Accessing live values in Sequelize

Both `Citation` and `DeliveredReview` have a `withLiveValues` scope that performs a single `LEFT JOIN` to the corresponding view via the `CitationsLiveValues` / `DeliveredReviewsLiveValues` models:

```js
const citations = await Citation.scope('withLiveValues').findAll({ where: { active: true } });
citations[0].liveValues.last_closed_goal; // populated
citations[0].liveValues.last_tta;          // populated
```

Live values are available on the nested `liveValues` association object, not flat on the parent instance. The scope uses a single `LEFT JOIN` rather than per-column correlated subqueries, so the view's CTEs execute once per query regardless of result set size. `liveValues` is `null` on rows where no view entry exists (which should not happen in practice, but guards against missing data).

## Key Business Rules

### Calculated Status

A finding's `calculated_status` is determined by the following rules, evaluated in order:

1. If the finding type is "Area of Concern" and the monitoring goal was closed after the latest review delivery date, the status is **Closed**.
2. If the finding's raw status from IT-AMS is "Elevated Deficiency" and the most recent review has been delivered with `outcome = 'Compliant'`, the status is **Corrected**.
3. For ANCs and DEFs, if the most recent review is delivered and complete, the status is the **raw status** from IT-AMS.
4. If the most recent review is NOT delivered and complete, the status is **Active** regardless of the raw status.

### Calculated Finding Type

The `calculated_finding_type` uses the `determination` field from the latest `MonitoringFindingHistory` record if available. The value "Concern" is mapped to "Area of Concern". If no determination exists in that latest `MonitoringFindingHistory` record, the raw `findingType` from `MonitoringFindings` is used.

### Calculated Review Finding Type

`DeliveredReviewCitations.calculated_review_finding_type` is the review-scoped counterpart to `Citations.calculated_finding_type`. It is computed from the `determination` recorded in the `MonitoringFindingHistory` entry for this specific review (i.e. the same `determination` stored in `DeliveredReviewCitations.determination`), falling back to `Citations.raw_finding_type`. "Concern" and "Area of Concern" are both normalized to "Area of Concern".

The key difference: `Citations.calculated_finding_type` is the *current* value, reflecting the determination from the latest review globally; `DeliveredReviewCitations.calculated_review_finding_type` reflects what was *historically* recorded on this particular review.

### Active Through

The `active_through` date defines the window during which a finding is considered active:

- **Undelivered current review**: `CURRENT_DATE + 1` (the finding is still in progress; recalculated daily)
- **Final review delivered but calculated_status still Active or Elevated Deficiency**: `9999-12-31` — the delivered review did not resolve the finding (e.g., IT-AMS raw status is still Active, or it is an Elevated Deficiency whose final review outcome was not Compliant), so it has no known end date
- **Closed Area of Concern**: The date the monitoring goal was closed (`latest_goal_closure`)
- **All other closed findings**: The `latest_report_delivery_date`

### Review Completeness

A `DeliveredReview` is considered `complete` when none of its linked Findings are themselves linked to reviews that have not yet been delivered. The `complete_date` is the latest `latest_report_delivery_date` across all linked citations, or null if at least one linked finding is still waiting for its final review to be delivered. A review is `corrected` when all subsequent reviews have been delivered and no linked findings still show as being active. Thus a review that is `complete` but not `corrected` has gone through an entire sequence of reviews without fully addressing all their citations.

### Goal Suppression via last_closed_goal

`citations_live_values.last_closed_goal` is used by `createMonitoringGoals` to avoid re-opening a Monitoring Goal immediately after it was closed. Closing a Monitoring Goal is treated as a signal that all outstanding TTA for that grant is complete — at least until a new review is delivered. Note that this looks for a closed goal on _any_ grant associated with the Citation, which relies on the assumption that the only way a Citation could be linked to an additional Grant that hasn't already received the Monitoring Goal is if a new report was delivered. If a new report is delivered, it has a later date than the Goal closure, and a new Monitoring Goal gets created for all Grants connected to that Citation in the newly delivered report, including that additional Grant.

- If `last_closed_goal > citation.latest_report_delivery_date`: the goal was closed *after* the latest review was delivered, so no new goal is created.
- If `last_closed_goal IS NULL` or `last_closed_goal <= citation.latest_report_delivery_date`: either no goal has ever been closed, or the closure predates the latest review delivery — a new goal should be created.

The same field is also used by `getCitationsByGrantIds` (the citations service) to suppress citations from the AR citation picker for the same reason (all TTA is considered complete). A citation is hidden from users when a Monitoring goal on any associated grant was closed after the finding's latest delivered review. This suppression applies to all citation types, but "reopened" goals are exempted because they have likely been reopened so that more TTA can be recorded. The filter is:

```sql
clv.last_closed_goal IS NULL OR clv.last_closed_goal::date <= c.latest_report_delivery_date OR (g."createdAt" > clv.last_closed_goal AND g."createdVia" = 'rtr')
```

### Grant Snapshot Columns

Three columns on `Grants` are maintained by `updateMonitoringFactTables` to cache the most recent compliance monitoring review per grant without a date cutoff. CLASS reviews (identified by a matching `MonitoringClassSummaries` record) are excluded — these columns are only for compliance reviews (FA-1, RAN, etc.).

| Column | Type | Description |
|---|---|---|
| `latestMonitoringReviewDate` | DATE | Delivery date of the most recent non-CLASS delivered review for this grant |
| `latestMonitoringReviewType` | TEXT | Review type (e.g., FA-1, RAN) of that review |
| `latestMonitoringReviewOutcome` | TEXT | Outcome (e.g., Complete, Deficiency) of that review |

Updates are scoped to grants that are `Active` or became inactive within the last year (`inactivationDate >= CURRENT_DATE - INTERVAL '1 year'`), to avoid churn from IT-AMS touching historical data. The `monitoringData()` service function reads directly from these columns.

## Source Code

- **Models**: `src/models/deliveredReview.js`, `src/models/citation.js`, `src/models/findingCategory.js`, `src/models/deliveredReviewCitation.js`, `src/models/grantDeliveredReview.js`, `src/models/grantCitation.js`
- **Live value view models**: `src/models/citationsLiveValues.js`, `src/models/deliveredReviewsLiveValues.js`
- **Update script**: `src/tools/updateMonitoringFactTables.ts` (also recreates live value views nightly)
- **CLI wrapper**: `src/tools/updateMonitoringFactTablesCLI.ts`
- **Migrations**: `src/migrations/20260219034204-create-monitoring-fact-tables.js`, `src/migrations/20260421000000-create_finding_categories_table.js`, `src/migrations/20260424000000-create_live_values_views.js`, `src/migrations/20260429220319-expand_monitoring_fact_table_columns.js`, `src/migrations/20260521000000-add_calculated_review_finding_type.js`, `src/migrations/20260528063939-add_latest_monitoring_review_to_grants.js`
