# Monitoring Validation Checks

> **Audience**: Developers working on the IT-AMS monitoring import and its data quality.

The inventory of every monitoring validation observation, stat, and check: what each measures, and — for checks — what severity it raises and the time window that gates it. For how the validation system itself works (processes, runs, steps, tables, Slack routing), see [Monitoring Data Validation](./monitoring-data-validation.md).

Three vocabularies, matching the three tables they're recorded in:
- **Observation** (`ValidationRecords.observation_name`) — a per-entity measurement or categorization, recorded for every entity it applies to whether or not it's alert-worthy.
- **Stat** (`ValidationTimeSeries.stat_name`) — an aggregated time-series statistic.
- **Check** (`ValidationAlerts.check_name`) — what actually turns into a Slack notification, alert, or blocking critical. Most checks are derived from one observation or stat; the two gate checks write directly to `ValidationAlerts` with no backing observation.

## Summary

### Observations → checks

**MonitoringFindings**
- `category` → `finding_category_missing` (team_notification)
- `closure_state` → *(none)*
- `history_determination_recognized` → `history_determination_unrecognized` (team_notification)
- `finding_grant_on_own_review` → `finding_grant_not_on_own_review` (alert)
- `finding_review_history_duplicated` → `finding_review_history_duplicated` (team_notification)
- `finding_standard_missing` → `finding_standard_missing` (alert)
- `history_status_resolvable` → `history_status_unresolvable` (alert)
- `finding_status_resolvable` → `finding_status_unresolvable` (alert)
- `standard_consistency` → `finding_standard_citation_text_disagrees` (alert), `finding_standard_category_disagrees` (alert)
- `history_vs_finding_status` → `history_vs_finding_status_disagrees` (team_notification)
- `history_vs_outcome` → `history_vs_outcome_disagrees` (alert)
- `citation_reopened` → `citation_reopened_on_activity_report` (alert), `citation_reopened` (team_notification)
- `activity_report_citation_source_deleted` → `activity_report_citation_source_deleted` (alert), `activity_report_citation_source_deleted_editable` (alert)
- `citation_review_count` → *(none)*
- `citation_grant_count` → *(none)*
- `citation_days_review_1_to_2` → *(none)*
- `citation_days_review_2_to_3` → *(none)*
- `delivered_review_citation_no_window` → `delivered_review_citation_no_window` (team_notification)

**MonitoringReviews**
- `delivery_report_lag_days` → `review_delivery_report_lag` (alert)
- `finding_count` → *(none)*
- `review_type_shape` → `review_type_shape_violation` (alert)
- `review_status_vs_delivery` → `review_status_vs_delivery_mismatch` (alert)
- `review_grantee_duplicated` → `review_grantee_duplicated` (team_notification)
- `review_grantee_multi_grant` → `review_grantee_multi_grant` (alert)
- `review_status_resolvable` → `review_status_unresolvable` (alert)
- `review_grantee_orphaned_grant` → `review_grantee_orphaned_grant` (alert)
- `delivered_review_completion_state` → `delivered_review_reopened` (team_notification)

**`*Statuses` tables**
- `statuses_table_integrity` → `statuses_table_integrity_violated` (alert)

### Stats → checks

- `reviews_created` → `reviews_created_region_zero` (alert)
- `findings_delivered` → `findings_delivered_month_spike` (alert)

### Gate checks (no backing observation)

- `findings_mass_source_deletion` (alert / critical)
- `open_ar_findings_gone` (alert / critical)

## Observation definitions

Data logic only — severity, message wording, and freshness windows are in [Check definitions](#check-definitions) below.

### MonitoringFindings

**`category`** — the finding's calculated category: own `source`, falling back to standard `guidance`. NULL means neither is set. Recomputes the same logic `Citations.calculated_category` uses, but on the raw finding rather than reading Citations directly: a finding with no live standard link produces no Citation at all (see `finding_standard_missing`), so checking post-transform would miss exactly the findings most likely to have a real category problem.

**`closure_state`** — `active_with_closed_date` when an Active finding carries a `closedDate`, else `consistent`. Usually a stale finding-level `statusId` that hasn't caught up, not a real problem — recorded for anomaly detection, not alerted.

**`history_determination_recognized`** — flags a finding whose history carries a determination value outside the known set (`Noncompliance`, `Concern`, `Deficiency`, `Withdrawn`, `Abandoned`, `Dropped`/`DROPPED`). `updateMonitoringFactTables.ts` silently excludes anything unrecognized from Citations entirely, so a new value needs review before it's added to the known list.

**`finding_grant_on_own_review`** — a finding's directly-attached grant (`MonitoringFindingGrants`) isn't among the grants of any review the finding is actually linked to (`MonitoringFindingHistories`).

**`finding_review_history_duplicated`** — more than one live `MonitoringFindingHistories` row for the same `(findingId, reviewId)`. Only `duplicated_disagreeing` when the duplicates disagree on status or determination.

**`finding_standard_missing`** — a finding with no `MonitoringFindingStandards` link resolving to a *live* `MonitoringStandards` row. An orphaned link (the row exists, but its `standardId` has no live standard) is as invisible to the fact-table transform's inner join as no link at all.

**`history_status_resolvable` / `finding_status_resolvable`** — a `statusId` that doesn't resolve to any live row in its `*Statuses` table.

**`standard_consistency`** — a finding's live `MonitoringFindingStandards` disagree with each other. Citation text disagreeing is `citation_text_disagrees`; guidance disagreeing is `category_disagrees_no_source` when the finding has no `source` of its own (the one case where the disagreement changes `calculated_category`, since `source` otherwise wins) or `category_disagrees_has_source` otherwise.

**`history_vs_finding_status`** — a finding's history status on its own latest delivered review says `Corrected`, but the finding-level `statusId` disagrees. The reverse (finding-level says resolved while the linked history still says open) is not flagged: finding status is often ahead of delivered reviews, and that gap is already understood.

**`history_vs_outcome`** — a finding's latest delivered review has an open history status (`New`/`Not Reviewed`/`Not Corrected`/`Elevated Deficiency`) while that same review's `outcome` says `Compliant`. Excludes Area of Concern findings, whose history status legitimately stays `New` regardless of outcome — they resolve through goal closure, not the history cycle.

**`citation_reopened`** — a Citation's own `active` column flipped from resolved (Closed/Corrected) back to unresolved (Active/Elevated Deficiency), read from `Citations`' own ZAL audit history. Category `reopened` or `consistent`.

**`activity_report_citation_source_deleted`** — a report's citation selection points at a `Citations` row IT-AMS has since soft-deleted. Rolled up per finding since one finding can be cited on more than one report.

**`citation_review_count` / `citation_grant_count`** — how many distinct reviews/grants a citation has ever been linked to (`DeliveredReviewCitations`/`GrantCitations`). Raw material for a future anomaly-detection model.

**`citation_days_review_1_to_2` / `citation_days_review_2_to_3`** — how long a citation's first (then second) delivered review stayed the operative one, tagged with the history status that applied during that period. A citation has at most 3 reviews today, so these are two bounded gaps, not an open-ended per-period timeline. A still-open period (no next review yet) is capped at today rather than the far-future placeholder date, so the duration reads as "time since," not "until the placeholder."

**`delivered_review_citation_no_window`** — a `DeliveredReviewCitations` row whose review was delivered the same day as another review on the same citation, lost the tie-break, and so was never the authoritative review for any period (`latest_review_start IS NULL`).

### MonitoringReviews

**`delivery_report_lag_days`** — days between a review's `reportDeliveryDate` and when that date first appeared in the imported data (from `ZALMonitoringReviews` audit history).

**`finding_count`** — distinct findings linked to a review.

**`review_type_shape`** — a CLASS review with linked findings, or a non-CLASS review with a `MonitoringClassSummaries` row — breaks the assumption the fact tables rely on to keep the two review shapes apart.

**`review_status_vs_delivery`** — a review with a `reportDeliveryDate` (so it's been delivered) whose status isn't `Complete`. The reverse isn't checked: a `Complete` review with no `reportDeliveryDate` is a separate, already-understood gap, since `updateMonitoringFactTables.ts` keys "delivered" on the date, not the status.

**`review_grantee_duplicated`** — more than one live `MonitoringReviewGrantees` row for the same `(reviewId, grantNumber)`.

**`review_grantee_multi_grant`** — a review-grantee link whose `granteeId` also appears on a live link with a *different* `grantNumber`. A real misattribution risk anywhere `granteeId` is used to look up "the" grant for a review (e.g. `finding_grant_on_own_review`).

**`review_status_resolvable`** — a `statusId` that doesn't resolve to any live row in `MonitoringReviewStatuses`.

**`review_grantee_orphaned_grant`** — a review-grantee link whose `grantNumber` has no live `Grants` match (via `GrantNumberLinks`).

**`delivered_review_completion_state`** — same idea as `citation_reopened`, for `DeliveredReviews.complete` flipping true→false, read from `DeliveredReviews`' own ZAL audit history.

### `*Statuses` tables

**`statuses_table_integrity`** — more than one live row for the same `statusId` in a `*Statuses` table. Anchors on the status table itself, not a Finding/Review, since it's about the shared reference table's own integrity.

## Stat definitions

**`reviews_created`** (`monitoring_reviews`, weekly, per region/geo) — bucketed on `MonitoringReviews.sourceCreatedAt` (upstream activity), not `createdAt` (our import time), so a backfill doesn't register as a spike. A review spanning regions counts once per region slice.

**`findings_delivered`** (`monitoring_findings`, monthly, per region/geo **and national**) — distinct findings by first delivery date. A finding on grants in multiple regions is counted in each region slice, so per-region rows must not be summed for a national figure; the `region_id = 0` row carries the deduplicated national count instead.

## Check definitions

Severity, message logic, and window for each check that can reach Slack. See [Windows](./monitoring-data-validation.md#conventions) in the process doc for what `since previous cycle` means mechanically.

### Gate

**`findings_mass_source_deletion`** — the fraction of distinct findings with no live row left, among findings recent in the rolling last year. Alert > 25%, critical > 50%. Min denominator 100 findings. Window: none (recomputed fresh every run over its own rolling 1-year data window).

**`open_ar_findings_gone`** — the fraction of findings cited on open Activity Reports that are no longer live. Alert > 10%, critical > 20%. Min denominator 20 findings. Window: none (open reports are inherently current, so no recency window at all).

### Threshold

**`reviews_created_region_zero`** — alert when a region created zero reviews over the last four complete weeks, and the cross-region four-week average exceeds 5 (so a quiet season doesn't false-alarm). Window: none (recomputed fresh every run over its own rolling 4-week data window).

**`findings_delivered_month_spike`** — alert when the last complete month delivered >50% as many findings as the entire twelve months before it. Window: none (recomputed fresh every run over its own rolling 13-month data window).

### Entity-based

**`finding_category_missing`** (team_notification) — aggregate count of findings with `category IS NULL`. Window: since previous cycle.

**`review_delivery_report_lag`** (alert) — reviews where `delivery_report_lag_days > 7`. Window: 3 days from when the lag was learned about (tolerates a daily cron occasionally slipping a day).

**`history_determination_unrecognized`** (team_notification) — aggregate count of findings with an unrecognized determination value. Window: since previous cycle.

**`review_type_shape_violation`** (alert) — reviews mixing CLASS and finding-based shapes. Window: since previous cycle.

**`review_status_vs_delivery_mismatch`** (alert) — reviews with a `reportDeliveryDate` but a non-`Complete` status. Window: since previous cycle.

**`review_grantee_duplicated`** (team_notification) — reviews with a duplicated grantee link. Window: since previous cycle.

**`review_grantee_multi_grant`** (alert) — reviews with a grantee link whose `granteeId` resolves to more than one grant. Window: since previous cycle.

**`finding_grant_not_on_own_review`** (alert) — findings attached to a grant not on any of their own reviews. Window: since previous cycle.

**`finding_review_history_duplicated`** (team_notification) — findings with disagreeing duplicate history rows. Window: since previous cycle.

**`finding_standard_missing`** (alert) — findings with no live standard at all. Window: since previous cycle.

**`history_status_unresolvable` / `finding_status_unresolvable` / `review_status_unresolvable`** (alert) — a statusId that doesn't resolve. Window: since previous cycle.

**`statuses_table_integrity_violated`** (alert) — a `*Statuses` table has a duplicated live `statusId`. Window: since previous cycle.

**`review_grantee_orphaned_grant`** (alert) — a review-grantee link with no matching live grant. Window: since previous cycle.

**`finding_standard_citation_text_disagrees`** (alert) — a finding's live standards disagree on citation text. Window: since previous cycle.

**`finding_standard_category_disagrees`** (alert) — a finding's live standards disagree on category guidance and it has no source of its own. Window: since previous cycle.

**`history_vs_finding_status_disagrees`** (team_notification) — a finding's Corrected history status disagrees with its finding-level status. team_notification, not alert, since it's a known, understood pattern that doesn't need urgent action. Window: 7 days from whichever of the history status or finding status changed more recently.

**`history_vs_outcome_disagrees`** (alert) — an open history status on a Compliant-outcome review. Alert, not team_notification, since it's two fields on the *same* review disagreeing (unlike `history_vs_finding_status_disagrees`, where one side is already known to be unreliable). Window: 7 days from whichever of the review outcome or history status changed more recently.

**`citation_reopened_on_activity_report`** (alert) — a reopened citation that's cited on a real Activity Report — warrants prompt attention since it's in active use. Window: 7 days from the reopening transition.

**`citation_reopened`** (team_notification) — a reopened citation not (yet) cited on any report. Window: 7 days from the reopening transition.

**`delivered_review_reopened`** (team_notification) — a delivered review no longer complete. Window: 7 days from the completion-state transition.

**`activity_report_citation_source_deleted`** (alert) — an approved report cites a since-deleted citation. Approved reports are immutable by design, so this is an awareness alert, not a bug to fix. Window: 7 days from when the citation was soft-deleted.

**`activity_report_citation_source_deleted_editable`** (alert) — a draft/submitted/needs_action report cites a since-deleted citation. Still-editable, so this can cause real broken behavior and OHS staff can act on it. Window: 7 days from when the citation was soft-deleted.

**`delivered_review_citation_no_window`** (team_notification) — a delivered review that lost a same-day tie-break and was never authoritative for any period. Window: 7 days from when the row was (re)created.
