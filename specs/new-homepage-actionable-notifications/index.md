# New homepage with actionable notifications

_Technical design/specification for review and implementation._

| | |
|---|---|
| Status | approved — user approved on 2026-09-21; implementation in progress |
| Jira | [TTAHUB-5799](https://jira.acf.gov/browse/TTAHUB-5799) |
| Figma | [Landing page — 1275:68189](https://www.figma.com/design/LNF1ux5pEABIOD10T2oBUP/Actionable-Notifications?node-id=1275-68189&m=dev) |
| Design read on | 2026-09-21, via Figma MCP; version not returned |
| Handoff form | [handoff.md](./handoff.md) |
| Author | agent-drafted from handoff and Figma; Q1–Q7 reviewed by the user on 2026-09-21 |

Give users a personalized Home page with five shortcuts: account management, notifications, product updates, the user guide, and support. Release the new page behind `actionable_notifications`, retaining the existing homepage for users outside the rollout. Include a Home link above the reporting section in the shared navigation, gated by the same feature-flag helper as the homepage. Administrators receive access through the existing helper even without an explicit flag (approved Q1–Q2).

## Requirements (from Jira)

Source: the ticket body and checklist pasted into the [handoff](./handoff.md), attributed to [TTAHUB-5799](https://jira.acf.gov/browse/TTAHUB-5799). No local `jira/` export exists. Live Jira and its comments were not reviewed. The user confirmed this is a single story and points are irrelevant (Q3); the supplied checklist and recorded user decisions define this spec. The following text preserves the supplied wording.

### REQ-1 — Home page

> Build the new Home page on the Hub.

### REQ-2 — Navigation

```text
    New left nav item: Home
        First left nav item, above TTA Hub Reporting
```

### REQ-3 — Page title

```text
    Home Page Title: Welcome to the TTA Hub, [User Name]
```

### REQ-4 — Account shortcut

```text
    Manage Account widget
        Title: Manage account
        Text: View profile and My Groups
        Button: Manage account
        Routes to the manage account page, same place that the "Account Management" option in the utility menu goes to
```

### REQ-5 — Notifications shortcut

```text
    Notifications widget
        Title: Notifications
        Text: Set up and take action on TTA Hub tasks and messages.
        Button: View notifications
        Routes to the new notifications page
```

### REQ-6 — Updates shortcut

```text
    What's new
        Title: What's new
        Text: Stay up to date with new TTA Hub features.
        Button: View updates
        Routes to the What's new page
```

### REQ-7 — User guide shortcut

```text
    User guide widget
        Title: User guide
        Text: Technical documents and help articles.
        Button: View user guide
        Routes to TTA Hub user guide in Confluence
```

### REQ-8 — Support shortcut

```text
    Contact support widget
        Title: Contact support
        Text: Request support for the TTA Hub.
        Button: Contact support
        Routes to the Smartsheet support request form
```

### REQ-9 — Spacing

```text
    See Figma for spacing guidelines
```

The supplied ticket's design reference is `https://www.figma.com/design/LNF1ux5pEABIOD10T2oBUP/Actionable-Notifications?node-id=1275-68189&m=dev`.

**Interpretation** (agent's reading, not the ticket's words):

- Keep the authenticated `/` route and document title `Home`. Select the new page within `frontend/src/Routes.js`; retain the existing `pages/Home/index.js` as the unflagged fallback.
- Render five instances of one reusable homepage link component, in ticket order. These cards navigate; they do not load or preview notifications or updates.
- Reuse existing destinations: `/account`, `/notifications`, `/whats-new`, `https://acf-ohs.atlassian.net/wiki/spaces/OHSTTA/`, and `SUPPORT_LINK` from `frontend/src/Constants.js`. The support constant currently points to `https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a`.
- The updates shortcut uses direct navigation to `/whats-new`. It adds no unread badge or header-state mutation. The existing utility-menu shortcut also clears a local unread indicator and appends a referrer; neither behavior is requested here. Its destination currently rejects `/` as a Back-link referrer, so do not promise a Back-to-Home link without separately approving that scope.
- Treat the handoff's “Boundaries” section as its out-of-scope statement. The necessary route selection and approved Home navigation item are the only changes outside the homepage and its tests/mapping. Q1 explicitly approves the navigation exception.

### Additional requirements from the handoff

These IDs identify handoff requirements, not Jira quotations.

- **REQ-10:** Gate the new homepage behind `actionable_notifications`. Unflagged non-admins retain the current homepage. Administrators receive the new homepage through the existing `canSeeBehindFeatureFlag` behavior (approved Q2).
- **REQ-11:** Collapse to one column on narrow screens; card contents must adapt flexibly and consistently.
- **REQ-12:** One reusable component encompasses each homepage link box.

## Users and permissions

| User | Can see | Can do |
|---|---|---|
| Authenticated non-admin with the flag | New homepage, all five cards, and the flagged Home nav item | Follow the five links, subject to existing destination permissions |
| Authenticated non-admin without the flag, or without a flags array | Existing homepage and navigation | Existing actions remain available |
| Authenticated administrator without an explicit flag | New homepage, all five cards, and Home nav item through the existing shared helper | No new privileges beyond existing destination permissions |
| Unauthenticated visitor or failed authorization | Existing unauthenticated / request-permissions experience | No access to the authenticated homepage |

`frontend/src/Routes.js` already separates authenticated routes from the unauthenticated and `authError === 403` experiences. `canSeeBehindFeatureFlag` in `frontend/src/permissions.js` grants administrators access to all flags, returns false without a user or flags array for non-admins, and otherwise checks the flag. The existing `/notifications` route uses `FeatureFlag` with a not-found redirect; `/` needs an existing-page fallback instead.

No new homepage API or authorization policy is needed. `src/policies/notifications.ts` permits notification updates by administrators, the owner, or users acting on global notifications; these rules remain with the destination feature. A homepage link does not grant permission to read or mutate notification data.

## Constraints from this codebase

- **CON-1:** Per [best_practices.md](../../best_practices.md), new frontend components must use TypeScript. Keep changes to existing JavaScript files narrow; no unrelated conversion or refactor.
- **CON-2:** Per `best_practices.md`, reuse existing components and hooks, use `@trussworks/react-uswds`, and prefer USWDS utility classes over new CSS. Existing `Container`, `WidgetCard`, `AppWrapper`, and the shared button styles are prior art. Do not introduce Tailwind from Figma's reference output.
- **CON-8:** Per the user’s Q4 decision, prefer existing USWDS conventions over Figma styling and Jira copy over Figma copy. Use equal flexible columns; do not reproduce Figma inconsistencies or add custom styling solely for pixel matching.
- **CON-3:** The flag already exists in `src/constants.js`; reuse it and the established flag helper, including its administrator bypass (approved Q2). Do not add another flag or redefine global flag semantics.
- **CON-4:** Preserve `AppWrapper` and its `main-content` landmark, skip link, session handling, and existing layout. Compose the new homepage within that shell.
- **CON-5:** Per [AGENTS.md](../../AGENTS.md), frontend organization is pages → components, with fetchers/hooks for data. This page needs no new fetch, backend service, model, migration, or shared package release.
- **CON-6:** Per `best_practices.md`, behavior changes require tests and Biome lint. Use `userEvent` for interactions. [ADR 0024](../../docs/adr/0024-switch-eslint-to-biome-linting.md) records the Biome direction; existing scripts/configuration are authoritative for running checks.
- **CON-7:** Per the [Code Connect guide](../../frontend/src/codeConnect/README.md) and spec-handoff Gate 4, add and locally validate mappings for unmapped components used by this implementation after approval. Publishing is a separate action, not part of this draft.

## Design

### Landing page — `node-id: 1275:68189`

Read on 2026-09-21 in the required sequence: metadata, screenshot, variable definitions, Code Connect map, design context. All visible content in this frame was readable. The MCP returned no version identifier and an empty Code Connect map (`{}`). Only this supplied frame was reviewed; no mobile frame or interaction variants were supplied.

The 1440px-wide frame shows the welcome heading above five white cards with icons and outlined navigation controls. Reading order is left-to-right, then down: Manage account, Notifications, What's new, User guide, Contact support. The last card occupies the left column. The heading sits on the page background, outside the cards.

| Element | Frame / instance ID | Observed details |
|---|---|---|
| Welcome heading | `1275:68190` | Positioned at x264 / y112; heading height 52px; example name “Annika Lewis” is sample data |
| Card group | `1275:68196`, `1275:68197` | Starts at x264 / y196; 24px horizontal and vertical gaps |
| Manage Account | `1275:68198` | 556 × 182px; person icon |
| Notifications | `1275:68199` | 500 × 182px; clock icon; width differs from the other cards |
| What’s new | `1275:68200` | 556 × 182px; circled plus icon |
| User guide | `1275:68201` | 556 × 182px; same person icon as Manage Account |
| Contact support | `1275:68202` | 556 × 182px; question-mark icon |
| Existing shell shown as context | `1328:10061`, `1338:18739` | Site navigation and header; header bell and other shell differences are outside this ticket |

The Figma cards have 24px padding, a 48px icon area, 16px between icon and text, and 16px gaps within the title/body/action stack; the heading-to-card gap is 32px. These are design reference measurements. Per approved Q4, prefer existing USWDS conventions and spacing utilities (`padding-3`, `flex-gap-2`, `flex-gap-3`, `margin-bottom-4`) wherever they differ. Use two equal flexible columns at the existing `desktop` breakpoint (1024px), one column below it, and stack icon/text at narrow widths as needed for reflow. Card heights grow with wrapped content.

The metadata includes hidden Filters, Filter pills, and Notification list nodes (`1275:68192`–`1275:68195`); they are not visible homepage content and are excluded.

#### Components and tokens

Component composition: a new TypeScript homepage plus a reusable `HomePageLink` component; compose existing `Container` or `WidgetCard` styling, semantic headings, and `@trussworks/react-uswds` `Link` with `usa-button usa-button--outline` styling. Use React Router link integration for internal destinations. Reuse the local `NavLink` pattern within `SiteNav` for Home, with exact matching so `/` is not active on every route. This is the implementation mapping described by the spec, not a published Code Connect mapping.

| Figma token / style | Existing code correspondence / plan |
|---|---|
| `Heading/H1` | Merriweather Bold, 40px / 52px; existing `page-heading` provides family, size, and weight |
| `Heading/H2` | Merriweather Bold, 30px / 39px; existing `smart-hub-title-big-serif` provides family and size; apply heading weight/line-height through existing utilities |
| `Body/Default` | Source Sans Pro Regular, 16px / 24px; use existing USWDS body typography |
| `Button/outline` | Source Sans Pro Bold, 17px / 17px; use existing outline-button styling |
| `OHS/primary`, `Primary/TTAHUB-medium-blue` | `colors.ttahubMediumBlue` / existing themed outline buttons |
| `Variant/TTAHUB-blue-light` | `colors.ttahubBlueLight`; icon-circle background |
| `Text/ink` | `colors.textInk` |
| `Base/white`, `Base/White` | `bg-white` |
| `Neutral/gray-2` | `colors.grayTwo`; existing page background |
| `Global/card-shadow` | Existing cards use `shadow-2`; the Figma shadow is offset 1px / 4px, blur radius 8px. Use the existing USWDS `shadow-2` convention per approved Q4; exact Figma equivalence is not required |

`Neutral/base-lighter` and `State/Success/success-dark` also appeared in the frame's token output, associated with the existing header context. They do not add homepage requirements. Figma exposed numeric spacing, not named spacing variables; the utility mapping above is the agent's interpretation.

Existing `Container` and `WidgetCard` apply `radius-md`; the supplied widget drawing has square corners. Per approved Q4, retain existing USWDS card treatment (`radius-md`, `shadow-2`) instead of overriding it to match Figma. Preserve the supplied card icons, using exact repository matches if available or local Figma assets during implementation; do not use temporary Figma asset URLs in shipped code. No assets need to be downloaded for this draft.

#### States and copy

- Default: observed in Figma. Exact UI strings are in REQ-3–REQ-8. Use Jira’s “Manage account” and “What's new”; Jira takes precedence over Figma’s casing and punctuation (approved Q4).
- Hover/focus: not drawn in the supplied frame. The handoff explicitly authorizes an engineering choice with validation after implementation. Use existing themed USWDS link/button hover and visible focus styles, without card-level hover behavior, consistent with approved Q4.
- Disabled: no action in this static link page needs to be disabled; retain ordinary enabled navigation links under the handoff authorization.
- Loading/empty/error: the handoff explicitly requests none for this static content. The page performs no new content request. Existing authentication, destination-page loading/errors, and external-site failures remain with their existing owners.
- Responsive: two equal flexible columns at 1024px and above, one column below, and flexible card contents using existing USWDS conventions; preserve reading order at every width (approved Q4).
- Dynamic name: use `UserContext.user.name` as the existing Home does. Wrap long names without truncation. If the name is blank or missing, use `Welcome to the TTA Hub`, without a trailing comma (approved Q5).
- External links: User guide and Contact support navigate in the current tab. Do not set `target="_blank"` or add a new-tab announcement (approved Q7).

## Data model

No database changes or migrations. Use the existing authenticated user and five static card definitions. Suggested component inputs: title, description, link label, destination, icon, and internal/external link mode. Do not query notification counts, groups, updates, or profile details to populate the cards.

## API and service contract

No new endpoints, request shapes, services, validation schemas, or error codes. Reuse existing routes and external URLs listed above. The homepage consumes the already-loaded user context; existing authentication requests are outside the static-content guarantee. No OpenAPI change is expected.

## Acceptance criteria

These scenarios incorporate the user’s resolved Q1–Q7 decisions.

### Scenario: New homepage (REQ-1, REQ-10, REQ-12)

- **Given** an authenticated user who qualifies for the rollout,
- **When** the user visits `/`,
- **Then** the document title is `Home`, the personalized heading and exactly five shortcut cards appear, and each card uses the same reusable component without a content-fetch request.

### Scenario: Home navigation (REQ-2)

- **Given** the user qualifies for the rollout through the explicit flag or existing administrator bypass,
- **When** the shared navigation renders on any authenticated page,
- **Then** Home is its first navigation item, above the existing reporting group, routes to `/`, and is active only on the exact root path. Users outside the rollout retain existing navigation.

### Scenario: Personalized title (REQ-3)

- **Given** a user whose name is `Annika Lewis`,
- **When** the new homepage renders,
- **Then** the H1 is `Welcome to the TTA Hub, Annika Lewis`, with no hardcoded sample identity. Long names wrap without truncation. For a blank or missing name, the H1 is `Welcome to the TTA Hub`, without a trailing comma.

### Scenario: Shortcut destinations (REQ-4–REQ-8)

For each row, **Given** a qualifying authenticated user on Home, **When** the user activates the named link with pointer or keyboard, **Then** the exact title, description, and action copy from its requirement are present and navigation uses the following destination:

| Requirement | Action | Destination |
|---|---|---|
| REQ-4 | Manage account | `/account`, matching the utility menu |
| REQ-5 | View notifications | `/notifications`, subject to its existing flag/policy behavior |
| REQ-6 | View updates | `/whats-new` |
| REQ-7 | View user guide | The same Confluence space URL as the utility menu, in the current tab |
| REQ-8 | Contact support | `SUPPORT_LINK`, in the current tab |

### Scenario: Desktop and narrow layouts (REQ-9, REQ-11)

- **Given** a qualifying user and the USWDS-based layout with equal desktop columns,
- **When** the page is viewed at the design’s desktop width, around the 1024px breakpoint, and at narrow or zoomed widths,
- **Then** two equal flexible columns appear at 1024px and above, the layout reduces to one column below 1024px, and card contents wrap or stack consistently without clipping. Use existing USWDS spacing and card treatment when they differ from Figma. Reading order remains the same, and no fixed card height clips text.

### Scenario: Unflagged and administrator access (REQ-10)

- **Given** an authenticated non-admin without the flag (including an absent flags array),
- **When** they visit `/`,
- **Then** the existing homepage appears instead of a blank page or not-found redirect. Separately, an authenticated administrator with no explicit flag sees the new homepage and Home navigation item through the existing helper.

### Scenario: Authentication and authorization failure (REQ-1, REQ-10, SEC-1)

- **Given** the visitor is unauthenticated or authentication reports 403,
- **When** they request `/`,
- **Then** the existing unauthenticated or request-permissions experience appears; the new page does not bypass either branch. Following a card never bypasses the destination's authorization.

### Scenario: No content data and network failures (REQ-1, REQ-4–REQ-8)

- **Given** a qualifying authenticated user has no notifications or updates,
- **When** Home renders, even while a destination service is unavailable,
- **Then** all five static shortcuts remain available without a homepage empty state or request error. Errors after following a link are handled by the destination; no homepage retry, status message, or live region is introduced.

### Scenario: Keyboard and assistive technology (REQ-2–REQ-8, REQ-11)

- **Given** the homepage renders with one H1, five H2 card headings, and navigation links styled as buttons,
- **When** the user navigates with Tab, Enter, the skip link, or screen-reader heading navigation,
- **Then** interactive links follow document order, focus is visible, each link has the intended accessible name, decorative icons are not announced, and no card wrapper creates an extra focus stop.

## Accessibility

- **A11Y-1:** Preserve the existing `main-content` landmark and skip link. Use one H1, five H2 card headings, paragraphs, and links styled as buttons. Treat redundant icons as decorative (approved Q6).
- **A11Y-2:** The handoff requires document/reading order. Focus order follows navigation and the five card links in visual order; static headings/text remain screen-reader navigable without `tabIndex`. Use the existing router/scroll behavior; add no autofocus or new route-focus mechanism (approved Q6).
- **A11Y-3:** The handoff explicitly requests no new live regions or status announcements. Hide redundant decorative icons from assistive technology. External links open in the current tab and need no new-tab announcement (approved Q7).
- **A11Y-4:** Verify WCAG 2.2 AA / Section 508 behavior: text and control contrast using `Text/ink`, `OHS/primary`, `Base/White`, and existing focus styles; targets at least 24 × 24 CSS px or qualifying spacing; visible, unobscured keyboard focus; reflow at 320 CSS px and 400% zoom. Token names alone are not proof of passing contrast or reflow.

## Security and privacy

- **SEC-1:** Preserve authentication in `Routes.js`; use the approved flag behavior for page and nav visibility. Client-side gating is rollout control, not a replacement for destination authorization.
- **SEC-2:** Render the authenticated name as ordinary React text. No HTML injection, new user-input field, or validation endpoint is needed.
- **SEC-3:** No new logging, tracking payloads, or persisted user data. Keep existing page-view behavior; do not add names or notification details to events.
- **SEC-4:** Destinations are fixed application routes/constants, never user-supplied URLs. User guide and Contact support use normal same-tab navigation; omit a new-window target. Their destinations match `HeaderUserMenu`, but its new-tab behavior does not apply to these homepage links (approved Q7).

## Testing

- Unit: extend homepage coverage for exact copy, all five destinations, actual user name, long-name wrapping and blank/missing-name fallback, heading/link semantics, and decorative icons. Exercise internal navigation with `userEvent` and a memory router. Assert external links navigate in the current tab (no new-window target) and have no new-tab announcement.
- Integration: extend `frontend/src/__tests__/Routes.js` and `frontend/src/components/__tests__/SiteNav.js` for flagged/unflagged/admin users, unauthenticated/403 branches, Home ordering, and exact-path active state. Check both explicit flag absence and absent flags arrays.
- E2E: extend an existing authenticated navigation smoke flow if available for the new user-facing Home → destination flow; mock external destinations and avoid live Confluence/Smartsheet requests. Do not introduce a new E2E framework.
- Manual: verify equal desktop columns and existing USWDS conventions, using the recorded frame for overall arrangement. Check the 1024px breakpoint, narrow widths, zoom, long names, keyboard navigation, screen-reader output, hover/focus, and same-tab external navigation.
- Run frontend focused tests with `TZ=America/New_York` and watch disabled, frontend Biome lint, and `yarn figma:parse` for new mappings before opening a PR. No backend behavior tests are expected for this frontend-only change.
- Draft-only validation: no implementation tests are appropriate until code exists; validate spec references and requirement coverage now.

## Out of scope

- Notification counts, previews, creation, preferences, email verification, backend services, and notification-page changes.
- Account management, My Groups, What's new content, Confluence, or support-form changes.
- Header bell, avatar, reporting-group renaming, other sidebar differences, and general shell redesign shown in the Figma frame. The approved Q1 exception is limited to the Home navigation item.
- New fetching/loading/error experiences, unread badge behavior, and Back-to-Home changes on What's new.
- Backend/model/migration/shared-package changes, new dependencies, broad refactors, and global feature-flag behavior changes.
- Figma source edits or published Code Connect mappings; local mapping files and validation remain part of the approved implementation workflow.

## Open questions

None. Q1–Q7 are resolved, and the user approved the revised spec on 2026-09-21.

## Ticket breakdown

**[TTAHUB-5799 — New homepage](https://jira.acf.gov/browse/TTAHUB-5799)** is a single story, confirmed by the user (Q3). It covers REQ-1–REQ-12, focused tests, and local Code Connect mapping. No child-ticket breakdown or point estimate is needed; points are irrelevant to this spec.

## Decisions made

| Date | Decision | Why | Alternatives rejected |
|---|---|---|---|
| 2026-09-21 | Complete revised spec approved by the user; implementation and PR authorized. | Explicit approval after resolving Q1–Q7. | None. |
| 2026-09-21 | Q1 approved by the user: include the Home link in shared navigation, under the same flag as the homepage. | User selected “Include the flagged Home link”. | Keeping navigation unchanged. |
| 2026-09-21 | Q2 approved by the user: use existing flag behavior, including administrator access without an explicit flag. | User selected “Use existing behavior, including admins”. | Requiring the explicit flag for administrators. |
| 2026-09-21 | Q3 resolved by the user: TTAHUB-5799 is a single story; points are irrelevant. | Explicit user clarification. | Epic breakdown or point estimates. |
| 2026-09-21 | Q4 resolved by the user: prefer USWDS conventions over Figma, Jira copy over Figma, and equal flexible columns. Use the existing desktop breakpoint and responsive conventions described above. | Explicit user direction; consistency with existing components. | Unequal Figma card widths or custom styling solely to match Figma. |
| 2026-09-21 | Q5 approved by the user: wrap long names without truncation; use `Welcome to the TTA Hub` for a blank/missing name. | User accepted the recommendation. | Truncating names or rendering a dangling comma. |
| 2026-09-21 | Q6 approved by the user: the documented heading/link semantics, decorative icons, document-order focus, and existing route-focus behavior. | User approved the accessibility details. | Extra focus stops on static content or a new focus mechanism. |
| 2026-09-21 | Q7 resolved by the user: User guide and Contact support open in the current tab, without a new-tab announcement. | Explicit user instruction. | The proposed new-tab behavior. |
| 2026-09-21 | Handoff establishes a static five-shortcut homepage at `/`, gated by `actionable_notifications`. | Explicit scope and technical constraints. | Dynamic card content or a new homepage route. |
| 2026-09-21 | No homepage loading, empty, error, or live-region state; use one column on narrow screens. | Explicit handoff answers. | Inferring asynchronous homepage behavior from the notification feature. |
| 2026-09-21 | Engineering may propose hover/focus/disabled treatment for validation after implementation. | Explicit handoff permission: “Not provided, take a guess and I will validate after implementations”. | Treating these states as a blocking missing design. |

No architecture decision has been introduced. Q1–Q7 are resolved. The user approved the complete revised spec on 2026-09-21 and authorized implementation and a pull request.

## Documentation to update when this ships

- [x] This spec: record Q1–Q7 answers and review date.
- [ ] This spec: record final approval, then change status from draft → approved → implemented.
- [ ] Add local Code Connect templates for the unmapped homepage components and validate with `yarn figma:parse`; identify source component node IDs before writing mappings.
- [ ] Run the `self-improve` skill after implementation; apply agreed repository guidance improvements.
- [ ] Update a relevant guide if review identifies a user-facing documentation need.
- [ ] OpenAPI only if scope changes to alter an API; no change currently expected.
- [ ] ADR only if an architectural decision emerges; none currently expected.

### Review limitations and workflow feedback

The frame’s visible content and tokens were readable, but its version, mobile layouts, and interactive variants were unavailable. Code Connect returned no mappings. The user resolved design differences by preferring existing USWDS conventions and Jira copy, so exact Figma shadow matching is not required. Verify responsive behavior and accessibility during implementation. Live Jira comments were not reviewed; this spec uses the supplied ticket text and recorded user decisions. Issue structure is confirmed as one story, with no estimate required.

The handoff has a populated “Boundaries” section rather than a separately named “Out of scope” section and identifies the relevant frame by node ID rather than name. Those supplied details were usable: Figma confirmed the frame name as “Landing page.” The handoff’s blank epic choice is superseded by the user’s Q3 confirmation of a single story. Gate 2 ended with human approval on 2026-09-21; implementation follows the approved decisions.
