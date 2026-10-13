# Notification Preferences unsaved-changes modal

_Technical design/specification for review and implementation._

| | |
|---|---|
| Status | implemented |
| Jira | [TTAHUB-5907](https://jira.acf.gov/browse/TTAHUB-5907) |
| Figma | [Actionable Notifications — modal 2489:18846](https://www.figma.com/design/LNF1ux5pEABIOD10T2oBUP/Actionable-Notifications?node-id=2489-18846&m=dev) |
| Design read on | 2026-10-13, via Figma MCP; version not returned |
| Handoff form | Not present in the repository; requirements and decisions are captured below and in `plan.md`. |
| Author | agent-drafted from handoff and Figma; decisions reviewed by the user on 2026-10-13 |

When a user has unsaved opt in/out selections on the Notification Preferences page
(`frontend/src/pages/AccountManagement/ManageNotifications.tsx`, route `/account/notifications/:token?`,
gated by the `actionable_notifications` feature flag) and attempts to leave, a confirmation modal
intercepts the navigation. The page is a long form, so accidental loss of selections is easy. The modal
offers three paths: discard and leave, save and leave, or dismiss and stay.

**Key architectural decision (user-approved 2026-10-13):** the modal fires on browser back/forward as well.
Because browser back is in scope, we use React Router v5's `history.block()` (via `useHistory().block()`),
which uniformly intercepts in-app `PUSH` navigations (left-nav `SiteNav` links, header/utility menu, the
"Back to Notifications" `BackLink`) **and** `POP` navigations (browser back/forward). This avoids the
per-link `FormUnsavedContext` interception the handoff was concerned about — no app-wide provider is needed.

## Requirements (from Jira)

Source: the ticket body preserved in `plan.md`, attributed to
[TTAHUB-5907](https://jira.acf.gov/browse/TTAHUB-5907). No handoff form or local `jira/` export exists;
live Jira was not reviewed. This is a single story (not an epic). The following preserves the supplied
wording verbatim.

> A modal pops up if a user tries to exit the notification preferences age without saving their opt in/out selections.
>
> Modal trigger:
>
>     User clicks "Back to notifications" or clicks to a different page from the left nav (will not trigger if user hits "back" on their browser)
>
> Modal details
>
>     Text: "Are you sure you want to leave this page?"
>
>         "You have unsaved preferences that will be lost" underneath
>
>     Red "Continue without saving" button
>         Allows user to navigate away, changes are not saved
>     Blue "Save and continue" button
>         Saves preferences, allows user to navigate away
>     X to dismiss
>         clicking X to close dismisses the modal without saving changes, stays on the page

### Interpretation and amendments (ours)

Labeled as ours, distinct from the quoted ticket:

- **Browser back is now IN scope.** The ticket said the modal must *not* trigger on browser back. The user
  explicitly overrode this on 2026-10-13: browser back/forward **should** trigger the modal. This lets us use
  a single `history.block()` instead of individually managing nav links.
- Confirmed decisions (user, 2026-10-13):
  - Save failure on "Save and continue": stay on the page, show the existing error alert, do **not** navigate.
  - Reuse: build a reusable hook `useNavigationPromptModal`, but wire it only to this page for now.
  - Logout and automatic session-timeout navigations **bypass** the modal.
  - The page's **Cancel** link does **not** trigger the modal (even when dirty).

## Design

Figma file `LNF1ux5pEABIOD10T2oBUP`, modal frame `node-id 2489:18846` ("modal"), read 2026-10-13 via Figma
MCP. Structure: a `close` bar with an X button (top-right) over a `content` block containing a title, a line
of body text, and a CTA row of two buttons. Frame width 480px.

The Figma *layer names* are stale ("Are you sure you want to continue?" / "unsaved changes"), but the
**rendered text matches the ticket** ("Are you sure you want to leave this page?" / "You have unsaved
preferences that will be lost."). The ticket copy is the source of truth and the two agree.

Named tokens (map to USWDS utility classes / Trussworks components — no new CSS):

| Token | Value | Use |
|---|---|---|
| `OHS/primary` | #336A90 | "Save and continue" primary button (default USWDS primary) |
| `State/Error/error` | #D54309 | "Continue without saving" destructive button (`usa-button--secondary`) |
| `Neutral/base-dark` | #565c65 | body/close iconography |
| `Heading/H4` | Merriweather Bold 17/22 | modal heading |
| `Body/Default` | Source Sans Pro 16/24 | body text |

## Requirements with stable IDs and acceptance criteria

### REQ-1 — Trigger on dirty navigation
When the preferences form is dirty (`formState.isDirty`) and the user attempts to navigate away (left-nav
link, header/utility menu, the "Back to Notifications" `BackLink`, or browser back/forward), show the modal
and prevent navigation until the user chooses.

- Given a dirty form, When the user clicks a left-nav link, Then the modal appears and the route does not change.
- Given a dirty form, When the user clicks "Back to Notifications", Then the modal appears.
- Given a dirty form, When the user presses browser Back, Then the modal appears and the URL stays on the preferences page.
- Given a **pristine** form, When the user navigates away, Then no modal appears and navigation proceeds normally.

### REQ-2 — Continue without saving
The red "Continue without saving" button navigates to the originally requested destination without saving.

- Given the modal is open, When the user clicks "Continue without saving", Then navigation proceeds to the pending destination and no settings are persisted.

### REQ-3 — Save and continue
The blue "Save and continue" button saves preferences, then navigates to the pending destination. On save
failure, stay on the page and surface the existing error alert; do not navigate.

- Given the modal is open, When "Save and continue" is clicked and the save succeeds, Then settings persist and navigation proceeds to the pending destination.
- Given the modal is open, When "Save and continue" is clicked and the save fails, Then the user stays on the page, the existing error alert is shown, and the modal closes.

### REQ-4 — Dismiss (X)
The X dismisses the modal, keeps the user on the page, and saves nothing.

- Given the modal is open, When the user clicks X, Then the modal closes, the route is unchanged, and the form retains its unsaved values.

### REQ-5 — Cancel link bypasses
The page's "Cancel" link (→ `/notifications`) must not trigger the modal, even when the form is dirty. Because
Cancel and the "Back to Notifications" link share the `/notifications` destination, the guard cannot
distinguish them by URL — Cancel must explicitly bypass the guard.

- Given a dirty form, When the user clicks "Cancel", Then navigation proceeds immediately with no modal.

### REQ-6 — Logout bypass
Logout and automatic session-timeout navigations bypass the modal.

- Given a dirty form, When a logout/session-timeout navigation occurs, Then no modal appears and navigation proceeds.

### A11Y-1 — Accessibility
Focus management, reading order, and screen-reader announcements are handled by the Trussworks `Modal`
component (per handoff). The destructive button must have an accessible label, and the modal must be fully
operable by keyboard. The X affordance remains the Trussworks default close button (`forceAction={false}`).

### CON-1 — Project constraints
- New frontend files authored in **TypeScript** (`best_practices.md`).
- Reuse existing `VanillaModal` (`frontend/src/components/VanillaModal.js`), Trussworks/`@trussworks/react-uswds`
  components, and USWDS utility classes — **no new CSS** (`best_practices.md`).
- Entire feature remains behind the `actionable_notifications` feature flag; the route is already gated in
  `Routes.js`.
- Prefer the `useFetch`/existing form patterns; do not introduce a new global state library.

## Implementation notes

- **`useNavigationPromptModal({ when, onSave })` hook** (new, TypeScript):
  - Uses `const history = useHistory();` and registers `history.block((location, action) => {...})` within an
    effect keyed on `when`; returns the `unblock` cleanup.
  - While blocking, store the pending `location`, open the modal, and return `false` to stop the transition.
  - Exposes: `isOpen`, `continueWithoutSaving()` (unblock → `history.push(pendingLocation)`), `saveAndContinue()`
    (run `onSave`; on success unblock + push; on failure stay + close), `dismiss()` (close, stay), and
    `bypassOnce()` (allow the next transition without prompting).
  - Logout bypass (REQ-6): transitions whose target pathname is `/logout` (and the timeout flow) pass through.
- **`NavigationPromptModal` presentational component** (new, TypeScript) built on `VanillaModal`:
  `heading="Are you sure you want to leave this page?"`, body "You have unsaved preferences that will be lost.",
  and a CTA row: `usa-button--secondary` (red) "Continue without saving" and primary (blue) "Save and
  continue". Keep `forceAction={false}` so the Trussworks X dismisses (REQ-4).
- **Wire into `ManageNotifications.tsx`:** read `formState.isDirty` from `useForm`, pass `handleSubmit(onSubmit)`
  as `onSave`, call `reset(values)` after a successful save to clear the dirty flag, and attach `bypassOnce()`
  to the Cancel link `onClick` (REQ-5).

## Open questions / [NEEDS DECISION]

Major gaps were resolved with the user on 2026-10-13. Residual minor items (will implement as recommended
unless the reviewer objects):

1. **[minor]** Use react-hook-form `reset(values)` to clear the dirty flag after a successful inline save
   before navigating. Implemented.
2. **[minor]** Guard scope: only the opt in/out react-hook-form dirtiness, not the separate email-verification
   box interactions. Implemented.

## Validation

- Unit/RTL tests (`frontend` jest via craco, `TZ=America/New_York`) for the hook, the modal, and the page
  integration: trigger on dirty nav, each of the three buttons, X dismiss, Cancel bypass, browser-back, and
  the pristine no-op.
- `cd frontend && yarn lint` and `cd frontend && yarn test --watchAll=false` for touched files.

### Implementation verification

- `yarn --cwd frontend test --watchAll=false src/hooks/useNavigationPromptModal.test.tsx src/components/__tests__/NavigationPromptModal.test.tsx src/pages/AccountManagement/ManageNotifications.test.tsx` — passed.
- `yarn --cwd frontend lint src/hooks/useNavigationPromptModal.ts src/hooks/useNavigationPromptModal.test.tsx src/components/NavigationPromptModal.tsx src/components/__tests__/NavigationPromptModal.test.tsx src/pages/AccountManagement/ManageNotifications.tsx src/pages/AccountManagement/ManageNotifications.test.tsx src/components/VanillaModal.js` — passed.
- `yarn --cwd frontend lint` — passed.
- `cd frontend && ./node_modules/.bin/tsc --noEmit` — passed.
- `yarn --cwd frontend build` — passed; Vite emitted its existing large-chunk advisory.

## Proposed ticket breakdown

Single story; no sub-tickets proposed. Work lands as one PR: hook + modal + page wiring + tests.
