---
name: resolve-yarn-audit
description: Resolve Yarn audit findings with compatible dependency updates or resolutions, validate the fix, and prepare a branch, commit, push, and template-based PR.
---

# Resolve Yarn audit findings

Fix the dependency vulnerabilities with the smallest compatible changes. Use the current audit and dependency graphs; do not hardcode package versions, ticket numbers, or branch names from a previous repair.

## Establish scope

- Inspect the working tree and current branch. Preserve unrelated work and stage only task files.
- Read root `package.json` and `yarn.lock`, `frontend/package.json` and `frontend/yarn.lock`, `tools/run-yarn-audit.js`, and any audit output supplied by the user. The root manifest and lockfile control backend dependencies; the frontend manifest and lockfile control frontend dependencies. Identify which dependency graph contains each finding; the same package may need separate fixes in both.
- Use the user's specified branch name and Jira issue when provided. Ask only for missing information that blocks the requested delivery; dependency investigation can proceed while those details are pending.

## Identify a safe fix

1. Reproduce findings with `yarn deps:audit` from the repository root; this validates both backend and frontend. If a backend failure prevents the frontend audit from running, run `../tools/run-yarn-audit.js` from `frontend/` to collect its findings too. For every reported finding, inspect raw `yarn npm audit --recursive --environment production --no-deprecations --severity low --json` output in the relevant package root and match the exact GHSA ID, package, installed version(s) (`Tree Versions`), and dependents before selecting a fix. The wrapper reports one line per GHSA ID, package, and installed version. Raw `yarn npm audit` exits nonzero for findings already accepted by the repository wrapper.
2. Run `yarn why <package>` in each affected package root and inspect its installed parent package manifests to identify consumers and their declared version ranges. Verify the advisory and candidate release using current upstream release notes or registry metadata. Read the release notes between the installed and candidate versions for breaking changes, deprecations, and engine requirement changes.
3. Prefer a targeted direct dependency update when it provides a compatible fix with limited dependency churn. For a transitive vulnerability, use a Yarn `resolutions` entry when it can select a patched release compatible with affected consumers and avoids an unnecessary parent upgrade. Consider the effect on every consumer covered by the resolution.
4. Prefer a compatible patch release when sufficient. Do not force a version outside a consumer's declared range without investigating API, runtime, and engine compatibility. If the only available fix requires broad changes, explain the tradeoff and obtain scope clarification before expanding the repair. A major-version update of a direct dependency is a breaking change by default. Follow the major-update guidance in `docs/guides/dev-setup.md`, and get scope confirmation before making it.


## Apply and verify

- Edit each affected manifest, including its `resolutions` when appropriate, and run `yarn install` (Yarn 4, selected by `.yarnrc.yml`) in that package root to regenerate its lockfile. Yarn 4 does not support `**/` glob resolutions; use `parent/child` or a bare package name. A root resolution does not fix the frontend's separate dependency graph. Do not hand-edit integrity hashes or delete lockfiles to obtain a fix.
- Inspect both manifest and lockfile diffs. Investigate unrelated dependency churn and limit changes to the reported findings and dependencies needed to resolve them.
- Do not add findings to `yarn-audit-known-issues`. Adding a vulnerability to an ignore list is not a fix. The audit wrapper keys exceptions by GHSA ID (or npm advisory ID when there is no GHSA), package, and installed version, so each JSONL line covers exactly one advisory. After a repair, confirm that exact advisory ID is absent for the affected package/version, then delete only that advisory's JSONL line and preserve unrelated exceptions. Never regenerate the file with the wrapper's printed baseline command; it would also accept every other current advisory. After changing an exception, run `yarn security:sca:baseline` and `yarn security:sca:pending` so the SCA baselines and pending observations match.
- Verify the installed patched version through the affected parent, including nested copies where relevant. Check the parent's semver range and perform an appropriate module-load or focused integration check.
- Run `yarn deps:audit` from the repository root after the fixes to validate both backend and frontend. Confirm both audits ran and passed. In raw audit output, confirm the exact targeted advisory ID no longer affects the package version(s)/paths found before the fix; do not rely on the wrapper summary alone.
- Confirm the underlying audit actually reached the registry and returned valid results. The wrapper fails when `yarn npm audit` exits nonzero without advisory output or prints unparseable output, but a passing run is only meaningful if the audit reached the registry.
- Run `yarn lint` in each affected package root (repository root for backend, `frontend/` for frontend), `git diff --check`, and an immutable install in each affected package root. For a dependency-only change without lifecycle requirements, `yarn install --immutable --mode=skip-build` checks reproducibility; it does not validate lifecycle scripts. Frontend installs need `FONTAWESOME_NPM_AUTH_TOKEN` set.
- Assess whether existing backend and frontend tests sufficiently cover the application's use of each changed dependency, considering its role and compatibility risk. Run the relevant tests. If coverage is insufficient and a meaningful unit test is feasible, add and run a focused regression test that exercises the affected behavior through the real dependency. Avoid tests that only assert a package version or mock away the updated behavior. If a unit test is impractical, explain the remaining coverage gap in the session recap.
- Report the coverage assessment and test results without claiming they prove the absence of all regressions. Explain any omitted full application suite and distinguish local checks from CI results.

Report remaining known exceptions separately from new findings. If a registry failure or incompatible dependency blocks validation, state the blocker rather than claiming success or suppressing the finding.

## Deliver the requested PR

Perform these steps when the user requests a branch, commit, push, and PR. Existing explicit authorization is sufficient; do not ask for it again. If the request is only for a local fix or review, leave the work local. Some of the following steps depend on the GH CLI. If this is not present, skip the steps and inform the user accordingly.

1. Once the fix is validated, create the exact requested branch. Check the intended base and existing branch state first; do not overwrite a branch or carry unrelated commits into the PR. 
2. Stage only the repair, review the staged diff, and commit with the supplied Jira key and a concise description. Honor repository hooks and inspect any changes they make.
3. If a specific Jira key is not provided, use TTAHUB-4915. This is the epic for tracking dependency vulnerability fixes.
4. Push the branch with upstream tracking. Do not force-push or merge as part of this workflow.
5. Read the current `.github/pull_request_template.md` and use its sections for the PR body. Describe the vulnerability, selected fix, and compatibility rationale briefly. Fill in the real Jira link; mark checklist items complete only when supported by evidence.
6. Create a draft PR against the intended base using structured arguments or a temporary body file with `gh pr create --body-file`. Preserve actual newlines. If a push or PR creation times out, inspect remote state before retrying to avoid duplicate actions.
7. Return the PR link, branch, commit, concise validation results, and any remaining limitations. 
