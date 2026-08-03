# Monitoring Data Validation

> **Audience**: Developers working on the IT-AMS monitoring import and its data quality.

## Purpose

The monitoring data validation system surfaces unexpected conditions in the Monitoring data imported from IT-AMS early, so engineers can investigate and — where the cause is upstream — coordinate a fix with IT-AMS before the effects spread. That imported data feeds the monitoring fact tables, the goals derived from them, and the citations users select on Activity Reports, so an unnoticed data anomaly propagates widely and quietly. Validation takes two forms today over shared infrastructure: an everyday **observational** run that records statistics and per-entity observations and raises non-blocking alerts to Slack, and a **pre-refresh gate** that pauses the import when a condition is severe enough that letting it flow into the fact tables would do more harm than holding the previous day's data. The two differ only in *when* they run and *whether* a check can pause the import; more forms are anticipated (see [Future work](#future-work)).

## Naming

- **`Monitoring*`** tables are raw IT-AMS import data.
- **`Validation*`** tables are the derived validation infrastructure documented here.
- Neither is the **fact tables** (`DeliveredReviews`, `Citations`, …), which are the denormalized read model. See [`monitoring-fact-tables.md`](monitoring-fact-tables.md).

## Architecture

The system is a small, uniform hierarchy of four concepts:

```
Process  (monitoring | monitoring_gate)   a named validation workflow
  └─ Run  (one execution; a row in ValidationRuns)
        ├─ Step 1 ─┐
        ├─ Step 2  ├─ run in order in ONE transaction; each INSERTs into
        └─ Step 3 ─┘   ValidationTimeSeries / ValidationRecords / ValidationAlerts
        └─▶ Result  (counts, incl. criticalCount) ──▶ caller decides whether to act
```

- **Process** — a named validation workflow (`ValidationRuns.process_name`; values in `VALIDATION_PROCESS`). Two exist today: `monitoring` (observational) and `monitoring_gate` (the pre-refresh gate). A process is defined by an ordered list of steps and owns its own retention — each of its runs clears the process's prior alerts, and observation records are kept only for the current and previous run.
- **Run** — one execution of a process, recorded as a row in `ValidationRuns`. The row is written and committed as `started` *before* any work begins, so a watchdog can later distinguish "never ran" from "started but crashed" (a row stuck at `started`). When the run finishes it is updated to `success` (with counts) or `failure` (with an error).
- **Step** — the unit of work inside a run (`ValidationStep`). A step is a function handed the run's transaction; it reads whatever tables it needs and INSERTs its own output — time-series rows, observations, or alerts. All of a run's steps execute in order inside one transaction, because a later step may build on a temp table or rows an earlier one produced; they are not parallelized. Each step is plain SQL, so it can be lifted out and run by hand in psql.
- **Result** — what a completed run hands back to whatever launched it (`RunValidationResult`): the run id, the counts, and the alert rows, including how many were `critical`. It is a report, not a decision. The run itself never blocks anything.

### The runner

Tying those together is **the runner**, `runValidation` (`src/tools/validation/runValidation.ts`) — the single seam every process goes through. Given a `processName` and its ordered `steps`, it:

1. creates and commits the `ValidationRun` row (`started`);
2. opens one transaction — attributes any audited writes to the process, sets UTC, publishes the run id in an `ON COMMIT DROP` temp table (`validation_run`) that steps `CROSS JOIN` instead of interpolating the id into every statement, then runs each step in order;
3. reads back the run's counts, marks it `success`, and emits one greppable summary line for the reporting chain;
4. returns the result. On error it marks the run `failure`, emits a failure line, and rethrows.

Crucially, **the runner never acts on a result.** It counts criticals and returns them; the *caller* decides what a critical means. That one separation is what lets identical machinery serve the observational run (caller ignores the count), the pre-refresh gate (caller exits nonzero to pause the pipeline), and a possible future in-refresh gate (caller throws inside the refresh transaction). Who acts, and how, is the only thing that varies between forms.

## Sequencing in the import pipeline

The two processes are wired in as phases of the daily import cron in `.circleci/config.yml`. The phase loop **breaks on the first failing phase** — that is the mechanism the gate relies on:

```
download
  -> process
  -> validate_monitoring_gate     <-- gate process; a nonzero exit pauses the import here
  -> update_fact_tables
  -> create_monitoring_goals
  -> maintain_monitoring_data
  -> validate_monitoring_data     <-- observational process; never pauses the import
  -> report_updates
```

The gate sits between `process` and `update_fact_tables`, so pausing there holds the refresh and every phase after it, leaving the previous day's data live. The observational process runs late, after the refresh, and only records and alerts.

## The observational process

`monitoring` (`src/tools/validateMonitoringData.ts`) runs three steps through the runner. It records a run, raises alerts, and builds the baseline for future modeling, but never pauses the import. Its steps run in sequence, each feeding the next:

**Step 1 — `monitoringTimeSeries.ts` → `ValidationTimeSeries`.** Upserts long/narrow aggregated statistics describing monitoring activity. The full range since `TIME_SERIES_START` (`2025-01-01`) is recomputed every run, so late-arriving data self-corrects; the unique key makes recomputation idempotent. Shared intermediates (e.g. `finding_deliveries`) are built as temp tables for reuse by later stats.

| Stat (`feature_set` / `stat_name`) | Grain | Notes |
|---|---|---|
| `monitoring_reviews` / `reviews_created` | weekly, per region/geo | Bucketed on `MonitoringReviews.sourceCreatedAt` (upstream activity), not `createdAt` (our import time), so backfills don't register as spikes. A review spanning regions counts once per region slice. |
| `monitoring_findings` / `findings_delivered` | monthly, per region/geo | Distinct findings by first delivery date (earliest delivered review via `MonitoringFindingHistories`). |

**Step 2 — `monitoringObservations.ts` → `ValidationRecords`.** Rebuilds one row per entity per observation (scalars in `scalar`, categories in `category`). Observations are the raw material the alert checks — and future models — read, and they let a human drill from an aggregate alert down to the specific offending entities.

| Observation (`observation_name`) | Entity | Kind | Meaning |
|---|---|---|---|
| `category` | `MonitoringFindings` | category | Finding's calculated category (`source`, falling back to standard `guidance`); NULL flags a categoryless finding. |
| `delivery_report_lag_days` | `MonitoringReviews` | scalar | Days between a review's `reportDeliveryDate` and when that date first appeared in the imported data (from `ZALMonitoringReviews` audit rows). |
| `finding_count` | `MonitoringReviews` | scalar | Distinct findings linked to the review. |
| `closure_state` | `MonitoringFindings` | category | `active_with_closed_date` when an Active finding carries a `closedDate`, else `consistent`. |

**Step 3 — `monitoringAlerts.ts` → `ValidationAlerts`.** Raises alerts from threshold checks over the time series and validity checks over the observations, both produced earlier in the same run. Threshold checks look at **complete** periods only (the current partial week/month would always false-alarm). Every alert here is severity `alert`.

| Check (`check_name`) | Fires when |
|---|---|
| `reviews_created_region_zero` | A region created zero reviews over the last four complete weeks, *and* the cross-region four-week average exceeds 5 (so quiet seasons don't false-alarm). The region universe comes from `Grants`, so a region with no time-series rows still counts as zero. |
| `findings_delivered_month_spike` | The last complete month delivered more than 50% as many findings as the entire twelve months before it. |
| `finding_category_missing` | Aggregate count of findings on delivered reviews with no category (drill in via `ValidationRecords`, `observation_name = 'category' AND category IS NULL`). |
| `review_delivery_report_lag` | Aggregate count of reviews whose delivery date was imported more than 7 days late (`delivery_report_lag_days > 7`). |
| `finding_active_with_closed_date` | Aggregate count of Active findings that carry a `closedDate` (`closure_state = 'active_with_closed_date'`). |

## The pre-refresh gate process

`monitoring_gate` (`src/tools/validateMonitoringGate.ts`) runs a single step, `monitoringGateChecks.ts`, and writes only `ValidationAlerts`. Its CLI acts on the result: it exits `1` when `criticalCount > 0` (or on error), which breaks the pipeline loop before `update_fact_tables`. A run with only non-critical alerts, or none, exits `0` and the import proceeds.

Both checks were prompted by a real incident in which an unexpectedly large fraction of findings became source-deleted in the imported data. Each check carries a minimum-denominator guard so a small or empty dataset can never false-pause.

| Check | What it measures | Alert / Critical | Min denominator |
|---|---|---|---|
| `findings_mass_source_deletion` | Over **distinct findings** whose recency (`COALESCE(reportedDate, sourceCreatedAt)`) falls in the **rolling last year**, the fraction with **no live row** left in `MonitoringFindings`. | > 25% / > 50% | 100 findings |
| `open_ar_findings_gone` | Distinct `findingId`s cited on **open** Activity Reports (`ActivityReportObjectiveCitations` → `ActivityReportObjectives` → `ActivityReports` with `calculatedStatus` in draft/submitted/needs_action) that have no live `MonitoringFindings` row. | > 10% / > 20% | 20 findings |

Two subtleties in `findings_mass_source_deletion`:

- **Aggregate to `findingId`, not row.** A `findingId` can span several rows (~2 on prod): routine churn in the upstream data sometimes leads the import to represent an updated finding as a new record — source-deleting the old row and inserting a fresh one under the same `findingId`. Counting source-deleted *rows* therefore measures that churn (~30–50% on healthy data), not findings that actually disappeared. The check instead groups by `findingId` and counts only findings where **no** row is live, which reads ~1% on healthy data; the incident above still shows as a ~24% one-month spike.
- **Rolling window, fixed threshold.** The one-year window averages across seasonal/fiscal swings, but it is compared against a *fixed absolute* threshold, not a learned baseline. Learned-baseline anomaly detection is deferred (see Future work).

`open_ar_findings_gone` is the highest-stakes check because those findings are cited on in-progress user work; open reports are inherently timely, so it uses no recency window.

## Reporting and acting on results

A raised alert reaches people through one chain, and the decision to pause the import is a separate, caller-side step.

**The reporting chain.** Durable diagnostics ride the runner's single greppable `console.info` line — `Monitoring Gate: {…}` or `Monitoring Validation Alerts: {…}`, carrying the run's counts and alert rows as JSON — **not** the alert table. (Riding the log line is deliberate: a future in-transaction gate can throw and roll back, losing its alert rows, yet still explain *why* it paused.) From there: CI captures each phase's output to a per-phase log → `.circleci/scripts/build_import_summary.sh` parses those lines into a summary (with a dedicated branch that spells out the pause reason when the failed phase is `validate_monitoring_gate`) → `notify_slack` posts the summary to the configured channel.

**Acting on the result.** `severity` is what separates a condition that merely needs attention from one that should pause the import. The runner only *counts* criticals; each caller decides what to do with the count:

| Caller | On `criticalCount > 0` |
|---|---|
| `validateMonitoringDataCLI` | Nothing — observational, exits 0 |
| `validateMonitoringGateCLI` | `process.exit(1)` → pipeline loop breaks before `update_fact_tables` |
| Future in-refresh check | Would `throw` inside `updateMonitoringFactTables`' transaction → rollback for free |

**The watchdog.** `checkMonitoringValidationRan.ts` (`cli:check-monitoring-validation-ran`) runs on a **separate** schedule a few hours after the import cron, so it can catch the case where the validation — or the whole cron — never fired. It looks for a `monitoring` run started in the last 24 hours and reports `ok`, `run failed`, `run incomplete` (stuck at `started`), or `no validation run in last 24 hours`. This is why the run row is committed as `started` before any work.

## Tables

All four tables are created by migration `20260714120000-create_validation_tables.js`. Ids are `BIGINT` autoincrement; `createdAt`/`updatedAt` are present on every table.

### ValidationRuns

One row per run of a process.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key |
| `process_name` | TEXT | The process (`monitoring`, `monitoring_gate`) |
| `status` | TEXT | `started` → `success` \| `failure` (see `VALIDATION_RUN_STATUS`) |
| `started_at` | TIMESTAMPTZ | When the run began (row committed before work starts) |
| `completed_at` | TIMESTAMPTZ | When the run finished; NULL while `started` |
| `stats_upserted` | INTEGER | Rows upserted by steps that report a count (time series) |
| `observation_count` | INTEGER | `ValidationRecords` rows written by this run |
| `alert_count` | INTEGER | `ValidationAlerts` rows written by this run |
| `error` | TEXT | Truncated error message on failure |

Index on `(process_name, started_at)`.

### ValidationTimeSeries

Long/narrow aggregated statistics, progressively upserted across runs (not tied to a single run).

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key |
| `feature_set` | TEXT | Group of related stats (e.g. `monitoring_reviews`) |
| `period_type` | TEXT | `week` \| `month` |
| `period_start` | DATE | Start of the bucket |
| `region_id` | INTEGER | Region slice; `0` = not applicable/unknown |
| `geo_id` | INTEGER | Geographic-region slice; `0` = not applicable/unknown |
| `stat_name` | TEXT | The specific statistic (e.g. `reviews_created`) |
| `value` | DECIMAL | The value |

Unique index on `(feature_set, period_type, period_start, region_id, geo_id, stat_name)` — the upsert key. `region_id`/`geo_id` use `0` rather than NULL because NULLs don't compare equal in a unique constraint.

### ValidationRecords

Per-entity observations for a run.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key |
| `run_id` | BIGINT | FK to `ValidationRuns` |
| `entity_type` | TEXT | Polymorphic entity table name (e.g. `MonitoringFindings`) |
| `entity_id` | INTEGER | The entity's id |
| `observation_name` | TEXT | What is being observed (e.g. `finding_count`) |
| `scalar` | DECIMAL | Continuous measurement; NULL for categorical |
| `category` | TEXT | Categorization; NULL for scalar |

Index on `(entity_type, observation_name)`.

### ValidationAlerts

Alerts raised by checks. Holds only the latest run per process.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Primary key |
| `run_id` | BIGINT | FK to `ValidationRuns` |
| `check_name` | TEXT | The check that fired (e.g. `open_ar_findings_gone`) |
| `message` | TEXT | Human-readable summary (rendered into Slack) |
| `severity` | TEXT | `alert` \| `critical` (default `alert`; see `VALIDATION_ALERT_SEVERITY`) |
| `context` | JSONB | Generic per-check detail (thresholds, sample entity ids, previous values) |

Indexes on `(check_name)` and `(run_id, severity)`.

## Conventions

- **Column naming**: snake_case (e.g., `process_name`, `feature_set`) on data columns, matching the fact-table style; Sequelize's `createdAt`/`updatedAt` are kept as-is.
- **Timezone**: each run sets `SET LOCAL TIME ZONE 'UTC'` inside its transaction, matching HSES's interpretation of the imported data.
- **Run context via temp table**: steps read the current `run_id` from the `validation_run` temp table (`CROSS JOIN validation_run`) rather than interpolating it into every statement.
- **Source-truth deletes**: checks read `sourceDeletedAt` (the upstream signal) directly, not the local `deletedAt`, so they are correct regardless of whether the monitoring maintenance job (which propagates `sourceDeletedAt` into `deletedAt`) has run yet. A row is "live" only when both are NULL.
- **Minimum-denominator guards**: every gate check requires a floor number of rows before it can fire, and compares fractions with multiplication (`gone > 0.5 * total`), never division, so the guard can never divide by zero.
- **Alert vs. record retention**: a run deletes its process's prior alerts first, so `ValidationAlerts` holds only the latest run per process. `ValidationRecords` retains the current and immediately previous run (for run-over-run comparison); older observations are deleted.
- **Thresholds are illustrative**: the numbers in the skeleton checks are placeholders meant to be tuned against a prod-copy dry run.

## Running manually

```bash
yarn cli:validate-monitoring-data          # observational: time series + observations + alerts
yarn cli:validate-monitoring-gate          # pre-refresh gate; exit 1 on any critical
yarn cli:check-monitoring-validation-ran   # watchdog
```

Because every step is plain SQL keyed off the `validation_run` temp table, an individual check's SQL can be pulled from its module and run by hand in psql against a prod-copy database for threshold tuning.

## Extending

- **New statistic**: add an `INSERT … ON CONFLICT` for a new `feature_set`/`stat_name` in `monitoringTimeSeries.ts`. No schema change — the table is long/narrow.
- **New observation**: add an INSERT into `ValidationRecords` in `monitoringObservations.ts` with a new `observation_name`.
- **New alert**: add an INSERT into `ValidationAlerts` in `monitoringAlerts.ts` (observational) or `monitoringGateChecks.ts` (gate — set `severity` and include a min-denominator guard).
- **New process**: call `runValidation` with a new `VALIDATION_PROCESS` value and its own steps; add a CLI and, if it should pause the pipeline, have that CLI act on `criticalCount`.

Split logic that different future consumers will use (e.g. anomaly-detection models reading the time series/observations) into separate step modules rather than one large tool file.

## Future work

- **Statistical anomaly detection**: compare the current period against the trailing distribution in `ValidationTimeSeries` (z-score / % deviation) rather than fixed thresholds — a richer everyday-detection form. Deliberately kept alert-only and out of the critical tier for now.
- **In-refresh gate** (documented, not built): a marked point in `src/tools/updateMonitoringFactTables.ts` (just before the "Primary Entity Table Upserts") where the staged temp tables exist but the live fact tables have not yet been overwritten — so a check could diff the new import against last-good linkage and, being inside one transaction, get true rollback for free by throwing on `criticalCount > 0`.
- **Retention/archival**: `ValidationRecords` keeps only the current + previous run today; a fuller strategy is future work.

## Source Code

- **Runner**: `src/tools/validation/runValidation.ts`
- **Observational**: `src/tools/validateMonitoringData.ts`, `src/tools/validateMonitoringDataCLI.ts`, and the steps `src/tools/validation/monitoringTimeSeries.ts`, `monitoringObservations.ts`, `monitoringAlerts.ts`
- **Gate**: `src/tools/validateMonitoringGate.ts`, `src/tools/validateMonitoringGateCLI.ts`, `src/tools/validation/monitoringGateChecks.ts`
- **Watchdog**: `src/tools/checkMonitoringValidationRan.ts`, `src/tools/checkMonitoringValidationRanCLI.ts`
- **Models**: `src/models/validationRun.js`, `src/models/validationTimeSeries.js`, `src/models/validationRecord.js`, `src/models/validationAlert.js`
- **Constants**: `VALIDATION_PROCESS`, `VALIDATION_RUN_STATUS`, `VALIDATION_ALERT_SEVERITY` in `src/constants.js`
- **Migration**: `src/migrations/20260714120000-create_validation_tables.js`
- **CI**: `.circleci/config.yml` (import phases), `.circleci/scripts/build_import_summary.sh` (Slack summary)
</content>
