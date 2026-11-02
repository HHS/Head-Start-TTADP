# TTA timeline views — TTAHUB-5667

Status: implemented; scope and package publication approved in chat on 2026-10-16.

## Source and scope

The user approved the conversation and Figma notes in place of a handoff form. Jira text and comments were not supplied or independently reviewed.

User request: “Can you implement adding these view options on branch kw/ttahub-5667 then?”

Design read on 2026-10-16 and rechecked 2026-10-26: [Latest design](https://www.figma.com/design/jxZZk9scrCUaLFKjubMAXU/TTA-Timeline?node-id=373-11769). Monitoring frame `373:13366`; RTTAPA goal frame `373:18354`. Accordion samples `394:24289`, `394:13357`. Behavior notes `394:39454`, `394:39462`.

## Requirements and acceptance criteria

- REQ-1: Add Monitoring related TTA only and TTA activity by RTTAPA goal to View. Preserve existing date-order choices.
- REQ-2: Switching between chronological, Monitoring, and RTTAPA goal views resets all Goal category filters, including exclusions. Entering Monitoring replaces them with Monitoring; entering either other view clears them so all eligible categories display. Date, purpose, event-type filters and the multi-recipient checkbox survive. Changing date order within the chronological view preserves its filters. Only Monitoring-tagged events qualify, before counts and pagination.
- REQ-3: Entering RTTAPA goals clears Goal category filters; other filters survive. Only events tagged with categories of the recipient's non-draft, unmerged standard goals or legacy RTTAPA goals in the selected region qualify. Current curated standard goals qualify without the legacy `isRttapa` flag; `newStandardGoal` leaves that field unset. Display matching categories alphabetically in independently collapsible, initially expanded accordions. A multi-category event appears once in each matching category.
- REQ-4: Category headers show only the current status of the eligible goal with the latest status-change timestamp in that category, across the recipient's grants in the selected region. Status-change time uses performedAt, falling back to the history row's createdAt; goals without history use their creation date. Equal timestamps use the higher goal ID as a deterministic tie-breaker. Missing status displays no badge. This follows the user's 2026-10-26 clarification to show the latest status only, replacing the earlier choice to show all distinct statuses. Header status is independent of filtered/paginated timeline events.
- REQ-5: Query changes clear old events and reset pagination; stale responses cannot replace new-view results. Counts describe distinct events, even when an event appears in several accordions. Progressive loading remains chronological across API slices, and loaded events are grouped alphabetically.
- REQ-6: Preserve selected view on detail navigation/Back and include it in the scroll-restoration query identity. Keep the existing loading, empty, failure, and retry behavior.
- REQ-7: Show goal-number cycle dividers in Monitoring and RTTAPA grouped views. Display `Goal G-<id> closed` above closure events, and `Goal G-<id> added/reopened` below cycle-start events. Keep them visible when event details are collapsed, omit them for suspended events or unavailable goal numbers, and preserve event counts and pagination. Chronological view has no dividers.
- REQ-8: Pause automatic pagination when every visible category accordion is collapsed. Resume intersection-based loading when any category is expanded. Collapsing just one of several expanded categories must not stop loading; queued observer notifications must not fetch another page after all categories close. Manual retry/load controls and chronological loading keep their existing behavior.

Scope clarification (2026-10-26): the user requested goal-number dividers in this ticket after Kelly reported their absence in Monitoring. Both grouped views use the separators shown in the Monitoring frame `373:13366` and RTTAPA frame `373:18354`. This resolves the contradictory nearby annotation that says RTTAPA only. Reuse TimelineEvent and USWDS border/flex utilities; provide the goal number as a structured event detail without parsing source URLs or confusing status-change IDs with goal IDs.

Divider verification (2026-10-26): 82 frontend tests passed, including placement, missing metadata, chronological omission, pagination, and accordion collapse. Two backend metadata tests passed; frontend/backend TypeScript and lint and Code Connect parsing passed. Visually checked the actual TimelineCategory/TimelineEvent components using synthetic goal events in a temporary local Vite preview, then removed the preview. After PostgreSQL became available, all 31 backend tests across the view, source, and goal-status-history suites passed, including database integration and latest-status coverage.

Given a category filter and another filter, when switching to Monitoring, then only the category is replaced. When switching to RTTAPA goals or returning to chronological view, then the category is removed. Given multiple eligible tags, then an event appears in each eligible group, with no duplicate inside a group. Given no eligible goals or matching events, show the existing no-results state. Authorization still excludes communication logs before counting. Missing statuses are omitted.

## Constraints and implementation

Reuse FilterPanel, TimelineEvent, AccordionItem, goal status visuals, and USWDS utility classes per best_practices.md. Backend view eligibility belongs before pagination, using existing source standard predicates. Fetch category metadata in a scoped Sequelize goal query plus one aggregate status-history query, without hooks or per-event queries. Keep backward compatibility: omitted view means chronological. Validate view at route and service boundaries. Extend the shared declaration contract and document the API. No new sources, changes to authorization, or changes to which dates define events.

Automatic-loading follow-up (2026-10-26): 84 frontend tests passed, including queued observer callbacks, an in-flight page completing while all categories are collapsed, partial collapse, and resumed pagination after expansion.

## Verification

Focused frontend tests for switching, grouping, filter preservation, pagination and navigation; backend tests for view validation, recipient/region goal eligibility, and pre-pagination filtering. Run frontend/backend lint. Existing event-card visuals and broader source completeness remain out of scope.

## Validation and release status

Implementation and package publication are complete on `kw/ttahub-5667`. Both backend and frontend pin `@ttahub/common@2.4.20`, with matching lockfile registry URLs and integrity hashes. This supersedes the initial 2.4.13 release. The published package was verified through an isolated frozen-lockfile install with an empty cache, strict shared-contract TypeScript checks, frontend/backend type checks and lint, and 172 focused tests (91 backend, 81 frontend) at the time of reconciliation.

Version 2.4.20 preserves the additive exports and declarations from published versions 2.4.15 through 2.4.19, including TTA requests, collaboration-report constants, collaborator session-notification keys and metadata, and timeline types. These compatibility additions are intentional; the timeline does not implement the collaborator-notification feature. An additive, idempotent migration adds the notification enum value referenced by the shared filter map, allowing the timeline to merge independently of that feature's pending design and QA review.

Subsequent validation of goal dividers and latest header status is recorded above. Earlier local-data examples are historical snapshots; local demo records are not migrations or committed fixtures. Kelly confirmed on 2026-10-26 that Goal category filters reset when moving between views, while other filters remain. Leaving Monitoring or RTTAPA for either date order now removes category pills; entering Monitoring still selects only Monitoring. Browser Back/Forward restores the filters stored in each history entry.

Session reflection: checked AGENTS.md, best_practices.md, ADR 0028, testing/cleanup conventions, and the API documentation against this change. No additional guidance changes proposed; the package publication requirement is already documented. Test cleanup explicitly uses `Goal.unscoped()` for merged fixtures, as the existing test teardown does.

Local-data correction (2026-10-22): category eligibility includes curated standard templates as well as legacy RTTAPA-marked goals. Recipient 747 / region 1 had 105 eligible events across these categories but zero when eligibility relied only on the legacy flag. Monitoring remains empty for that recipient because no indexed events match Monitoring, even without a date filter.

Filter-reset verification (2026-10-26): 88 frontend tests passed, including exits from both grouped views to each date order, preservation of all other filters and the multi-recipient checkbox, and Back restoration of prior categories.
