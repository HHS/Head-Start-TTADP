# 0030. Adopt Yarn 4 for JavaScript package management

## Status

Proposed

## Urgency

Medium — The current Yarn Classic-based audit integration is coupled to a legacy output format and known-issues workflow, contributing to recurring CI disruption and audit-maintenance work.

## Related Issue

[TTAHUB-2782](https://jira.acf.gov/browse/TTAHUB-2782)

## Summary

TTA Hub will migrate from Yarn Classic 1.22.22 to Yarn 4. This change reduces dependency on a maintenance-mode package manager while requiring fewer simultaneous changes than switching to npm. Yarn 4 preserves the existing dependency-override model and Yarn command structure, lowering migration risk.

## Context

### Current State

TTA Hub currently uses Yarn Classic 1.22.22 to manage backend, frontend, and shared package dependencies. Yarn Classic is in maintenance mode, while active feature development, architectural improvements, and most bug fixes occur in Yarn Modern.

Package auditing has created recurring maintenance work. The repository history contains repeated changes to repair, reorder, or refresh Yarn audit output and known-issue files, including changes described as "Fixing yarn audit again," "Rerun yarn audit...," "Remove two lines from yarn audit that cause a failure," and "Mysteriously, update yarn audit." The current security automation parses Yarn Classic's `auditAdvisory` NDJSON output directly, making it sensitive to the behavior and output format of an aging package-manager version.

Dependency auditing has also caused recurring CI disruption. During the 90 days from June 12 through September 10, 2026, CircleCI recorded 427 `build_and_lint` jobs that failed specifically during backend or frontend dependency auditing. These failures occurred on 30 distinct days and affected 92 branches. They accounted for approximately 90 percent of failed `build_and_lint` jobs during that period.

These job failures do not represent 427 distinct vulnerabilities. A single newly published advisory can cause repeated failures across active branches and reruns until a dependency is updated or the finding is added to the known-issues baseline. However, the data demonstrates that audit behavior regularly blocks otherwise unrelated CI runs and creates substantial remediation and baseline-maintenance work.

The current package-management structure introduces additional operational overhead:

- The backend, frontend, and `packages/common` directories have separate package manifests and lockfiles.
- Dependency installation must be performed separately for the backend and frontend.
- The backend and frontend declare 21 of the same dependencies, including 10 with different version ranges.
- The backend and frontend contain a combined 41 `resolutions` entries, many of which were added to remediate vulnerabilities in transitive dependencies.
- Docker installation and cache-recovery scripts depend on Yarn Classic-specific commands and cache paths.
- Security automation parses the output produced by Yarn Classic's `yarn audit`.
- CI, deployment, publishing, and developer scripts use Yarn Classic-specific options such as `--frozen-lockfile`.

Continuing to use Yarn Classic avoids immediate migration work, but retains the audit reliability burden and increases the risk that TTA Hub's package-management tooling will fall behind supported Node.js and JavaScript ecosystem practices.

### Options Considered

We evaluated two primary replacements:

1. Upgrade from Yarn Classic to Yarn 4.
2. Replace Yarn with the version of npm supported by the project's Node.js runtime.

### Comparison

We compared npm and Yarn 4 against the capabilities and migration concerns most relevant to TTA Hub:

| Dimension | npm | Yarn 4 |
| --- | --- | --- |
| Workspaces | Supported | Supported, with additional constraints and focused-install capabilities |
| Reproducible installs | `npm ci` | `yarn install --immutable` |
| Dependency overrides | Uses `overrides`; the 41 existing `resolutions` entries must be translated and validated | Retains `resolutions`; existing entries are largely reusable but must be validated against the regenerated lockfiles |
| Vulnerability auditing | Uses `npm audit`; requires rewriting the Yarn Classic audit parser and reconciling existing baselines | Uses `yarn npm audit`; also requires rewriting the Yarn Classic audit parser and reconciling existing baselines |
| CI, deployment, and publishing scripts | Requires replacing Yarn commands and options throughout the repository | Existing command structure is largely reusable, but Yarn Classic options and publishing commands must be updated |
| Docker installation and cache recovery | Requires new install commands and npm-specific cache handling | Requires updates because Yarn 4 commands and cache layout differ from Yarn Classic |
| Tooling provisioning | Distributed with Node.js | Must be explicitly provisioned and pinned through Corepack or a project-local Yarn release |
| Migration effort and risk | Higher: changes package manager, lockfiles, override syntax, scripts, publishing, and audit integration simultaneously | Lower: preserves Yarn command conventions, `resolutions`, and the option to retain `node_modules` |

### Rationale

Both alternatives meet TTA Hub's core package-management requirements. Yarn 4 is preferred because it removes the risks of continuing with Yarn Classic while requiring fewer simultaneous changes than a switch to npm. In particular, it preserves the existing `resolutions` model and Yarn-oriented command structure. This reduces migration risk, although the audit integration, cache handling, immutable-install options, and publishing commands still require updates.

### What This Migration Enables

Yarn 4 provides a supported foundation for:

- Replacing the Yarn Classic-specific `auditAdvisory` parser with a `yarn npm audit` integration.
- Pinning package-manager tooling through Corepack or a project-local Yarn release.
- Using `yarn install --immutable` for repeatable CI installs.
- Retaining the existing `resolutions` model for transitive dependency overrides.
- Improving workspace and dependency-update automation over time.

These changes do not alter audit enforcement policy on their own. Changes to severity thresholds and the scheduled SCA workflow require separate implementation and validation.

The repository also contains the separately published `@ttahub/common` package. The backend and frontend currently consume a pinned registry release rather than a local workspace reference. Converting this package to a workspace-linked dependency would change what application builds and tests exercise and could allow unpublished source changes to satisfy local builds. That change requires a separate evaluation of package publishing, versioning, and release validation.

## Decision

TTA Hub will migrate from Yarn Classic 1.22.22 to Yarn 4.

The migration will continue using the conventional `node_modules` installation model:

```yaml
nodeLinker: node-modules
```

This preserves the installation layout expected by the application's existing tooling and deployment environment while allowing Yarn 4 to manage dependencies.

### Migration requirements

The migration scope includes the root backend, frontend, `packages/common`, and `ops/terraform/circleci` package roots and their lockfiles. It will pin Yarn through Corepack or a project-local Yarn release where Yarn is executed, regenerate and validate each in-scope lockfile, and update CI, Docker, deployment, cache-recovery, publishing, and audit commands for Yarn 4. This includes the `yarn --cwd ./packages/common publish` workflow. Existing `resolutions` entries will be retained where supported and validated against the regenerated lockfiles.

The migration will not change dependency-audit severity thresholds or the policy for blocking pull requests. Those changes require separate implementation and validation of the scheduled SCA workflow described in [ADR 0027](0027-security-findings-register.md).

## Consequences

Yarn 4 provides a maintained, reproducible package-management toolchain with pinned tooling and immutable installs. It retains the current `resolutions` model and Yarn-oriented commands, reducing the scope of changes compared with a move to npm. The migration also enables replacement of the Yarn Classic-specific audit parser and supports future workspace and dependency-update automation improvements.

The migration requires coordinated updates to the root backend, frontend, `packages/common`, and `ops/terraform/circleci` lockfiles and related CI, Docker, deployment, publishing, and audit tooling. Developers and CI environments must use the pinned Yarn 4 version; stale Yarn Classic installations will not be supported. The audit integration must be validated against Yarn 4 output, and its enforcement policy remains separate work so the migration does not inadvertently reduce security coverage.
