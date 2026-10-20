# 0026. Add Semgrep SAST Baseline Control

## Status

Proposed

## Context

During a configuration management audit performed on March 30, 2026, no evidence verifiable from The TTA Hub repository showed that a dedicated static application security testing (SAST) control had been run for the baseline.

The TTA Hub repository already contained adjacent security controls:

- Biome linting for static code quality checks
- Yarn audit for dependency vulnerability checks
- OWASP ZAP in CircleCI for dynamic application scanning

Those controls do not satisfy the missing requirement on their own:

- linting is not a dedicated SAST control
- dependency audit is software composition analysis (SCA)
- ZAP is dynamic application security testing (DAST)

The missing control must be reproducible from the repository, run in the same CI system that already enforces the rest of the build gates, and keep an auditable baseline with explicit finding dispositions.

The repository also already has a Semgrep GitHub app installation available, but this ticket is intentionally scoped to a CircleCI-only control and an evidence path owned in the repository. Relying on app configuration or UI retention alone would not fully address the audit gap.

## Decision

We will add a dedicated SAST control in CircleCI using Semgrep Community Edition.

The implementation stores its control definition and evidence in the repository:

- `security/sast/scan-config.json`
- `security/sast/baseline.json`
- `security/sast/dispositions.json`

CircleCI runs the dedicated SAST job in the pinned Semgrep container image `semgrep/semgrep:1.163.0`, stores SARIF, JSON, and text artifacts under `reports/semgrep`, and then compares the current results against the committed baseline and dispositions using repository-owned Node.js tooling.

The initial control uses the Semgrep Registry `p/default` ruleset with scan scope and exclusions defined in the repository. The gate blocks only net new findings with Semgrep severity `ERROR`. Baseline findings are allowed only when they have a committed disposition. Findings marked `fixed` must not still appear in the active scan. Baseline generation and CI validation both fail if Semgrep reports scan errors or skipped paths, so incomplete scans cannot be retained as authoritative evidence.

Finding identity is based on a stable match key that does not include line numbers. Duplicate matches are sorted by a stable locator before occurrence numbering is assigned, which avoids baseline churn when Semgrep returns otherwise identical matches in a different order. When refreshing the baseline, existing disposition records are merged by finding identity so previously reviewed rationale, ownership, and approval data are preserved.

Baseline refresh always runs a fresh scan before writing the committed baseline and records provenance including the git HEAD SHA, the hash of the committed scan configuration, and git worktree fingerprints that indicate whether the scan came from a dirty checkout. The committed baseline keeps only hashes and counts for local untracked content, while the richer path-level detail remains limited to the ephemeral CI artifact provenance. That prevents a new baseline from being generated silently from stale scan output, reduces unnecessary local filename exposure in repository history, and keeps the audit trail tied to the scanned repository state.

We chose Semgrep over alternatives such as SonarQube, Checkmarx, and CodeQL for The TTA Hub because:

- it fits the existing CircleCI enforcement model without requiring a separate platform to become the control plane
- it can run locally and in CI with the same committed configuration
- it can emit JSON and SARIF directly for artifact retention
- it is simpler to roll out as a repository owned control than SonarQube or Checkmarx, which would add more platform dependency and operational overhead
- it avoids making GitHub-specific integration, such as CodeQL or the existing Semgrep app, the only evidence path for this ticket

We are intentionally not using the Semgrep GitHub app as part of the authoritative control for this ticket. If we later want PR annotations or centralized triage in the app, that should be added in a later integration using the same repository owned rules and evidence model.

## Consequences

This adds another CI job and increases scan time modestly.

The team must maintain three committed artifacts:

- the scan configuration
- the baseline scan snapshot
- the disposition log for unresolved baseline findings

Because Semgrep Registry rulesets evolve over time, the committed baseline and disposition comparison logic become the stability mechanism for this change. The control remains reproducible because the CLI version is pinned and the scan invocation is defined in the repository, but the team should expect periodic baseline review as Semgrep community rules change.

This design improves auditability because the scanner configuration, baseline, and dispositions can all be verified directly from The TTA Hub repository history.
