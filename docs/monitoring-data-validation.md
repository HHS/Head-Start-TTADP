# Monitoring Data Validation

> **Audience**: Developers working on the IT-AMS monitoring import and its data quality.

## Purpose

The monitoring data validation system surfaces unexpected conditions in the Monitoring data imported from IT-AMS early to minimize time to coordinate a fix. Validation process actions take two forms: a **gating** run of lightweight threshold checks that can throw critical validation failures when we're confident that updating with the new data would do more harm than holding over the previous day's data, and a **post-refresh** run that records a wider variety of statistics and per-entity observations, then raises validation alerts to Slack.

## Naming

- **`Monitoring*`** tables are raw IT-AMS import data.
- **`Validation*`** tables are the derived validation infrastructure documented here.

## Architecture

The system is a small, uniform hierarchy of four concepts:

```
Process  (monitoring_post_refresh | monitoring_gate)   a named validation workflow
  └─ Run  (one execution; a row in ValidationRuns)
        ├─ Step 1 ─┐
        ├─ Step 2  ├─ run in order in ONE transaction; each INSERTs into
        └─ Step N ─┘   ValidationTimeSeries / ValidationRecords / ValidationAlerts
        └─▶ Result  (counts, incl. criticalCount) ──▶ caller decides whether to act
```

- **Process** — a named validation workflow (`ValidationRuns.process_name`; values in `VALIDATION_PROCESS`). Two exist today: `monitoring_post_refresh` (post-refresh, non-blocking) and `monitoring_gate` (the pre-refresh gate). A process is defined by an ordered list of steps and owns its own retention — each of its runs clears the process's prior alerts, and observation records are kept only for the current and previous cycle (see the cycle description below and the retention convention).
- **Run** — one execution of a process, recorded as a row in `ValidationRuns`. The row is written and committed as `started` *before* any work begins, so a watchdog can later distinguish "never ran" from "started but crashed" (a row stuck at `started`). When the run finishes it is updated to `success` (with counts) or `failure` (with an error). Every run is stamped with the **cycle** it validated (below); a run with no identifiable data version is rejected.
- **Step** — the unit of work inside a run (`ValidationStep`). A step is a function handed the run's transaction; it reads whatever tables it needs and INSERTs its own output — time-series rows, observations, or alerts. All of a run's steps execute in order inside one transaction, because a later step may build on a temp table or rows an earlier one produced; they are not parallelized. Each step is plain SQL, so it can be lifted out and run by hand in psql.
- **Result** — what a completed run hands back to whatever launched it (`RunValidationResult`): the run id, the counts, and the alert rows, including how many were `critical`. It is a report, not a decision. The run itself never blocks anything.

Cutting across those is the **cycle** — the version of imported data a run saw, recorded on each run as `import_id` + `source_updated_at` (see [ValidationRuns](#validationruns)). The two processes run at different pipeline stages — `monitoring_gate` before the refresh, `monitoring_post_refresh` after — as separate runs with separate `run_id`s; the cycle is what ties them together. Both resolve the same cycle for a given import, so their observations and alerts bucket by data *version* rather than by run, and a same-day re-import is distinguished by a new `import_id`. `getMonitoringImportCycle` (`src/tools/validation/monitoringImportCycle.ts`) resolves it to the latest `PROCESSED` monitoring `ImportFile`.

### The runner

Tying those together is **the runner**, `runValidation` (`src/tools/validation/runValidation.ts`) — the single seam every process goes through. Given a `processName` and its ordered `steps`, it:

1. creates and commits the `ValidationRun` row (`started`), stamped with the required cycle identifier(s) the caller resolved;
2. opens one transaction — attributes any audited writes to the process, sets UTC, publishes the run id in an `ON COMMIT DROP` temp table (`validation_run`) that steps `CROSS JOIN` instead of interpolating the id into every statement, then runs each step in order;
3. reads back the run's counts, marks it `success`, and emits one greppable summary line for the reporting chain;
4. returns the result. On error it marks the run `failure`, emits a failure line, and rethrows.

Crucially, **the runner never acts on a result.** It counts criticals and returns them; the *caller* decides what a critical means. That one separation is what lets identical machinery serve the post-refresh run (caller ignores the count), the pre-refresh gate (caller exits nonzero to pause the pipeline), and a possible future in-refresh gate (caller throws inside the refresh transaction). Who acts, and how, is the only thing that varies between forms.

## Sequencing in the import pipeline

The two processes are wired in as phases of the daily import cron in `.circleci/config.yml`. The phase loop **breaks on the first failing phase** — that is the mechanism the gate relies on:

```
download
  -> process
  -> validate_monitoring_gate     <-- gate process; a nonzero exit stops the process chain before fact table refresh
  -> update_fact_tables
  -> create_monitoring_goals
  -> maintain_monitoring_data
  -> validate_monitoring_data     <-- post-refresh process; never pauses the import
  -> report_updates
```

The gate sits between `process` and `update_fact_tables`, so pausing there holds the refresh and every phase after it, leaving the previous day's data live. The post-refresh process runs late, after the refresh, and only records and alerts.

## The post-refresh process

`monitoring_post_refresh` (`src/tools/validateMonitoringData.ts`) runs three steps through the runner. It records a run, raises alerts, and builds the baseline for future modeling, but never pauses the import. Its steps run in sequence, each feeding the next:

**Step 1 — `monitoringObservations.ts` → `ValidationRecords`.** Rebuilds one row per entity per observation (scalars in `scalar`, categories in `category`). Runs first so later steps can build on the observations. **Every observation is recorded for every entity it applies to, whether or not the value is alert-worthy** — the on-time reviews and the `consistent` findings are stored alongside the outliers. The current threshold alerts are only a filtered view over these rows; consumers are not expected to stay limited to that, so the full distribution is kept so later work (e.g. anomaly-detection models needing means, quantiles, or z-scores) has the complete data, not just the flagged entities. Observations also let a human drill from an aggregate alert down to the specific entities behind it.

| Observation (`observation_name`) | Entity | Kind | Meaning |
|---|---|---|---|
| `category` | `MonitoringFindings` | category | Finding's calculated category (`source`, falling back to standard `guidance`); NULL flags a categoryless finding. |
| `delivery_report_lag_days` | `MonitoringReviews` | scalar | Days between a review's `reportDeliveryDate` and when that date first appeared in the imported data (from `ZALMonitoringReviews` audit rows). |
| `finding_count` | `MonitoringReviews` | scalar | Distinct findings linked to the review. |
| `closure_state` | `MonitoringFindings` | category | `active_with_closed_date` when an Active finding carries a `closedDate`, else `consistent`. |

**Step 2 — `monitoringTimeSeries.ts` → `ValidationTimeSeries`.** Upserts long/narrow aggregated statistics describing monitoring activity. As of MVP, the full range since `TIME_SERIES_START` (`2025-01-01`) is recomputed every run: the upsert key makes it idempotent, and it self-corrects late-arriving source data (IT-AMS can source-update old records, which shifts historical buckets since stats bucket on source activity). This is simple but its cost grows with the full history — a bounded/incremental recompute is [future work](#future-work). Each stat is built into a temp table, upserted, then **reconciled**: keys in the recomputed range that the temp table no longer produces are deleted, so a period/region whose source records were all invalidated upstream doesn't leave a stale value behind (an upsert alone never removes rows). Shared intermediates (e.g. `finding_deliveries`) are built as temp tables for reuse by later stats, and a stat can also aggregate the per-entity observations from Step 1.

| Stat (`feature_set` / `stat_name`) | Grain | Notes |
|---|---|---|
| `monitoring_reviews` / `reviews_created` | weekly, per region/geo | Bucketed on `MonitoringReviews.sourceCreatedAt` (upstream activity), not `createdAt` (our import time), so backfills don't register as spikes. A review spanning regions counts once per region slice. |
| `monitoring_findings` / `findings_delivered` | monthly, per region/geo **and national** | Distinct findings by first delivery date (earliest delivered review via `MonitoringFindingHistories`). A finding on grants in multiple regions is counted in each region slice, so per-region rows **must not be summed** for a national figure; a `region_id = 0` (geo `0`) row carries the deduplicated national count instead. |

**Step 3 — `monitoringAlerts.ts` → `ValidationAlerts`.** Raises alerts from threshold checks over the time series and validity checks over the observations, both produced earlier in the same run. Threshold checks look at **complete** periods only (the current partial week/month would always false-alarm). Every alert here is severity `alert`.

| Check (`check_name`) | Fires when |
|---|---|
| `reviews_created_region_zero` | A region created zero reviews over the last four complete weeks, *and* the cross-region four-week average exceeds 5 (so quiet seasons don't false-alarm). The region universe comes from `Grants`, so a region with no time-series rows still counts as zero. |
| `findings_delivered_month_spike` | The last complete month delivered more than 50% as many findings as the entire twelve months before it. Reads the national `region_id = 0` rows, not a sum across regions. |
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

A raised alert reaches people through one chain, and the decision to block the fact-table refresh is a separate, caller-side step.

**The reporting chain.** Durable diagnostics ride the runner's single greppable `console.info` line — `Monitoring Gate: {…}` or `Monitoring Validation Alerts: {…}`, carrying the run's counts and alert rows as JSON — **not** the alert table. (Riding the log line is deliberate: a future in-transaction gate can throw and roll back, losing its alert rows, yet still explain *why* it blocked.) From there: CI captures each phase's output to a per-phase log → `.circleci/scripts/build_import_summary.sh` parses those lines into a summary — always appending the gate's result last, so a critical is in the summary regardless of the run's outcome → `notify_slack` posts the summary to the configured channel.

**Acting on the result.** `severity` is what separates a condition that merely needs attention from one that should block the fact-table refresh. The runner only *counts* criticals; each caller decides what to do with the count:

| Caller | On `criticalCount > 0` |
|---|---|
| `validateMonitoringDataCLI` | Nothing — post-refresh, non-blocking, exits 0 |
| `validateMonitoringGateCLI` | Exits nonzero **for criticals the halt policy has opted in** (see Enforcement controls), and for execution errors while enforcing → the phase loop breaks before `update_fact_tables`, leaving the prior fact tables live |
| Future in-refresh check | Would `throw` inside `updateMonitoringFactTables`' transaction → rollback for free |

**Enforcement controls.** The gate defaults to **report-only**: a critical is recorded and logged, but the fact-table refresh still proceeds, so the checks can be validated against real production data before they are trusted to block anything. Which criticals actually block is a caller-side policy in `resolveGateHalt` (`src/tools/validation/gateHaltPolicy.ts`), driven by the `MONITORING_GATE_HALT_CHECKS` env var read by `validateMonitoringGateCLI`:

| `MONITORING_GATE_HALT_CHECKS` | Effect |
|---|---|
| unset / empty / `none` | Report-only (the default) — no critical blocks the refresh |
| `all` | Every critical blocks (also if `all` appears anywhere in a list) |
| `check_a,check_b` | Only those `check_name`s block — lets the gate be switched on one check at a time |

A gate **execution error** (DB blip, bad SQL, timeout) is not a detected critical, so it follows the same policy: it fails closed (exits nonzero, halting the import before `update_fact_tables`) only when enforcement is configured; in report-only mode the CLI exits 0, so a transient gate error can't halt the pipeline while the gate is still being trialed against real data, before its checks are trusted to block.

Because report-only is the default, enabling enforcement needs no code change. Like `ENABLE_MONITORING_GOAL_CREATION`, `MONITORING_GATE_HALT_CHECKS` is declared in `manifest.yml` and set per environment in `deployment_config/<env>_vars.yml` (the `PROD_GATE_HALT_CHECKS` / `DEV_GATE_HALT_CHECKS` / `STAGING_GATE_HALT_CHECKS` CircleCI vars) — set one to e.g. `findings_mass_source_deletion` for a single check, or `all`. Keeping the decision in the CLI — not in the runner or the checks — is what lets the same checks feed both the report-only observation and the enforced gate.

**Channels.** The routine summary, with all alerts including criticals, always goes to a base channel chosen by environment. The OHS contractor–customer channel receives the **same** summary only when it is explicitly enabled:

| Destination | Gets | When |
|---|---|---|
| `acf-head-start-alerts` (prod) / `acf-head-start-alerts-lower` (staging/dev) | the routine import/validation summary, including every critical (report-only or blocking) | always |
| `acf-ohs-ttahub--contractor-customer-team` | a mirror of that same summary | only while `OHS_MONITORING_ALERTS_ENABLED` is truthy |

`OHS_MONITORING_ALERTS_ENABLED` is a single on/off switch for the whole validation system's access to the OHS contractor–customer channel; it defaults **off**, so nothing reaches that channel and all output stays in the internal `acf-head-start-alerts` / `-lower` channel. It pairs with `MONITORING_GATE_HALT_CHECKS` (which governs whether a critical blocks the refresh) — two independent switches: one controls *what blocks*, the other controls *who is told*.

How it is wired:

- The base channel is the `run_import_job` / `run_validation_watchdog` `slack_channel` param (`acf-head-start-alerts` for the prod cron, `acf-head-start-alerts-lower` for manual/lower runs).
- `build_import_summary.sh` appends the gate's result to every summary — success, a gate block, or an unrelated later-phase failure — so a critical always reaches the channel, not only the `Monitoring Gate: {…}` log line. The critical data condition is the headline; whether it blocked the refresh is a clause on it. The benign "no critical / no result" confirmations appear only on success, so a failure unrelated to data isn't given confusing validation commentary.
- The `notify_slack` command posts to the base channel and, when its `ohs_channel` param is non-empty **and** `OHS_MONITORING_ALERTS_ENABLED` is truthy, mirrors the same message there. `ohs_channel` is only passed by the prod workflow invocations, so a lower environment can never reach the contractor channel even if the env var were set — two independent guards.

**The watchdog.** `checkMonitoringValidationRan.ts` (`cli:check-monitoring-validation-ran`) runs on a **separate** schedule a few hours after the import cron, so it can catch the case where the validation — or the whole cron — never fired. It resolves the current [cycle](#architecture) (`getMonitoringImportCycle`) and looks for a `monitoring_post_refresh` run for that cycle's `import_id`, reporting `ok`, `run failed`, `run incomplete` (stuck at `started`), or `no validation run for the current import cycle`. A day with no new processed import stays `ok` (nothing new to validate). This is why the run row is committed as `started` before any work.

## Tables

All four tables are created by migration `20260831120000-create_validation_tables.js`. Ids are `INTEGER` autoincrement; `createdAt`/`updatedAt` are present on every table.

### ValidationRuns

One row per run of a process.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Primary key |
| `process_name` | TEXT | The process (`monitoring_post_refresh`, `monitoring_gate`) |
| `status` | TEXT | `started` → `success` \| `failure` (see `VALIDATION_RUN_STATUS`) |
| `started_at` | TIMESTAMPTZ | When the run began (row committed before work starts) |
| `import_id` | INTEGER | The [cycle](#architecture)'s import: a soft reference (non-unique, no FK) to the `ImportFiles` row this run validated. Runs of one cycle share it; NULL when not tied to an import (e.g. future application-data validation) |
| `source_updated_at` | TIMESTAMPTZ | The cycle's source data date (`ImportFiles.ftpFileInfo.date`, the value the import writes to the raw rows' `sourceUpdatedAt`) |
| `completed_at` | TIMESTAMPTZ | When the run finished; NULL while `started` |
| `stats_upserted` | INTEGER | Rows upserted by steps that report a count (time series) |
| `observation_count` | INTEGER | `ValidationRecords` rows written by this run |
| `alert_count` | INTEGER | `ValidationAlerts` rows written by this run |
| `error` | TEXT | Truncated error message on failure |

Indexes on `(process_name, started_at)` and `(import_id)` (non-unique — runs of one cycle share a value, so any integer id can be stored).

### ValidationTimeSeries

Long/narrow aggregated statistics, progressively upserted across runs (not tied to a single run).

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Primary key |
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
| `id` | INTEGER | Primary key |
| `run_id` | INTEGER | FK to `ValidationRuns` |
| `entity_type` | TEXT | Polymorphic entity table name (e.g. `MonitoringFindings`) |
| `entity_id` | INTEGER | The entity's id |
| `observation_name` | TEXT | What is being observed (e.g. `finding_count`) |
| `scalar` | DECIMAL | Continuous measurement; NULL for categorical |
| `category` | TEXT | Categorization; NULL for scalar |

Indexes on `(entity_type, observation_name)` and `(run_id, observation_name)` — the latter for the `run_id`-first retention, count, and alert-generation filters (the FK is not auto-indexed).

### ValidationAlerts

Alerts raised by checks. Holds only the latest run per process.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Primary key |
| `run_id` | INTEGER | FK to `ValidationRuns` |
| `check_name` | TEXT | The check that fired (e.g. `open_ar_findings_gone`) |
| `message` | TEXT | Human-readable summary (rendered into Slack) |
| `severity` | TEXT | `alert` \| `critical` (default `alert`; see `VALIDATION_ALERT_SEVERITY`) |
| `context` | JSONB | Generic per-check detail (thresholds, sample entity ids, previous values) |

Indexes on `(check_name)` and `(run_id, severity)`.

## Conventions

- **Column naming**: snake_case (e.g., `process_name`, `feature_set`) on data columns, matching the fact-table style; Sequelize's `createdAt`/`updatedAt` are kept as-is.
- **Timezone**: each run sets `SET LOCAL TIME ZONE 'UTC'` inside its transaction, matching HSES's interpretation of the imported data.
- **Run context via temp table**: steps read the current `run_id` and the severity constants (`critical` / `alert`) from the `validation_run` temp table (`CROSS JOIN validation_run`) rather than interpolating them into every statement, which would complicate manual running during investigations.
- **Source-truth deletes**: checks read `sourceDeletedAt` (the upstream signal) directly, not the local `deletedAt`, so they are correct regardless of whether the monitoring maintenance job (which propagates `sourceDeletedAt` into `deletedAt`) has run yet. A row is "live" only when both are NULL.
- **Minimum-denominator guards**: every gate check requires a floor number of rows before it can fire, and compares fractions with multiplication (`gone > 0.5 * total`), never division, so the guard can never divide by zero.
- **Cycle-aware retention**: a run deletes its process's prior alerts first, so `ValidationAlerts` holds only the latest run per process. `ValidationRecords` keeps the current run and the latest run of the previous *cycle* (a different `import_id` / data version), so comparison is always against a different version of the data rather than a re-run over the same data; re-running a process on the same cycle therefore replaces that cycle's prior records instead of accumulating, and older cycles roll off.
- **Thresholds**: the numbers in the checks are a subject of ongoing development and tuning.

## Running manually

```bash
yarn cli:validate-monitoring-data          # post-refresh: time series + observations + alerts
yarn cli:validate-monitoring-gate          # pre-refresh gate; exit 1 on any critical
yarn cli:check-monitoring-validation-ran   # watchdog
```

Because every step is plain SQL keyed off the `validation_run` temp table, an individual check's SQL can be pulled from its module and run by hand in psql against a prod-copy database for threshold tuning.

### Exercising the full pipeline on a lower environment (CircleCI)

The import (which runs the validation) and the watchdog are both manual pipelines gated on `pipeline.trigger_source == "api"`, so they run from CircleCI's **Trigger Pipeline** button (which sets `trigger_source = api`). Run them in order — the watchdog only reports green once the validation has run for the current import cycle:

1. **Import + validation.** Trigger Pipeline → set `action = import_data` and `target_env` to a lower env (`dev-blue`/`dev-green`/`dev-red`/`dev-gold`/`dev-pink` or `staging`). This runs `run_import_job` on that env: it downloads/refreshes the ITAMS monitoring data and runs `cli:validate-monitoring-gate` then `cli:validate-monitoring-data` (time series + observations + alerts) for the latest import cycle. Results post to `acf-head-start-alerts-lower`.
2. **Watchdog.** Trigger Pipeline → set `action = validation_watchdog` and the **same** `target_env`. This runs `cli:check-monitoring-validation-ran` on that env and confirms a successful validation run exists for that import cycle. Result posts to `acf-head-start-alerts-lower`.

Before step 1, that env has no run for the new cycle, so running the watchdog first correctly reports *"no validation run for the current import cycle."* Equivalently, either pipeline can be triggered through the CircleCI API v2 `pipeline` endpoint with the same `action`/`target_env` parameters.

## Extending

- **New statistic**: add an `INSERT … ON CONFLICT` for a new `feature_set`/`stat_name` in `monitoringTimeSeries.ts`. No schema change — the table is long/narrow.
- **New observation**: add an INSERT into `ValidationRecords` in `monitoringObservations.ts` with a new `observation_name`.
- **New alert**: add an INSERT into `ValidationAlerts` in `monitoringAlerts.ts` (post-refresh) or `monitoringGateChecks.ts` (gate — set `severity` and include a min-denominator guard).
- **New process**: call `runValidation` with a new `VALIDATION_PROCESS` value, its own steps, and a resolved cycle (`import_id` and/or `source_updated_at` — a run must be attributable to a data version); add a CLI and, if it should pause the pipeline, have that CLI act on `criticalCount`.

Split logic that different future consumers will use (e.g. anomaly-detection models reading the time series/observations) into separate step modules rather than one large tool file.

## Future work

- **Statistical anomaly detection**: compare the current period against the trailing distribution in `ValidationTimeSeries` (z-score / % deviation) rather than fixed thresholds — a richer everyday-detection form. Deliberately kept alert-only and out of the critical tier for now.
- **In-refresh gate** (documented, not built): a marked point in `src/tools/updateMonitoringFactTables.ts` (just before the "Primary Entity Table Upserts") where the staged temp tables exist but the live fact tables have not yet been overwritten — so a check could diff the new import against last-good linkage and, being inside one transaction, get true rollback for free by throwing on `criticalCount > 0`.
- **Incremental time-series recompute**: as of MVP, `monitoringTimeSeries` recomputes the full range since `TIME_SERIES_START` every run — simple and self-correcting for late source updates, but its cost grows with the full history. The endstate is likely a bounded trailing-window recompute plus a periodic full backfill.
- **Retention/archival**: `ValidationRecords` keeps only the current + previous cycle today; a fuller strategy is future work.
- **Slack payload correctness test**: these notifications embed arbitrary message text — including double quotes, newlines, and backslashes (e.g. the watchdog logs raw JSON, and gate/validation messages are multi-line) — into a JSON request body, and there is currently no automated check that the assembled payload is actually valid JSON that preserves the message verbatim. A malformed payload silently fails the Slack request. The intent is a regression test that drives the real notification path with a battery of adversarial messages and asserts each produces a valid payload whose text round-trips exactly, independent of how the payload happens to be assembled. The payload is currently built in more than one place (`bin/notify-slack.sh` and an inline copy in the CircleCI `notify_slack` command), so collapsing those to a single path would make such a test cover everything at once.

## Example Slack notifications

What `build_import_summary.sh` posts in the main scenarios (the ``` are literal — Slack renders them as code fences). Criticals always appear; benign gate confirmations only on success.

**Successful import** — new goals, plus a report-only critical that did not block:

~~~
Monitoring Updates: ```
New Goals: Example Recipient Alpha (Region 1)
```
Monitoring Validation Alerts (as of 2026-08-29 06:00 EDT): ```
Region 5 created no monitoring reviews in the last four complete weeks
```
Monitoring Gate Criticals (as of 2026-08-29 06:00 EDT) - did not block the fact-table refresh: ```
52.0% of monitoring findings from the last year have no live row (900 of 1730)
```
~~~

**Gate block** — a halt-listed critical stopped the refresh; the condition is the headline, the block a clause:

~~~
Monitoring Gate Criticals (as of 2026-08-29 06:00 EDT) - blocked the fact-table refresh: ```
52.0% of monitoring findings from the last year have no live row (900 of 1730)
```
~~~

**Report-only critical, but a later phase failed** — the failure and the (non-blocking) critical are both surfaced:

~~~
Monitoring job failure: ```
Error: fact-table refresh failed
```
Monitoring Gate Criticals (as of 2026-08-29 06:00 EDT) - did not block the fact-table refresh: ```
52.0% of monitoring findings from the last year have no live row (900 of 1730)
```
~~~

**Gate did not complete** — a gate check errored, so it validated nothing. In report-only mode this still exits 0 and the import succeeds, so it is surfaced either way rather than reported as "no critical findings":

~~~
Monitoring Gate: did not complete, data was not validated (as of 2026-08-29 06:00 EDT)
~~~

**Failure unrelated to data** — no validation commentary, so nothing implies the failure was validation-related:

~~~
Monitoring job failure: ```
Error: downstream system unavailable
```
~~~

## Source Code

- **Runner**: `src/tools/validation/runValidation.ts`
- **Cycle resolver**: `src/tools/validation/monitoringImportCycle.ts`
- **Post-refresh**: `src/tools/validateMonitoringData.ts`, `src/tools/validateMonitoringDataCLI.ts`, and the steps `src/tools/validation/monitoringTimeSeries.ts`, `monitoringObservations.ts`, `monitoringAlerts.ts`
- **Gate**: `src/tools/validateMonitoringGate.ts`, `src/tools/validateMonitoringGateCLI.ts`, `src/tools/validation/monitoringGateChecks.ts`
- **Watchdog**: `src/tools/checkMonitoringValidationRan.ts`, `src/tools/checkMonitoringValidationRanCLI.ts`
- **Models**: `src/models/validationRun.js`, `src/models/validationTimeSeries.js`, `src/models/validationRecord.js`, `src/models/validationAlert.js`
- **Constants**: `VALIDATION_PROCESS`, `VALIDATION_RUN_STATUS`, `VALIDATION_ALERT_SEVERITY` in `src/constants.js`
- **Migration**: `src/migrations/20260831120000-create_validation_tables.js`
- **CI**: `.circleci/config.yml` (import phases), `.circleci/scripts/build_import_summary.sh` (Slack summary)
</content>
