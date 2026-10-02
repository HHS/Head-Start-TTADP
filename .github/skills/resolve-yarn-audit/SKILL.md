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

1. Reproduce findings with `yarn deps:audit` from the repository root; this validates both backend and frontend. If a backend failure prevents the frontend audit from running, run `../tools/run-yarn-audit.js` from `frontend/` to collect its findings too. Inspect raw `yarn audit --level low --json --groups dependencies` output in the relevant package root when needed to see all advisory paths and patched ranges. Raw Yarn audit can exit nonzero for findings already accepted by the repository wrapper.
2. Run `yarn why <package>` in each affected package root and inspect its installed parent package manifests to identify consumers and their declared version ranges. Verify the advisory and candidate release using current upstream release notes or registry metadata.
3. Prefer a targeted direct dependency update when it provides a compatible fix with limited dependency churn. For a transitive vulnerability, use a Yarn `resolutions` entry when it can select a patched release compatible with affected consumers and avoids an unnecessary parent upgrade. Consider the effect on every consumer covered by the resolution.
4. Prefer a compatible patch release when sufficient. Do not force a version outside a consumer's declared range without investigating API, runtime, and engine compatibility. If the only available fix requires broad changes, explain the tradeoff and obtain scope clarification before expanding the repair.

For example, a parent requesting `@grpc/grpc-js` through `^1.13.2` can accept `1.14.5`. Verify the actual current parent range and advisory before applying that example.

## Apply and verify

- Edit each affected manifest, including its `resolutions` when appropriate, and run the repository's Yarn version in that package root to regenerate its lockfile. A root resolution does not fix the frontend's separate dependency graph. Do not hand-edit integrity hashes or delete lockfiles to obtain a fix.
- Inspect both manifest and lockfile diffs. Investigate unrelated dependency churn and limit changes to the reported findings and dependencies needed to resolve them.
- Leave `yarn-audit-known-issues` files unchanged. Adding a reported vulnerability to an ignore list is not a fix; the wrapper's printed baseline-update command is informational.
- Verify the installed patched version through the affected parent, including nested copies where relevant. Check the parent's semver range and perform an appropriate module-load or focused integration check.
- Run `yarn deps:audit` from the repository root after the fixes to validate both backend and frontend. Confirm both audits ran and passed.
- Confirm the underlying audit actually reached the registry and returned valid results. This wrapper can interpret empty or error-only audit output as no findings; a network failure is not evidence of a clean audit.
- Run `yarn lint` in each affected package root (repository root for backend, `frontend/` for frontend), `git diff --check`, and a frozen-lockfile install in each affected package root. For a dependency-only change without lifecycle requirements, `yarn install --frozen-lockfile --ignore-scripts --non-interactive` checks reproducibility; it does not validate lifecycle scripts. Use offline mode only when the required artifacts are cached.
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
