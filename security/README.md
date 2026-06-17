# Security Findings Register

## Status

Proposed design for `TTAHUB-5243`. The common register, scanner-output readers, and CI validation described below are not yet implemented.

This document defines the operating specification for the repository-owned security findings register established by [ADR 0027](../docs/adr/0027-security-findings-register.md).

## Control inventory

| Scan type | Tool | Current control | Proposed register evidence |
| --- | --- | --- | --- |
| SAST | Semgrep | CircleCI `sast_scan`; `security/sast/` baseline and dispositions | Convert existing findings to the common disposition model while preserving Semgrep evidence |
| SCA, backend | Yarn Audit | `tools/run-yarn-audit.js`; root `yarn-audit-known-issues` | Active exception entries for current backend advisories, reconciled against live audit output without breaking dependency automation |
| SCA, frontend | Yarn Audit | `tools/run-yarn-audit.js`; `frontend/yarn-audit-known-issues` | Active exception entries for current frontend advisories, reconciled against live audit output without breaking dependency automation |
| DAST | OWASP ZAP | CircleCI `dynamic_security_scan`; native JSON and HTML artifacts | One register entry for each actual ZAP alert after unstable environment details are removed |
| Malware scanning | ClamAV | Runtime worker scan of uploaded files | Control inventory entry only; detections remain operational events |

`zap.conf` is scanner configuration, not a findings baseline. Its `FAIL`, `WARN`, `IGNORE`, and `OUTOFSCOPE` values define scan behavior. Only alerts emitted by an actual ZAP scan are finding candidates.

SCA is handled slightly differently from SAST and DAST. The SCA register represents the current active exception set, while live `yarn audit` output is the authoritative source for whether an advisory is still present.

## Proposed repository structure

```text
security/
  README.md
  findings/
    register.json
    scan-types.json
  sast/
    baseline.json
    dispositions.json
    scan-config.json
  dependencies/
    backend-baseline.json
    frontend-baseline.json
    pending-observations.json
  dast/
    baseline.json
    scan-config.json
```

`security/findings/register.json` will be the authoritative disposition register. Scanner-specific baseline files will retain the source facts needed to reproduce and compare findings. Native scanner reports and scan provenance will remain CI artifacts.

`security/dependencies/pending-observations.json` will be a machine-managed store for newly observed SCA advisories that are not yet in the active exception register. It will persist `firstSeen`, `lastObserved`, scanner facts, and the current escalation state so the scheduled SCA workflow can apply deterministic business-day SLAs across runs.

The file will be keyed by the same SCA identity used for Yarn Audit register entries:

```json
{
  "items": {
    "SCA-BACKEND-GHSA-w5hq-g745-h8pq-uuid-8.3.2": {
      "id": "SCA-BACKEND-GHSA-w5hq-g745-h8pq-uuid-8.3.2",
      "scanType": "sca",
      "scanner": "yarn-audit",
      "scope": "backend",
      "scannerFindingId": "GHSA-w5hq-g745-h8pq",
      "module": "uuid",
      "affectedVersion": "8.3.2",
      "sourceSeverity": "moderate",
      "severity": "moderate",
      "firstSeen": "2026-06-17",
      "lastObserved": "2026-06-17",
      "escalationState": "warning"
    }
  }
}
```

Required keys for each pending observation are:

| Key | Requirement |
| --- | --- |
| `id` | Stable SCA identity built from workspace, advisory, module, and affected version |
| `scanType` | Must be `sca` |
| `scanner` | Must be `yarn-audit` |
| `scope` | `backend` or `frontend` |
| `scannerFindingId` | GHSA identifier |
| `module` | Vulnerable package name |
| `affectedVersion` | Affected installed version |
| `sourceSeverity` | Live audit severity |
| `severity` | Register severity derived from `scan-types.json` |
| `firstSeen` | First observation date in ISO `YYYY-MM-DD` format |
| `lastObserved` | Most recent observation date in ISO `YYYY-MM-DD` format |
| `escalationState` | `warning`, `escalated`, or `resolved` |

Validator rules for this store:

- the key and nested `id` must match
- `firstSeen` must remain unchanged while the same SCA identity remains pending
- `lastObserved` must update on each scheduled run that still observes the advisory
- an entry must be removed when the advisory disappears from live audit output or is promoted into the active exception register
- duplicate identities must fail validation

## Finding schema

Every scanner finding must include:

| Field | Requirement |
| --- | --- |
| `id` | Stable repository identifier |
| `scanType` | `sast`, `sca`, or `dast` |
| `scanner` | Scanner name |
| `scope` | Application or workspace scope |
| `scannerFindingId` | Native rule, advisory, or plugin identifier |
| `title` | Short finding description |
| `severity` | Common register severity: `info`, `low`, `moderate`, `high`, or `critical` |
| `sourceSeverity` | Severity reported by the scanner |
| `firstDetected` | First authoritative observation date |
| `lastObserved` | Most recent authoritative observation date |
| `disposition` | `resolved`, `accepted`, or `deferred` |
| `justification` | Technical and risk basis for the disposition |
| `owner` | Accountable team or role |
| `ticket` | JIRA ticket containing assessment and approval evidence |
| `approvalEvidence` | Structured reference to the exact approval record when approval is required |

Disposition-specific fields:

| Disposition | Required fields |
| --- | --- |
| `resolved` | `resolvedOn`, `resolutionEvidence`, `approvalEvidence` |
| `accepted` | `acceptanceType`, `reviewBy`, `approvalEvidence` |
| `deferred` | `closureTarget`, `approvalEvidence` |

Allowed `acceptanceType` values will include `risk_accepted`, `false_positive`, and `not_applicable`.

`approvalEvidence` has an exact machine-validated shape:

| Key | Requirement |
| --- | --- |
| `system` | Approval system identifier such as `jira` |
| `reference` | Exact decision record identifier such as a comment or workflow decision ID |
| `url` | Direct URL to the exact approval record |
| `approverName` | Human approver name |
| `approverRole` | Approval role at the time of approval |
| `approvedOn` | Approval date in ISO `YYYY-MM-DD` format |
| `decision` | Short approval comment or decision text proving what was approved |

Severity mapping must be declared per scanner in `security/findings/scan-types.json`, and validation should fail on unknown or unmapped source severities. The initial mappings are:

| Scanner | Source severity | Register severity |
| --- | --- | --- |
| Semgrep | `ERROR` | `high` |
| Semgrep | `WARNING` | `moderate` |
| Semgrep | `INFO` | `info` |
| Yarn Audit | `critical` | `critical` |
| Yarn Audit | `high` | `high` |
| Yarn Audit | `moderate` | `moderate` |
| Yarn Audit | `low` | `low` |
| ZAP | `High` | `high` |
| ZAP | `Medium` | `moderate` |
| ZAP | `Low` | `low` |
| ZAP | `Informational` | `info` |

For SLA calculations, a business day means a calendar weekday in the `America/New_York` timezone. Weekends are excluded. No holiday calendar is applied in the initial implementation.

Approval authority depends on the decision:

| Decision | Minimum approval authority |
| --- | --- |
| `resolved` | TTA Hub Tech Lead or delegate |
| `deferred` | TTA Hub Tech Lead or delegate |
| `accepted` with `false_positive` or `not_applicable` | TTA Hub Tech Lead or delegate |
| `accepted` with `risk_accepted` | System Owner or another formally authorized risk owner |

Example:

```json
{
  "id": "SCA-BACKEND-GHSA-w5hq-g745-h8pq-uuid-8.3.2",
  "scanType": "sca",
  "scanner": "yarn-audit",
  "scope": "backend",
  "scannerFindingId": "GHSA-w5hq-g745-h8pq",
  "title": "uuid missing buffer bounds validation",
  "severity": "moderate",
  "sourceSeverity": "moderate",
  "firstDetected": "2026-04-22",
  "lastObserved": "2026-06-10",
  "disposition": "deferred",
  "justification": "Upgrade is blocked by a transitive dependency.",
  "owner": "TTA Hub AppDev",
  "ticket": "TTAHUB-0000",
  "closureTarget": "2026-08-31",
  "approvalEvidence": {
    "system": "jira",
    "reference": "comment-123456",
    "url": "https://jira.example/browse/TTAHUB-0000?focusedCommentId=123456",
    "approverName": "Jane Doe",
    "approverRole": "TTA Hub Tech Lead",
    "approvedOn": "2026-06-10",
    "decision": "Approved deferral through 2026-08-31."
  }
}
```

The example values are illustrative and are not an approved disposition.

## Finding identity

Stable identity prevents harmless source movement or scanner output ordering from creating false new findings.

| Scanner | Identity components |
| --- | --- |
| Semgrep | Existing generated finding signature |
| Yarn Audit | Workspace + GHSA identifier + module + affected version |
| OWASP ZAP | Plugin identifier + stable route/path + parameter or stable alert locator |

When building a ZAP finding identity, the scanner-output reader must remove environment-specific scheme, hostname, ephemeral ports, query values, and session identifiers. It may retain query parameter names when the parameter identifies the vulnerable input. Distinct routes or parameters must not be merged when they represent materially different exposure.

## Review and approval

Engineering will:

1. Run an authoritative scan and convert its current output into the register finding fields.
2. Assess applicability, exposure, remediation options, and proposed disposition.
3. Group findings only when they share the same technical risk and disposition rationale.
4. Create or update a JIRA ticket containing the grouped finding IDs, proposed disposition, owner, and target date.
5. Obtain approval from the TTA Hub Tech Lead or delegate for resolved findings, deferred remediation plans, and technical false-positive or not-applicable determinations. Obtain approval from the System Owner or another formally authorized risk owner only when risk is being accepted.
6. Add the approval evidence to the register in the same pull request that establishes or changes the disposition.

A JIRA ticket may approve multiple findings. The register must still contain one entry per finding so scanner output can be reconciled without relying on prose or manual interpretation.

`TTA Hub AppDev` may be used as the durable owner. In practice, the linked JIRA ticket should have a current assignee responsible for coordinating the work. `approvalEvidence` is the sole source of truth for approval details and must contain every key listed above.

For the initial register, current unresolved findings may be marked `deferred` when engineering has a credible remediation plan and closure target. They must not be marked `deferred` merely to bypass risk-acceptance approval.

For ongoing SCA operations, newly observed advisories do not require an immediate human disposition in a dependency PR. Review and approval are still required to keep an advisory in the active exception register, but disappearance of an advisory from live audit output should not require a manual register edit for a remediation PR to succeed.

## CI enforcement

The proposed validator will separate documentation enforcement from severity-based deployment policy and will treat SCA differently from SAST and DAST.

SAST and DAST CI will fail when:

- a current finding is absent from the register
- a register entry has an invalid disposition or missing required fields
- a current finding is marked `resolved`
- a baseline scan is incomplete, malformed, or unavailable
- two entries claim the same stable identity
- a disposition is past the configured expiration grace period

SAST and DAST CI will warn when:

- a `closureTarget` or `reviewBy` date is within 14 days
- a previously observed finding is absent and should be reviewed for resolution
- scanner configuration or version changed without a baseline refresh

A finding with a valid `accepted` or `deferred` disposition does not fail solely because it remains present. Separate scanner-specific severity gates may still block deployment.

SCA CI policy:

- dependency-changing pull requests may compare live backend and frontend `yarn audit` output to the active SCA register
- dependency-changing pull requests must not hard-fail solely because a newly published advisory has not yet been dispositioned
- dependency remediation pull requests should be allowed to merge automatically when a previously tracked advisory disappears from live audit output
- the scheduled SCA workflow on the default branch will write or update `security/dependencies/pending-observations.json` when live audit output contains an advisory that is not yet represented in the active SCA register
- the initial implementation will not hard-fail normal PR CI for missing SCA dispositions
- the scheduled SCA workflow will fail when a `high` or `critical` undispositioned advisory remains open for more than 5 business days, measured from `pending-observations.json:firstSeen`
- the scheduled SCA workflow will fail when a `moderate` or `low` undispositioned advisory remains open for more than 20 business days, measured from `pending-observations.json:firstSeen`

This policy is intended to preserve existing Dependabot and dependency-update automation while still surfacing advisory drift for triage.

The validator will warn for 14 days before a due date and allow a 7-calendar-day grace period after the due date before failing CI. The register will still show the finding as overdue during the grace period. The validator must not silently extend dates. Extending a date requires updated justification or re-approval through a pull request.

## Baseline and retention

An authoritative baseline refresh must:

1. Run a fresh, complete scan.
2. Record scanner version, configuration hash, git commit, and generation time.
3. Compare current findings with the prior baseline and register.
4. Preserve existing dispositions and approval evidence by stable identity.
5. Require review for new, changed, or absent findings.

Resolved findings remain in the register with `resolvedOn` and `resolutionEvidence`. They may later be moved to a committed archive under a documented retention policy, but they are not deleted merely because a scanner stops reporting them.

For SCA, disappearance from live audit output is sufficient for a dependency PR to stop treating the advisory as an active exception. The scheduled SCA workflow should remove the corresponding pending-observation entry when the advisory disappears or when the advisory is promoted into the active exception register. A later automated or periodic cleanup step may update history, but remediation PR success must not depend on a manual resolution edit.

Native reports remain CI artifacts. Repository baselines should retain enough selected scanner data to prove what was reviewed without committing secrets, session tokens, uploaded-file details, or other sensitive runtime data.

## Refresh cadence

The planned review cadence is monthly. An out-of-band refresh is required when:

- a significant scanner or ruleset update is intentionally adopted
- a relevant high-impact vulnerability is disclosed
- application or infrastructure changes materially alter scan coverage
- a scan is found to be incomplete or incorrectly configured

Scanner versions should be pinned for reproducibility and updated through an explicit baseline refresh. Pinning does not replace the monthly update process. For DAST, pinning the ZAP image tag or digest and recording scanner provenance are prerequisites to the first baseline scan.

In addition to the monthly review cadence, SCA should run as a scheduled weekday security workflow on the default branch. That workflow is used to detect advisory-feed drift. It should warn on newly observed undispositioned SCA advisories, persist them in `security/dependencies/pending-observations.json`, and then apply the tiered escalation defined in the SCA CI policy section above: `high` and `critical` advisories fail after 5 business days from `firstSeen`, while `moderate` and `low` advisories fail after 20 business days from `firstSeen`. For these thresholds, business days are calendar weekdays in `America/New_York`, excluding weekends only.

## Initial implementation sequence

1. Inventory the current Semgrep baseline findings, 54 at the time this design was drafted, and replace placeholder dispositions through grouped JIRA review.
2. Convert the committed backend and frontend Yarn Audit advisories into register entries.
3. Pin the ZAP image tag or digest and record the scanner provenance that will accompany each DAST baseline.
4. Run an authoritative ZAP scan and convert actual alerts from its JSON output into stable register entries.
5. Add the common register schema and validator with focused unit tests.
6. Seed approved dispositions and closure evidence.
7. Add the machine-managed SCA pending-observations store and its retention rules.
8. Add CI enforcement and artifact provenance.
9. Document ClamAV as a runtime control and confirm its operational evidence owner.
