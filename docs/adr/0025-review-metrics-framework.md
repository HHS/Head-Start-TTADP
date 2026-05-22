# 0025. GitHub Actions Code Review Metrics Framework

## Status

Accepted

## Context

The team needed visibility into code review health — reviewer count per PR, first-review turnaround, workload distribution, and reviewer engagement. The existing `pr-review-sla-slack.yml` focuses on alerting but does not collect historical data. No application-layer reporting was appropriate.

Requirements: no application/database dependency, auditable human-readable output, consistent with existing workflow patterns.

## Decision

We implemented three GitHub Actions workflows that are observational and do not modify application state, databases, or repository contents. Two of them (`pr-review-metrics.yml` and `pr-quality-checks.yml`) do create or update pull request comments in GitHub to present their findings.

### Workflow 1: Per-PR Metrics Comment (`pr-review-metrics.yml`)

Triggered on PR close. Posts a comment summarizing: PR disposition, unique human reviewer count, first-review turnaround (time from opened/ready-for-review to first review), and full review timeline. Bot accounts and the PR author are excluded from counts.

### Workflow 2: Aggregate Report (`review-metrics-report.yml`)

Triggered on-demand via `workflow_dispatch` with inputs `lookback_days` (default 30) and `max_prs` (default 200). Generates a Markdown report uploaded as a 90-day artifact containing: summary statistics, reviewer leaderboard, weekly turnaround trend, and zero-review PRs list.

### Workflow 3: PR Quality Advisory Comments (`pr-quality-checks.yml`)

Triggered on PR open/push/reopen and review submission. Posts a sticky comment per check, edited in-place on subsequent triggers. Both checks skip PRs targeting `production` and always pass green (advisory only).

- **Diff size** — warns if `additions + deletions ≥ 500`
- **Review count** — shows current approval count vs. 2-reviewer guideline

Comment upsert uses HTML markers (`<!-- pr-quality-diff-size -->`, `<!-- pr-quality-review-count -->`) to find and update existing comments.

### Production Branch Exclusion

All three workflows skip PRs targeting the `production` branch. Per-PR workflows use a job-level `if` condition; the aggregate report filters them during iteration. Production merges are release promotions and not subject to review-process metrics.

### Design Decisions

| Choice | Rationale |
|--------|-----------|
| `actions/github-script@v7` | Consistent with existing workflows; no checkout required |
| File write from script | Avoids heredoc escaping issues with special characters |
| Wall-clock turnaround | Simpler than business-hours for initial version |
| 90-day artifact retention | Balances auditability with storage limits |
| Advisory comments over failing checks | Visible guidance without blocking merge; branch protection remains single source of truth |
| Comment upsert with HTML marker | One comment per check per PR; edits in-place on each push/review |

## Consequences

**Easier:**
- Per-PR review history visible in comment thread
- On-demand aggregate health reports
- Additive — no existing workflows modified
- No feature flag required — activates on merge
- Quality comments update in-place (no spam)

**Limitations:**
- Wall-clock turnaround only (no weekends/holidays)
- API rate limits cap aggregate report at ~200 PRs by default
- Per-PR comment posted at close time only (use aggregate report for historical data)
