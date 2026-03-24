# Regional dashboard monitoring widgets

## Active deficient citations with TTA support

This widget returns two monthly traces:

- **All active Deficiencies**: count of deficiencies that were active in each month.
- **Active Deficiencies with TTA support**: subset of those active deficiencies that have an approved Activity Report in the same month.

### Data sources

- Monitoring fact tables:
  - `Citations` (`calculated_finding_type`, `reported_date`, `active_through`, `finding_uuid`)
  - `GrantCitations`
- TTA Hub activity data:
  - `ActivityReports` (approved reports and start-date month)
  - `ActivityReportObjectives`
  - `ActivityReportObjectiveCitations` (`monitoringReferences[].findingId`)

### Notes

- Matching from AR citations to monitoring findings is done by `monitoringReferences[].findingId -> Citations.finding_uuid`.
- The chart includes missing months between the first and last scoped report months, with zero values for both traces when no qualifying records exist in that month.
- Widget implementation: `src/widgets/monitoring/activeDeficientCitationsWithTtaSupport.ts`
- Widget tests: `src/widgets/monitoring/activeDeficientCitationsWithTtaSupport.test.js`
- Fact table reference: `docs/monitoring-fact-tables.md`
