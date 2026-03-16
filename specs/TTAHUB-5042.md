# TTAHUB-5042 — AROC to Citation Fact-Table Refactor (Implementation Plan)

## Problem statement
`ActivityReportObjectiveCitations` currently stores citation links in a denormalized JSONB field (`monitoringReferences`). Multiple backend services and frontend pages depend on that shape, but we now have normalized monitoring fact tables (`Citations`, `GrantCitations`, `DeliveredReviews`) that should be used as the source of truth.

Goal: refactor AROC citation persistence to a normalized many-to-many relationship with `Citations` while preserving the existing API contract consumed by frontend and existing endpoints.

## Proposed approach
Implement this in two layers:

1. **Storage refactor**: move persistence from JSONB references to normalized ARO↔Citation links.
2. **Contract adapter**: keep current response payloads (`citations[].monitoringReferences`, monitoring pages payloads) by reconstructing legacy shape in service layer from normalized data.

This allows internal normalization without breaking frontend contract.

## Breakdown (implementation-ready)

### 1) Freeze the API contract before refactor
- Document/lock payloads currently returned/accepted by:
  - `PUT /api/activity-reports/:activityReportId` (`saveReport`)
  - `GET /api/monitoring/:recipientId/region/:regionId/tta/citation`
  - `GET /api/monitoring/:recipientId/region/:regionId/tta/review`
- Use existing tests as baseline fixtures:
  - `src/services/ttaByCitation.test.js`
  - `src/services/ttaByReview.test.js`
  - `src/routes/monitoring/handlers.test.js`
  - goal/objective/report tests that assert `monitoringReferences`.

### 2) Backend request validation (Joi)
- Add Joi validation middleware for targeted endpoints:
  - `PUT /activity-reports/:activityReportId` body validation for citation payload shape (at least structural validation for nested citation objects).
  - Monitoring route param validation for `recipientId` and `regionId` on `/tta/citation` and `/tta/review`.
- Pattern to follow:
  - `src/routes/activityReports/middleware.ts` and `src/routes/activityReports/middleware.test.js`.
- Wire middleware in:
  - `src/routes/activityReports/index.js`
  - `src/routes/monitoring/index.js`.

### 3) OpenAPI + test coverage hardening
- OpenAPI currently includes activity-report endpoints but does **not** document monitoring/citations routes.
- Add/update docs in `docs/openapi` for:
  - monitoring TTA endpoints
  - any response-shape clarifications for citation-related fields.
- Expand tests across impacted layers:
  - model tests (`src/models/tests/activityReportObjectiveCitation.test.js`)
  - report cache/standard goals tests
  - monitoring service tests
  - route middleware tests for Joi validators.


### 4) Data model + migration plan (normalized junction)
- Add/reshape junction for ARO↔Citation links (many-to-many) with FK to `Citations.id`.
- Add indexes/constraints:
  - FK on ARO and Citation
  - unique key preventing duplicate ARO↔Citation links.
- Backfill existing rows by mapping legacy `monitoringReferences[].findingId` → `Citations.finding_uuid` (or `mfid`-based mapping if needed).
- Keep migration reversible and idempotent for environments already carrying historical AROC migrations.
- Files likely touched:
  - `src/migrations/*new-migration*.js`
  - `src/models/activityReportObjectiveCitation.js` (or replacement model)
  - `src/models/activityReportObjective.js`
  - `src/models/citation.js` (association additions only).

### 5) Update write path (save/report cache)
- Refactor citation persistence logic in:
  - `src/services/reportCache.js` (`cacheCitations`)
  - `src/services/standardGoals.ts` (if citation hydration assumptions rely on JSONB row shape).
- Continue accepting current request payload format from frontend (`citation` + `monitoringReferences`) and translate server-side to normalized links.
- Preserve existing filtering behavior:
  - only monitoring goals persist citations
  - per-grant citation behavior currently enforced in `cacheCitations`.

### 6) Update read path + legacy response adapter
- Replace direct `monitoringReferences` reads with normalized joins and construct legacy contract response objects.
- Main consumers to refactor:
  - `src/goalServices/getGoalsForReport.ts`
  - `src/goalServices/reduceGoals.ts`
  - `src/goalServices/goals.js`
  - `src/services/standardGoals.ts`
  - `src/services/recipient.js`
  - `src/services/monitoring.ts`
  - `src/services/types/activityReportObjectiveCitations.ts`
  - `src/goalServices/types.ts`.
- Preserve fields expected by frontend and tests (`standardId`, `acro`, `findingSource`, `grantId`, `grantNumber`, `reviewName`, etc.) by deriving from `Citations` + related joins (and raw monitoring tables where fact tables don’t currently expose a field like review name/standardId).


### 7) Monitoring service behavior updates
- Refactor `src/services/monitoring.ts` to stop relying on AROC virtuals from JSONB (`findingIds`, `reviewNames`, `grantNumber`) and instead compute from normalized joins.
- Maintain output contract for monitoring pages:
  - review cards + citation cards in `frontend/src/pages/RecipientRecord/pages/Monitoring/components/*`.

### 8) Process-data anonymization updates
- Replace or adapt `processMonitoringReferences` in:
  - `src/tools/processData.js`
  - `src/tools/processData.test.js`.
- If grant numbers are no longer persisted in AROC rows, convert this step to an equivalent anonymization on new persisted fields or remove safely with test updates.

### 9) SSDI report SQL refactor
- Update:
  - `src/queries/dataRequests/internal/monitoring-citation-ar-report.sql`
- Remove coupling to legacy `ActivityReportObjectiveCitations.monitoringReferences`/citation-text matching and join through normalized citation linkage to maintain report correctness.

### 10) Verification and rollout
- Run backend + frontend lint/tests.
- Add migration/backfill verification queries:
  - row counts old vs new linkage
  - random sampling by report/objective/finding.
- Verify no contract regressions on:
  - Activity Report edit/review flows
  - Recipient Monitoring (By review / By citation pages)
  - SSDI monitoring-citation report output.

## Additional Context (codebase findings)

### Current state of AROC storage
- `src/models/activityReportObjectiveCitation.js` stores:
  - `citation` (TEXT)
  - `monitoringReferences` (JSONB)
  - virtuals `findingIds`, `grantNumber`, `reviewNames` derived from JSONB.
- This model is currently linked to `ActivityReportObjective` (hasMany/belongsTo) but not normalized to `Citations`.

### Existing normalized monitoring data available
- Fact-table model exists:
  - `src/models/citation.js` (`Citations` table with calculated status/type fields).
- Link tables also exist:
  - `GrantCitations`, `DeliveredReviewCitations`, `GrantDeliveredReviews`.
- Migration creating these fact tables:
  - `src/migrations/20260219034204-create-monitoring-fact-tables.js`.

### High-impact consumers of legacy JSONB
- Save/write path:
  - `src/services/reportCache.js` (`cacheCitations`), tests in `src/services/reportCache.test.js`.
- Goal/objective read shaping:
  - `src/goalServices/getGoalsForReport.ts`
  - `src/goalServices/reduceGoals.ts`
  - `src/services/standardGoals.ts`
  - `src/services/recipient.js`.
- Monitoring pages data:
  - `src/services/monitoring.ts` + `src/services/ttaByCitation.test.js` + `src/services/ttaByReview.test.js`.
- Anonymization:
  - `src/tools/processData.js` + `src/tools/processData.test.js`.
- SSDI query:
  - `src/queries/dataRequests/internal/monitoring-citation-ar-report.sql`.

### Frontend contract dependencies to preserve
- Activity report pages rely on `objective.citations[].monitoringReferences[]` fields:
  - `frontend/src/pages/ActivityReport/Pages/components/Objective.js`
  - `frontend/src/pages/ActivityReport/Pages/Review/Submitter/index.js`
  - `frontend/src/pages/ActivityReport/Pages/components/RenderReviewCitations.js`
  - tests under corresponding `__tests__`.
- Monitoring recipient record pages rely on current `/monitoring/tta/*` response structure:
  - `frontend/src/pages/RecipientRecord/pages/Monitoring/*`
  - `frontend/src/fetchers/monitoring.js`.

### API documentation coverage gap
- `docs/openapi/paths/index.yaml` currently documents activity reports and many other routes, but does not include `/monitoring` or `/citations` routes that are actively used.

### Validation baseline
- Activity reports currently have Joi middleware only for report review endpoint (`checkReviewReportBody`).
- `saveReport` currently checks only presence of `req.body`.
- Monitoring handlers currently rely on service-side access checks and no Joi param/body validation.

## Confirmed implementation decisions
- We preserve frontend/backend API contract while changing internal persistence.
- ARO↔Citation linkage is at finding-level (`Citations.id`), with citation-grouped payload reconstruction in service layer.
- We keep refactor backend-first and avoid frontend behavior changes unless contract gaps force it.

## Execution todos (for tracked implementation)
- `contract-baseline`: Capture and lock payload contracts + fixtures for saveReport and monitoring endpoints.
- `docs-openapi`: Add/update OpenAPI coverage for impacted endpoints.
- `validation-middleware`: Add Joi validators + route wiring for saveReport and monitoring params.
- `schema-migration`: Design and add normalized ARO↔Citation migration + backfill.
- `model-associations`: Update Sequelize models/associations for new linkage.
- `write-path-refactor`: Refactor report cache/save path to persist normalized citation links.
- `read-adapter-refactor`: Rebuild legacy `monitoringReferences` contract from normalized data in goal/recipient/monitoring services.
- `processdata-update`: Replace monitoringReferences anonymization logic + tests.
- `ssdi-query-update`: Refactor monitoring-citation SSDI SQL to normalized joins.
- `test-sweep`: Update/add backend/frontend tests and run full relevant suites.
