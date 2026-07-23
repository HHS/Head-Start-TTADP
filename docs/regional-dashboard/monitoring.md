# Regional dashboard monitoring widgets

## Dashboard date filters

The frontend shows one Monitoring **Date** filter, but the backend applies that date to different
columns for different datasets:

- Activity report widgets use `ActivityReports.startDate`.
- Delivered-review widgets and details use `DeliveredReviews.complete_date`.
- Monitoring-related TTA cards still use delivered-review `report_delivery_date`, applied through
  the `grantCitation.reportDeliveryDate` scope so it does not overload delivered-review scopes.

Date values in filter state and query strings should stay in `YYYY/MM/DD` query format. Display
formatting (`MM/DD/YYYY`) should be limited to labels, pills, tables, and CSV output.

## Compliant follow-up reviews with TTA support

The overview/widget denominator counts delivered reviews that have been made compliant:
`DeliveredReviews.corrected = true` and `complete_date >= MIN_MONITORING_DATE`.

The "Had TTA" classification uses approved, non-deleted Activity Reports linked to one of the
review's scoped citations, where `ActivityReports.endDate` is after the initial review delivery date
and before the compliant follow-up review delivery date.

## Active deficient citations with TTA support

This widget returns two monthly traces:

- **All active Deficiencies**: count of deficiencies that were active in each month.
- **Active Deficiencies with TTA support**: subset of those active deficiencies that have an approved Activity Report in the same month.

### Data sources

- Monitoring fact tables:
  - `Citations` (`id`, `calculated_finding_type`, `initial_report_delivery_date`, `active_through`)
  - `GrantCitations`
- TTA Hub activity data:
  - `ActivityReports` (approved reports and start-date month)
  - `ActivityReportObjectives`
  - `ActivityReportObjectiveCitations` (`citationId`)

### Notes

- Matching from AR objectives to monitoring citations is done by `ActivityReportObjectiveCitations.citationId -> Citations.id`.
- The chart includes missing months between the first and last scoped report months, with zero values for both traces when no qualifying records exist in that month.
- Widget implementation: `src/widgets/monitoring/activeDeficientCitationsWithTtaSupport.ts`
- Widget tests: `src/widgets/monitoring/activeDeficientCitationsWithTtaSupport.test.js`
- Fact table reference: `docs/monitoring-fact-tables.md`
