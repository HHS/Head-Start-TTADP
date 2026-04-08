# Engineering Process

This document describes the expected software engineering process for the Office of Head Start TTA Hub team. It is intended to help engineers understand how work is expected to flow from intake through release, and to provide a single reference point for audits and onboarding.

This guide complements, and does not replace:

- [Contributing Guide](../../CONTRIBUTING.md)
- [Best Practices](../../best_practices.md)
- [Testing Guide](./testing.md)
- [Infrastructure Guide](./infrastructure.md)
- [CircleCI Guide](./circle-ci.md)
- [Architecture Decision Records](../adr)

## Purpose and scope

The team uses a documented, review driven workflow for application changes, infrastructure changes, bug fixes, support requests, and technical investigations. The goals of the process are to:

- maintain traceability from request to release
- require review before merge and before production deployment
- verify behavior through automated and manual checks
- document higher risk system changes

This process applies to normal engineering work in this repository. Some steps are flexible for lower risk work or accelerated production fixes; those exceptions are described below.

## Roles

The following roles are referenced in this guide:

- **Engineer**: implements and tests the change, prepares the PR, addresses feedback, and coordinates follow-up if needed
- **Reviewer**: performs human code review before merge
- **QA**: verifies functional behavior and records pass/fail results in JIRA
- **UI reviewer**: verifies implemented behavior against approved designs when design review is needed
- **System Owner**: approves and merges production releases, unless a formal waiver delegates that responsibility
- **Security stakeholders**: review changes that affect the system boundary, ATO, or require SSPO approval

## Work intake

### Standard intake expectations

Most work should begin with a tracked request and enough detail for an engineer to proceed safely.

- **Feature work**: requires a JIRA ticket with acceptance criteria and links to relevant UI designs; the work is expected to have been refined during story refinement
- **Bugs and support requests**: typically require a JIRA ticket
- **Spikes**: may be tracked as investigation work when the outcome is learning or scoping rather than direct delivery
- **Small maintenance work**: some documentation updates, pipeline changes, and other minor DevOps tasks may not have a dedicated ticket; the team is moving toward linking these items to an epic when a dedicated ticket is not created

### Ready-for-development guidance

Work is generally considered ready when:

- the objective is clear
- acceptance criteria are available for delivery work
- design references are linked for UI changes
- any known system boundary, security, or production impact concerns are identified early

If these inputs are missing, the engineer should seek clarification before implementation.

## Standard workflow

### 1. Start from tracked work

Engineers normally begin from a JIRA ticket or other traceable request. Branches are created from `main`.

### 2. Implement and self-check

The engineer implements the change and performs the expected local and CI checks for the type of work being performed.

Expected engineering practices include:

- following existing patterns and project guidance in [best_practices.md](../../best_practices.md)
- adding or updating automated tests for behavior changes
- maintaining test coverage expectations
- updating architecture or system documentation when the nature of the change requires it

### 3. Open a pull request

The engineer opens a PR for review. Automated review tooling may provide early feedback, but automated comments do not replace required human review.

Each PR should include:

- a description of the change
- how the change was tested
- a link to the associated JIRA issue when one exists
- any required follow-up notes, risks, or deployment considerations

### 4. Human review

At least one human reviewer approval is required before merge. Reviewer feedback must be addressed before the change proceeds.

### 5. QA review

After engineering review passes, the work moves to QA review in JIRA. QA verifies the change locally or in a non-production deployed environment and records pass/fail results in the ticket.

If QA fails the change, engineering addresses the issue and resubmits for validation.

### 6. UI/design review

For work with design implications, UI review compares the implementation to the approved Figma design and expected behavior.

If UI review fails, engineering addresses the issue and resubmits for validation.

### 7. Merge to `main`

Once required reviews pass, the PR is placed into the merge queue for merge to `main`.

### 8. Prepare production release

After merge to `main`, the engineer who merged the work checks whether a production PR from `main` to `production` already exists. If not, that engineer opens a draft production PR.

The production PR follows the steps documented in the repository PR template and associated deployment process.

## Required controls and evidence

The team uses a combination of repository artifacts, CI checks, and JIRA workflow updates to provide traceability and evidence that process steps were followed.

### Required or blocking controls

- feature work is expected to start from a refined JIRA ticket with acceptance criteria and linked designs
- at least one human reviewer approval is required before merge
- QA validation is required before release progression
- production deployment approval is restricted to the System Owner unless a waiver delegates that authority
- accessibility and security scans run in CI/CD on every check-in
- changes that affect the system boundary or ATO require the appropriate security review and approvals

### Expected engineering evidence

Depending on the change, the following may be used as evidence:

- JIRA ticket and workflow status
- PR description and linked issue
- completed or partially completed PR checklist
- automated test results
- coverage results
- QA pass/fail notes in JIRA
- UI review outcome
- ADRs for major architecture decisions
- system boundary approval records when applicable

### Documentation and artifact expectations

- **Tests**: behavior changes should include test updates
- **Coverage**: the team expects coverage to remain above 90%
- **ADRs**: required for major architectural changes or changes that affect the system boundary
- **Logical Data Model**: updated automatically as part of the migration process
- **Boundary diagram**: update when system boundaries change, after required SSPO approval
- **API documentation**: update project documentation when API behavior materially changes; OpenAPI updates are not currently treated as a consistent blocking gate

## Production deployment controls

Production release is intentionally more restricted than merge to `main`.

- only the System Owner is authorized to approve and merge to production under normal circumstances
- if a waiver is issued, a delegated technical lead may perform the production deployment
- production PRs follow the deployment sequence captured in the PR template, including staging smoke test expectations before final release progression

## Exceptions and accelerated changes

### Hotfixes

Urgent production fixes may use an accelerated path.

- some non-critical review steps, such as UI review, may be shortened or skipped when speed is necessary
- minimum engineering, QA, and production approval controls should still be preserved to the extent possible
- if additional cleanup or remediation work is needed, the follow-up work should be documented in JIRA and prioritized separately

### Small maintenance work

Not every low risk maintenance change currently starts with a dedicated JIRA ticket. For these cases, the team should still preserve traceability through an epic link, PR documentation, or another agreed tracking mechanism.

## Tribal knowledge and operational notes

The following items are useful for onboarding and day to day execution, even when they are not formal process gates:

- OpenSearch log access is important for troubleshooting deployed environments
- engineers may need environment specific shell access knowledge for production adjacent debugging
- some test failures are caused by incomplete cleanup or known flaky tests rather than product regressions
- a job may appear to complete but still fail because coverage dropped below the required threshold
- local environment setup details can affect the ability to reproduce issues and run tests successfully

These notes should be expanded over time as tribal knowledge is converted into maintainable documentation.

## Flexible vs. strictly enforced practices

The team distinguishes between required controls and expected practices that are not always enforced the same way.

### Consistently enforced

- human review before merge
- QA validation before release progression
- restricted production approval authority
- CI/CD security and accessibility scanning

### Expected but more flexible

- demo related steps
- full completion of every PR template checkbox
- OpenAPI updates
- documenting root cause in every bug ticket

Where possible, flexible practices should still be followed and documented.

## Process maintenance

This document should be updated when the team changes its actual working agreements, approvals, or release controls. Process documentation is most useful when it reflects current practice rather than aspirational practice alone.
