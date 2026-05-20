# 0025. GitHub Actions Code Review Metrics Framework

## Status

Accepted

## Context

The team needed visibility into code review health — specifically: how many reviewers participate on each PR, how long it takes for a first review after a PR is opened, how review workload is distributed across contributors, and which contributors are most active as reviewers. These metrics help identify bottlenecks, prevent review load concentration, and provide recognition for review work.

The existing tooling (`pr-review-sla-slack.yml`) focuses on alerting for overdue reviews but does not collect or surface historical data. No application-layer or database reporting was available or appropriate for this use case.

The framework needed to:
- Operate without any application or database dependency
- Be safely toggleable to avoid unintended side effects during validation
- Generate auditable, human-readable output
- Follow the patterns already established in the repository's GitHub Actions workflows

## Decision

We implemented a two-workflow GitHub Actions framework, gated behind a repository variable (`ENABLE_REVIEW_METRICS`), that is entirely read-only and observe-only.

### Workflow 1: Per-PR Metrics Comment (`pr-review-metrics.yml`)

Triggered when a PR is closed (merged or unmerged). Posts a comment on the PR summarizing:

- PR disposition (merged vs. closed)
- Number of unique human reviewers
- First-review turnaround (time from PR opened/ready-for-review to first review submission)
- Full review timeline (ordered list of review events with timestamps)

Bot accounts are excluded from all reviewer counts (accounts ending in `[bot]` and known automation accounts: dependabot, github-actions, copilot, renovate, snyk-bot). The PR author is also excluded from reviewer counts on their own PR.

### Workflow 2: Aggregate Report (`review-metrics-report.yml`)

Triggered on-demand via `workflow_dispatch` with two optional inputs:

- `lookback_days` (default: 30) — how far back to scan closed PRs
- `max_prs` (default: 200) — safety cap on GitHub API calls

Generates a Markdown report and uploads it as a 90-day workflow artifact containing:

- **Summary statistics** — total PRs, review participation rate, total review events, unique reviewers, average and median first-review turnaround
- **Reviewer leaderboard** — contributors ranked by reviews submitted, with their share of total reviews
- **Weekly turnaround trend** — average and median first-review turnaround per ISO week
- **Zero-review PRs** — list of PRs that closed without any human reviews

### Design Decisions

| Choice | Rationale |
|--------|-----------|
| `actions/github-script@v7` | Consistent with existing SLA workflow; no extra checkout required |
| Repo variable gate | Matches `ENABLE_PR_REVIEW_SLA_ALERTS` pattern; easy to enable/disable without code changes |
| Write file from within script | Avoids shell heredoc escaping issues with special characters in report content |
| Wall-clock turnaround | Simpler and less error-prone than business-hours calculation for initial version; business-hours logic can be added later by borrowing from `pr-review-sla-slack.yml` |
| Artifact retention 90 days | Balances auditability with GitHub storage limits |

## Consequences

**Easier:**
- Team members can see per-PR review participation history in the PR comment thread
- Engineering leads can generate point-in-time review health reports on demand
- The framework is additive — no existing workflows are modified
- The observe-only posture means no risk of unwanted label mutations or notifications during the pilot

**Harder / Limitations:**
- Turnaround uses wall-clock time; does not account for weekends, holidays, or time zones
- GitHub API rate limits cap the aggregate report at ~200 PRs by default; repos with very high PR volume may need to reduce the lookback window or increase the cap carefully
- The `ready_for_review` timeline event is only available via the issues timeline API; if that call fails, the workflow falls back to `created_at` gracefully
- Per-PR comment is posted at close time only; there is no retroactive report for historical PRs (use the aggregate report for that)
