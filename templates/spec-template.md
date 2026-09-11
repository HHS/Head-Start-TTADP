<!--
SPEC TEMPLATE 
Output path: specs/<feature-slug>/index.md

Output format for agent. Final product should be human-reviewed, edited, and approved.

Example at specs/actionable-notifications/index.md.
-->

# <Feature name>

_Technical design/specification for review and implementation._

| | |
|---|---|
| Status | draft / approved / implemented |
| Jira | <URL and key> |
| Figma | <URL with node-id> |
| Design read on | <YYYY-MM-DD>, version <...> |
| Handoff form | `./handoff.md` |
| Author | agent-drafted from handoff, reviewed by <name> |

<one-paragraph plain-language summary>

## Requirements (from Jira)

Verbatim. Do not paraphrase.

- REQ-1 <...>
- REQ-2 <...>

**Interpretation** (agent's reading, not the ticket's words):

- <...>

## Users and permissions

| Role | Can see | Can do |
|---|---|---|
| | | |

Authorization enforced via our <policy files>

## Constraints from this codebase

Named, specific, cited. Not generic best practice.

- CON-1 <e.g. new backend files in TypeScript per `best_practices.md`>
- CON-2 <e.g. no Sequelize hooks that write data — do it inline in the service>
- CON-3 <e.g. use `@trussworks/react-uswds` components and USWDS utility classes, no new CSS>

## Design

Per screen or component.

### <Screen name> — `node-id: <...>`

- What it shows: <...>
- Components: <our component names>
- Tokens: <by name, not hex values>
- States: default / hover / focus / disabled / loading / empty / error — mark each as drawn-in-Figma, specified below, or `[NEEDS DECISION]`
- Copy: <exact strings, or `[NEEDS DECISION]`>

## Data model

Tables, columns, types, nullability, constraints, indexes. Migration notes including reversible `down`.

## API and service contract

Endpoints, request and response shapes, validation, error codes. Function signatures for new services.

## Acceptance criteria

At least one scenario per requirement. Cover happy path, edge case, error, and permission denial.

### Scenario: <name> (REQ-1)

- **Given** <...>
- **When** <...>
- **Then** <...>

## Accessibility

- A11Y-1 <reading order / heading structure>
- A11Y-2 <keyboard operation and focus management>
- A11Y-3 <screen-reader announcements, live regions>
- A11Y-4 <colour contrast, target size — cite the token>

WCAG 2.2 AA. Section 508.

## Security and privacy

- SEC-1 <authorization check and where it lives>
- SEC-2 <input validation — Joi schema>
- SEC-3 <PII handling, what must not be logged>
- SEC-4 <injection risk in any URL-derived filter — validate types, don't rely on escaping alone>

## Testing

- Unit: <...>
- Integration: <...>
- E2E: only if a user-facing flow changed
- Manual: <...>

## Out of scope

- <...>

## Open questions

Blocking items first. Nothing gets built while a blocking question is open.

| # | Question | Owner | Blocking? |
|---|---|---|---|
| 1 | | | yes/no |

## Ticket breakdown

For an epic. Follow the existing convention: title, link, points, and what "done" means.

**Ticket 1: [<title>](<jira URL>)** — <points> points
<what it covers, and which REQ IDs it satisfies>

## Decisions made

Recorded as they happen. Promote anything architectural to `docs/adr/`.

| Date | Decision | Why | Alternatives rejected |
|---|---|---|---|

## Documentation to update when this ships

- [ ] OpenAPI spec, if the API shape changed
- [ ] ADR, if an architectural decision was made
- [ ] `AGENTS.md` or `best_practices.md`, if a new convention or trap emerged
- [ ] Relevant guide in `docs/guides/`
- [ ] This spec: mark implemented, or fold into permanent docs and delete
