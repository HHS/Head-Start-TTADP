# Moment.js to Luxon Migration: Phase C PR Notes

## Summary
- Replaced direct `moment` / `moment-timezone` usage in backend and frontend app code with `luxon` and targeted native date handling.
- Removed direct `moment` dependencies from root and frontend manifests.
- Migrated date-related tests and mocks used by touched areas.
- Added centralized date helpers for frontend and backend migration paths.

## Scope
- Total changed tracked files: 126
- Frontend files changed: 91
- Backend files changed (`src/`): 33
- Test files changed: 31
- New files added:
  - `src/lib/dates.ts`
  - `frontend/src/lib/dates.js`

## Dependency changes
- `package.json`
  - Added: `luxon`
  - Removed: `moment`, `moment-timezone`
- `frontend/package.json`
  - Added: `luxon`
  - Removed: `moment`, `moment-timezone`
- Lockfiles updated:
  - `yarn.lock`
  - `frontend/yarn.lock`

Note: `moment` can still appear in `yarn.lock` as a transitive dependency from third-party packages. This is expected and not a direct app dependency.

## Notable implementation points
- Backend parsing/formatting migrated to Luxon:
  - `src/lib/date.js`
  - `src/lib/modelHelpers.js`
  - `src/scopes/utils.ts`
  - `src/services/communicationLog.ts`
  - `src/services/event.ts`
  - `src/services/monitoring.ts`
  - `src/lib/mailer/index.js`
  - `src/goalServices/changeGoalStatus.ts`
- Frontend shared date helper introduced:
  - `frontend/src/lib/dates.js`
- Backend shared UTC parser introduced:
  - `src/lib/dates.ts`

## Validation completed
- `yarn build` (TypeScript compile) passed.
- Backend targeted test passed:
  - `yarn jest src/lib/mailer/trainingReportTaskDueNotifications.test.js --runInBand`
- Frontend targeted tests passed:
  - `yarn test src/components/filter/__tests__/DateRangePicker.js --watch=false`
  - `yarn test src/pages/QADashboard/__tests__/index.js --watch=false`
  - `yarn test src/components/__tests__/ControlledDatePicker.js --watch=false`
  - `yarn test src/pages/SessionForm/pages/__tests__/participants.js --watch=false`

Environment note: in this sandbox, yarn commands require `YARN_CACHE_FOLDER` set to a writable location.

## PR checklist
- [x] Direct `moment` imports removed from `src/` and `frontend/src/`.
- [x] Root/frontend `package.json` no longer include direct `moment` deps.
- [x] Lockfiles regenerated after dependency changes.
- [x] High-risk date workflows verified by targeted tests:
  - training report due notifications
  - date range filters
  - QA dashboard date handling
  - controlled date picker behavior
  - session participants workflow
- [x] TypeScript build passes.
- [ ] Run full CI in repo-standard environment (DB + full frontend/backend suites).
- [ ] Perform manual smoke test in staging for date/timezone-sensitive pages.

## Risk checklist (review focus)
- Date parsing strictness differences:
  - invalid/partial inputs in communication logs and filters
- Timezone behavior differences:
  - local timezone display vs UTC parse paths
- Boundary/date-diff logic:
  - “20 days after start/end” notification behavior
- Format token parity:
  - `YYYY/DD` style tokens converted to Luxon equivalents
- Tests with implicit local timezone assumptions:
  - ensure CI timezone settings still match expected snapshots/assertions

## Rollback plan
1. Revert the migration commits in order (or revert the PR merge commit).
2. Reintroduce direct dependencies in manifests:
   - add `moment` and `moment-timezone` back to `package.json`
   - add `moment` and `moment-timezone` back to `frontend/package.json`
3. Regenerate lockfiles:
   - `yarn install --mode update-lockfile`
   - `cd frontend && yarn install --mode update-lockfile`
4. Re-run targeted date tests and build:
   - backend mailer test
   - frontend date-range and date-picker tests
   - `yarn build`

## Post-merge monitoring
- Watch production logs and support channels for:
  - “Invalid date” regressions
  - incorrect sort/filter date ranges
  - incorrect due/past-due email timing
- Verify at least one full run of due notification jobs after deploy.
- Validate key report pages in multiple timezones (or simulated timezone context).
