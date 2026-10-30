# 0031. Automate the production pull request with Credal generated content

## Status

Proposed

## Related Issue

[TTAHUB-5814](https://jira.acf.gov/browse/TTAHUB-5814)

## Summary

On each push to `main`, a GitHub Actions workflow creates or updates the single draft pull request from `main` to `production`. An ACF hosted Credal agent writes the title, the description of change, the how to test text, and the Jira issue list from the release's merged pull requests. Scripts in this repository validate everything Credal returns, fill in the checklist from the actual diff, and write the result with the GitHub CLI.

The design notes, and the review findings that shaped them, are in [productionPrAutomationPlan.md](../productionPrAutomationPlan.md).

## Context

### Current State

Someone writes each production pull request by hand. They read the commits in `origin/production..origin/main`, find the merged pull request and Jira ticket behind each one, summarize the changes, and fill in the template. This is slow, and the quality varies from release to release.

The Jira list matters beyond documentation. When a production pull request moves out of draft, `pr-notifications.yml` posts to Slack and sends every ticket in the Jira Issue(s) section to the Jira transition webhook. A ticket left out of that section is never transitioned, and a wrong ticket is transitioned by mistake.

### Constraints

- The production pull request is the document a reviewer reads before approving a production deploy, so its content has to be trustworthy.
- The `ready_for_review` transition is the intentional trigger for the Slack and Jira automation, so the pull request must always be created as a draft.
- Every item in the Production Deploy checklist section records an action a person actually performed, such as the staging smoke test or adding a reviewer.
- Deploys run on CircleCI when `production` is updated. This decision does not change that.

### Options Considered

1. Keep writing production pull requests by hand.
2. Generate everything with rules only, for example by joining the merged pull request titles. This adds no external dependency, but the titles and release notes read poorly across unrelated changes.
3. Call a model API directly from CI. This would need an API credential owned by the team, which the team did not have at the time.
4. Use the Credal agent for the summarizing work and keep every other decision in deterministic code.

## Decision

Adopt option 4. The details that matter:

**Trigger and permissions.** The workflow `production-pr.yml` runs on every push to `main` and on `workflow_dispatch`, which accepts a `dry_run` input that defaults to true. A push always writes for real. Runs are serialized by a concurrency group. The workflow uses the default `GITHUB_TOKEN` with `contents: read` and `pull-requests: write`.

**Code location.** Plain JavaScript in the top level `tools/` directory, like the other scripts that GitHub Actions and CircleCI run directly, so no backend build is needed. `tools/productionPrCLI.js` is the entry point.

**What Credal writes.** Only the title, the description of change, the how to test text, and the Jira issue list. The how to test text defaults to a fixed sentence. The agent prompt lives in Credal, and `docs/credalProductionPrPrompt.md` is a reference copy.

**Credal output is untrusted.** The script reads the reply from `message`, not `structuredOutput`, and validates it before anything is written:

- The title starts with `[Prod]` and fits the length limit.
- The description and the how to test text cannot contain a `##` heading, because an injected heading could pass fake tickets to the Slack and Jira extractor. They also cannot contain a managed section marker, because an echoed marker would break the section boundary on the next update.
- Every line of the issues field is a bare Jira link, and the set of tickets must match the tickets the release's pull requests declare. A pull request declares a ticket in its title, as a link in its Jira Issue(s) section, or on a standalone `Jira:` line, which is how Dependabot pull requests do it. A ticket mentioned only in the body text, such as follow up work, is not declared. An omitted ticket, an invented ticket, and the `TTAHUB-0` placeholder are all rejected.
- An empty issues field is accepted only when the release declares no tickets. Without that rule, a release made up only of ticketless commits could never be written.

Any validation, network, or status failure fails the run and writes nothing. Retries cover only timeouts, network errors, and 429 or 5xx responses.

**Checklist.** The script computes it, not Credal, from the files changed between the two branches. The covered items are recomputed on every run and overwrite their current value, including a manual change, so they stay accurate as more work lands on `main`. The Production Deploy and After merge/deploy sections are never touched, and the code enforces this by section boundary.

**Body updates.** The three generated sections sit between HTML comment markers. An existing pull request without markers is matched by heading and gets markers on its first update. The script rereads the live pull request just before writing and stops if it is no longer open. New text is inserted verbatim. `pr-notifications.yml` now drops HTML comment lines before it builds the Slack message.

**Credentials.** The `CREDAL_API_KEY_ACF` Actions secret holds the key. The `PRODUCTION_PR_CREDAL_USER_EMAIL` Actions variable names the caller to Credal.

## Consequences

### Easier

- Production pull requests have a consistent shape, and the Jira list matches the release scope instead of depending on whoever wrote it.
- The checklist stays in step with the diff as the release grows.
- Nobody has to rewrite the description when another pull request merges into `main`.

### More difficult or riskier

- Updates now depend on Credal. During an outage the run fails, and the production pull request keeps its last content until someone edits it by hand or reruns the workflow.
- Merged pull request titles and bodies leave the repository and go to Credal. No data from the deployed application or its database is involved. The integration runs in CI and does not change the deployed system, so `release/inventory.json` and the boundary diagram are unchanged. Reviewers should confirm that reading.
- The GitHub CLI has no compare and swap for pull request bodies. A person who edits the pull request in the moment between the final read and the write can lose that edit. The window is small and the risk is accepted.
- A person who changes a checklist box covered by the rules will find it reset on the next run. This is accepted deliberately, because the script cannot tell a deliberate override from a stale default.
- The agent prompt is configured in Credal, outside this repository, so the reference copy in `docs/` must be kept in sync by hand.
- Push runs write for real from the first merge. After that, the only controls are fixing forward in a pull request or disabling the workflow in the repository's Actions settings.
- The caller email identifies one account in Credal. A shared service account is preferable to a personal address.
