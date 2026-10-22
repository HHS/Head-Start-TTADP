# Monitoring Anomaly-Detection Measures

> **Audience**: Data scientists and developers evaluating candidate measures for Monitoring anomaly detection (TTAHUB-5699).

A brief column-by-column gloss of `finding_observations` and `review_observations` (see `src/tools/validation/monitoringAnomalyDetectionViews.ts`), one row per Finding/Review. For deeper explanations of the observations shared with the validation/alerting system, see [Monitoring Validation Checks](./monitoring-validation-checks.md) — this doc only covers what each column means, not severity or alerting.

## `finding_observations`

| Column | What it is |
|---|---|
| `entity_id` | `MonitoringFindings.id` |
| `category` | Finding's calculated category: own `source`, falling back to standard `guidance` |
| `citation_review_count` | Distinct reviews this citation has ever been linked to |
| `citation_grant_count` | Distinct grants this citation has ever been linked to |
| `citation_days_review_1_to_2` / `_status` | How long the citation's first delivered review stayed operative, and the history status during that period |
| `citation_days_review_2_to_3` / `_status` | Same, for the second-to-third delivered review |
| `raw_finding_type` | The finding's raw type (Noncompliance/Area of Concern/Deficiency/etc.) — unfiltered by any business logic |
| `finding_deadline` | The citation's correction deadline |
| `reported_date` | When the finding was reported |
| `closed_date` | When the finding was closed |
| `reported_to_closed_days` | Days between `reported_date` and `closed_date` |
| `initial_determination` / `latest_determination` / `previous_determination` | The determination (Noncompliance/Concern/etc.) from the finding's first, latest, and second-to-latest review period — `previous` is `NULL` without a second period |
| `initial_narrative_length` / `latest_narrative_length` | Character length of the finding's narrative text at its first/latest review period |
| `initial_review_outcome` / `latest_review_outcome` | The outcome of the finding's first/latest review |
| `finding_status_change_count` | Number of times the finding's status has actually changed since creation |
| `finding_correction_deadline_change_count` | Number of times the correction deadline has actually changed |
| `finding_type_change_count` | Number of times the finding type has actually changed |
| `finding_source_change_count` | Number of times the `source` field has actually changed |

## `review_observations`

| Column | What it is |
|---|---|
| `entity_id` | `MonitoringReviews.id` |
| `delivery_report_lag_days` | Days between the review's delivery date and when that date first appeared in imported data |
| `finding_count` | Distinct findings linked to the review |
| `review_type` | The review's type (e.g. RAN, VP-CLASS) |
| `outcome` | The review's outcome (Compliant/Non Compliant) |
| `report_delivery_date` | When the review was delivered |
| `time_to_complete_days` | Days from delivery to completion; `NULL` if not yet complete |
| `total_open_days` | Days from delivery to completion, or to today if still open — a companion to `time_to_complete_days` for spotting review chains stuck open a long time |
| `citation_count_area_of_concern` / `_noncompliance` / `_deficiency` | Count of the review's associated citations by (cleaned-up) finding type |
| `finding_deadline_max_lag_days` | How far past (or before) this review's delivery date the most distant associated citation's deadline sits |
| `grantee_count` / `grant_count` / `recipient_count` | Distinct grantees/grants/recipients associated with the review |
| `linked_review_count` | Other reviews (any status except Cancelled, delivered or not) sharing at least one finding with this review — one hop only, not transitive |
| `linked_review_latest_delivery_date` | Most recent delivery date among those linked reviews |
| `linked_review_undelivered_count` | How many of those linked reviews haven't been delivered yet |
| `review_status_change_count` | Number of times the review's status has actually changed since creation |
| `review_outcome_change_count` | Number of times the review's outcome has actually changed |
