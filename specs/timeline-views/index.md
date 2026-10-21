# TTA timeline views — TTAHUB-5667

Status: implemented; scope and package publication approved in chat on 2026-10-16.

## Source and scope

The user approved the conversation and Figma notes in place of a handoff form. Jira text and comments were not supplied or independently reviewed.

User request: “Can you implement adding these view options on branch kw/ttahub-5667 then?”

Design read on 2026-10-16: [Latest design](https://www.figma.com/design/jxZZk9scrCUaLFKjubMAXU/TTA-Timeline?node-id=373-11769). Monitoring frame `373:13366`; RTTAPA goal frame `373:18354` (the frame is misleadingly named Monitoring). Accordion samples `394:24289`, `394:13357`. Behavior notes `394:39454`, `394:39462`.

## Requirements and acceptance criteria

- REQ-1: Add Monitoring related TTA only and TTA activity by RTTAPA goal to View. Preserve existing date-order choices.
- REQ-2: Entering Monitoring replaces all Goal category filters with Monitoring; other panel filters and the multi-recipient checkbox survive. Only Monitoring-tagged events qualify, before counts and pagination.
- REQ-3: Entering RTTAPA goals clears Goal category filters; other filters survive. Only events tagged with categories of the recipient's non-draft, unmerged RTTAPA goals in the selected region qualify. Display matching categories alphabetically in independently collapsible, initially expanded accordions. A multi-category event appears once in each matching category.
- REQ-4: Category headers show current goal statuses. Multiple grants/goals can have different statuses; show distinct statuses rather than inventing one aggregate status.
- REQ-5: Query changes clear old events and reset pagination; stale responses cannot replace new-view results. Counts describe distinct events, even when an event appears in several accordions. Progressive loading remains chronological across API slices, and loaded events are grouped alphabetically.
- REQ-6: Preserve selected view on detail navigation/Back and include it in the scroll-restoration query identity. Keep the existing loading, empty, failure, and retry behavior.

Given a category filter and another filter, when switching to Monitoring, then only the category is replaced. When switching to RTTAPA goals, then the category is removed. Given multiple eligible tags, then an event appears in each eligible group, with no duplicate inside a group. Given no eligible goals or matching events, show the existing no-results state. Authorization still excludes communication logs before counting. Missing statuses are omitted.

## Constraints and implementation

Reuse FilterPanel, TimelineEvent, AccordionItem, goal status visuals, and USWDS utility classes per best_practices.md. Backend view eligibility belongs before pagination, using existing source standard predicates. Fetch category metadata in one scoped Sequelize query, without hooks or per-event queries. Keep backward compatibility: omitted view means chronological. Validate view at route and service boundaries. Extend the shared declaration contract and document the API. No new sources, changes to authorization, or changes to which dates define events.

## Verification

Focused frontend tests for switching, grouping, filter preservation, pagination and navigation; backend tests for view validation, recipient/region goal eligibility, and pre-pagination filtering. Run frontend/backend lint. Existing event-card visuals and broader source completeness remain out of scope.

## Validation and release status

Implementation and package release are complete on `kw/ttahub-5667`. Verified 89 frontend tests, 87 backend tests (including real database eligibility and pre-pagination checks), frontend/backend TypeScript checks, frontend/backend lint, and Code Connect parsing. Browser verification covered both views against local recipient 201 / region 7. The shared package was published to npm as `@ttahub/common@2.4.13`, and both consumers were updated with `bin/update-common-version 2.4.13`. All tests, type checks, and lint were rerun successfully against the registry-installed package. An isolated frozen-lockfile install with an empty cache verified the exact lockfile entry shared by both consumers.

Version 2.4.13 preserves the additive TTA request constants from published 2.4.12 so this release does not remove those exports. The backend and frontend manifests now pin 2.4.13, with matching registry URLs and integrity hashes in both lockfiles.

Session reflection: checked AGENTS.md, best_practices.md, ADR 0028, testing/cleanup conventions, and the API documentation against this change. No additional guidance changes proposed; the package publication requirement is already documented. Test cleanup explicitly uses `Goal.unscoped()` for merged fixtures, as the existing test teardown does.
