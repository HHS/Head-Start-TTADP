# 0029. Maintain a Release Inventory and Reconcile It Against the Tagged Baseline

## Status

Proposed

## Context

A March 30, 2026 configuration management audit found no way to prove the release baseline excludes undocumented items.

CircleCI already produces substantial release provenance: an annotated `prod-<commitShortSha>` tag, and a `release-manifest.json` and `build-checksums.txt` attached to the GitHub Release, recording the commit, tag, pipeline URL, deployed application and bound services, migration outcome, and SHA256 hashes of the build directory, both lockfiles, `manifest.yml`, and the environment deployment config.

That evidence proves integrity and origin, not exclusion. All of it is *observed* — what the pipeline built and deployed, including the `apps` block, which is itself templated from the same values that render `manifest.yml` rather than an independent check. None of it is a declared, authorized reference set to diff against. The gap is widest at the platform layer: `manifest.yml` declares the intended cloud.gov shape (one application per environment, the `cflinuxfs4` stack, the Node.js buildpack, `web` and `worker` processes, and three bound services), but nothing verifies afterward that the running space still matches it. A hand-bound service, an extra route, or an additional application would not appear in any current release artifact — precisely the undocumented item risk the audit identified.

ADR 0027 already established a security findings register (`security/` — committed JSON, repository-owned Node.js tooling, CI validation) with a disposition vocabulary this control should reuse rather than inventing a second one. ADR 0027 is Proposed but already implemented, so Proposed status doesn't block this decision either, provided its disposition model stays stable.

## Decision

We will maintain a declared release inventory in the repository and reconcile it against the tagged release baseline in CI and during each audit.

### Declared inventory

Lives at `release/inventory.json`, with a schema at `release/inventorySchema.json`. Dispositions (below) have their own schema at `release/inventoryDispositionsSchema.json`. New inventory artifacts use camelCase names, unlike the hyphenated names under `security/`.

The inventory covers component classes at two different levels of observability, and the ADR treats them differently rather than implying uniform machine reconciliation:

Machine reconciled classes, where an observed value can be captured and diffed automatically:

- applications and processes: the `tta-smarthub-((env))` application and its `web` and `worker` processes
- bound services: the database, Redis, and document upload services declared in `manifest.yml`
- routes bound to the application in each space
- configuration artifacts: `manifest.yml` and each file under `deployment_config/`
- dependency boundary: `yarn.lock` and `frontend/yarn.lock`
- platform and runtime: the `cflinuxfs4` stack, the Node version pinned in `.nvmrc`, and the base image in `Dockerfile`

The platform and runtime class is machine reconciled because `.nvmrc` and `Dockerfile` are repository files that can be read and compared exactly the way `manifest.yml` is, and the stack is reported by the platform. This also keeps the class consistent with the pull request gate below, which triggers on changes to those same files. The Node.js buildpack is the one component in this class that cannot be pinned or compared reliably, and it is handled as a known gap in the next section.

Declaration only classes, where no automated observation exists and review is periodic rather than continuous:

- external integrations: the boundary systems reached from the deployed application, including HSES authentication and data file retrieval, ClamAV scanning through `CLAMAV_ENDPOINT`, ITAMS over SFTP, Smartsheet, SMTP mail delivery, and New Relic, cross referenced against `docs/boundary_diagram.md`

External integrations cannot be observed from a build or from the platform API. The closest available signal is the presence of a configuration variable, which proves neither that the integration is reachable nor that an undeclared one is absent. Treating that signal as reconciliation would claim coverage this control does not have, which is a worse audit position than scoping the class honestly.

Each entry carries a stable id, component class, description, owner, locator/hash, and an authorization reference (an ADR, JIRA issue, or ATO artifact) — the reference is what makes this audit evidence rather than a list. The inventory is parameterized by environment the same way `manifest.yml` is; automated reconciliation against the live space targets production only, since that's the environment inside the ATO boundary.

### The buildpack reference is a known gap, not a satisfied entry

`manifest.yml` points the buildpack at an untagged git URL, so the staged version can drift without any repository change. The inventory entry records the version cloud.gov reports for the current droplet — an observation, not a pinned control. A follow-on ticket will track pinning it; until then this is a documented limitation in the audit evidence, not a resolved one.

### Dependencies are declared as a boundary, not as entries

Declaring thousands of individual packages by hand would go stale on every dependency update and make the gate fail for reasons unrelated to the control. `yarn.lock` and `frontend/yarn.lock` are the declared boundary instead: each repository-file entry records its expected SHA-256 in `release/inventory.json`, reconciliation compares that declaration with the file observed in the checkout or release tag, and the report retains the observed hash as audit evidence. A generated CycloneDX SBOM is attached to each release for the full resolved list. Dependency vulnerability disposition remains ADR 0027's, not this one's.

### Reconciliation tooling

`tools/releaseInventory.js` exposes two yarn scripts:

- `release:inventory:generate` — derives the observed inventory for machine-reconciled classes from a checkout, no build required
- `release:inventory:verify` — diffs observed against declared, writes `inventoryReconciliation.json`

Both `release/inventory.json` and `release/inventoryDispositions.json` are validated against their committed JSON Schemas before reconciliation runs. A structurally invalid file is reported as a finding and reconciliation does not proceed against it, rather than letting a malformed entry silently drop out of comparison.

Four result sets: **matched**; **mismatch** (identity matched, but a field the inventory claims to control — a repository file's SHA-256, a process's instance count, a service's plan, or the buildpack version — disagrees with what was observed); **undocumented** (observed but not declared); **missing** (declared but not observed, subject to the eventual-consistency handling below). Mismatch, undocumented, and missing all fail the gate once enforcement reaches blocking mode, since an empty set across all three is the direct, positive answer to the audit finding. Route destinations are deliberately excluded from mismatch comparison, because remapping the primary hostname to the maintenance page during incident response is a legitimate operational state, not drift.

Repository-side verification is fully reproducible from a tag alone: `release:inventory:verify --tag prod-<commitShortSha>` returns the same result at any later date, which is what makes comparison against the tagged baseline a procedure an auditor can run themselves rather than a manual review. The command resolves the supplied ref to one commit before reading any files and stops with a hard error if that commit is unavailable, so an unfetched or mistyped tag cannot be recorded as repository drift.

### Live space reconciliation is a point-in-time attestation, not a replayable command

Because platform drift is least observable from repository files, the production deploy job additionally reconciles the live cloud.gov space — applications, bound services, routes, process types — against the declared inventory immediately after deployment. Unlike repository-side verification, this can't be reproduced later: running it again next month compares an old declared inventory against *today's* live space, not the space as it existed at release time. The result captured immediately after deployment is retained as that release's audit record, the same way `release-manifest.json` already is.

This check records component names, types, and identifiers only — never credentials, bound service parameters, or other operational detail, since the GitHub Release it attaches to is public.

### Enforcement

Enforcement is phased, and the phasing is part of the decision:

1. On adoption, both checks run and record results, including on production deploy, but don't fail the pipeline. The first live reconciliation is expected to surface real drift that needs a governance decision before it can block a deploy.
2. Once a production run shows empty mismatch, undocumented, and missing sets, repository-side reconciliation becomes blocking on the production deploy.
3. Live space reconciliation becomes blocking once the same is true for it, and once retry/settle handling is in place to absorb rolling-deploy eventual consistency.
4. Once blocking, PRs touching `manifest.yml`, any file under `deployment_config/`, either lockfile, `.nvmrc`, or `Dockerfile` run repository-side reconciliation and fail on undeclared components, so inventory updates travel with the change that needs them. PRs touching none of those paths don't run the gate.

Cloud.gov's rolling deploy means its API can lag a completed deploy; a component reported missing immediately after deploy is rechecked after a short settle window before it's treated as a real finding.

### Dispositions

Recorded in `release/inventoryDispositions.json`, using ADR 0027's `resolved`/`accepted`/`deferred` vocabulary and structured approval evidence (approver role, named approver, approval date, decision text). Without this path, the only response to legitimate drift would be reverting the triggering change, which pushes teams to work around the control.

`release:inventory:verify` flags any active disposition whose `closureTarget` has passed in its output, without failing the build, so a lapsed closure date surfaces on every run instead of depending on someone tracking it by hand.

### Evidence

`release-manifest.json` gains an `inventory` section — declared inventory hash, reconciliation outcome, per-class counts — bumping its `schemaVersion` from 1 to 2. Each production tag's GitHub Release carries `release/inventory.json` as it existed at that tag, `inventoryReconciliation.json`, and the generated SBOM, alongside the existing manifest and checksum evidence.

### Items not covered

This doesn't replace `release-manifest.json` (build provenance) or `docs/boundary_diagram.md` (system boundary, though external-integration entries reference it). It doesn't cover dependency vulnerability findings (ADR 0027) or ClamAV runtime detections (operational events).

### Alternatives considered

- **Treat the existing release manifest as the inventory.** Cheapest, no new tooling — but a derived artifact can't demonstrate exclusion of undocumented items without an authorized reference set to compare against.
- **External CMDB or spreadsheet.** Moves the control outside the repository, breaks reproducibility from a release tag, and repeats the evidence-location problem ADR 0026 avoided for SAST evidence.
- **Full transitive dependency inventory declared by hand.** Most literal coverage, but unmaintainable at this dependency count and would break existing dependency automation.
- **GitHub's native dependency graph.** Covers dependencies only, not platform or integration components, and would make a GitHub-specific feature the only evidence path.

## Consequences

Auditors will be able to resolve any production release tag to a declared inventory, an observed inventory, and a reconciliation result, and reproduce the repository side themselves from the tag. The live-space portion is a record captured at release time, not something replayable later. The assertion that the baseline excludes undocumented items becomes a testable claim for the classes this control can observe, rather than a review judgment.

Changes to the deployed shape of the system — a new bound service, a Node version change, a new external integration, a new deployment config file — now require a matching inventory update in the same pull request. That's the intended cost of the control, scoped to the specific paths that define the deployed shape so it doesn't affect everyday application work.

The first live space reconciliation is expected to surface real drift. Because `manifest.yml` declares no routes today, enumerating and authorizing current production routes is expected to be the first piece of it, and that work should be scoped into the rollout rather than treated as a surprise. Existing undeclared components will need either an authorization reference or removal before that phase can be promoted to blocking.

The unpinned buildpack reference is recorded as a known limitation, not a satisfied control, until its follow-on ticket closes.

Live space reconciliation lengthens the production pipeline — no new credential dependency, since it reuses the deploy job's already-authenticated cloud.gov session, but the extra API calls and settle window add time — and introduces a new post-deploy failure mode. That failure mode follows the existing pattern for after-deploy evidence failures: alert `acf-head-start-alerts` and remediate the release record from retained artifacts, rather than treating the deploy itself as failed.

Because dispositions reuse the ADR 0027 model, this control inherits that ADR's approval expectations and its review and expiration semantics. If ADR 0027 changes materially before this decision is acted on, this decision should be revisited.

The engineering process and infrastructure guides need updates so the inventory step appears in the documented workflow and the verification procedure is discoverable outside this ADR. The machine-reconciled classes are already checked on every branch build and every production deploy, so the monthly cadence ADR 0027 established applies more narrowly here than a full register re-audit: it covers the declaration-only external-integration entries, which have no automated check, and any open dispositions, which `release:inventory:verify` already flags when overdue.
