# Plan: Notification Preferences unsaved-changes modal (TTAHUB-5907)

**Slug:** `notifications-modal` · **Jira:** TTAHUB-5907 · **Feature flag:** `actionable_notifications`

## Problem & approach

The Notification Preferences page (`frontend/src/pages/AccountManagement/ManageNotifications.tsx`,
route `/account/notifications/:token?`) is a long react-hook-form. Users easily navigate away and
silently lose unsaved opt in/out selections. We add a confirmation modal that intercepts navigation
away from the page while the form is dirty.

**Key architectural decision (confirmed with user): the modal fires on browser back too.**
Because browser back is in scope, we use React Router v5's `history.block()` (via `useHistory().block()`),
which uniformly intercepts in-app `PUSH` navigations (left-nav `SiteNav` links, header menu, the
"Back to Notifications" `BackLink`) **and** `POP` navigations (browser back/forward). This avoids the
per-link `FormUnsavedContext` interception the handoff was worried about. No app-wide provider needed.

We package this as a **reusable hook `useNavigationPromptModal`** (confirmed scope: build the reusable
hook but wire it only to this page for now), paired with a small presentational modal built on the
existing `VanillaModal` component.

## Design source of truth

- **Figma:** file `LNF1ux5pEABIOD10T2oBUP`, modal frame `node-id 2489:18846` ("modal"), read 2026-10-13.
  - Structure: `close` bar (X button top-right) + `content` (title, text, CTA row of 2 buttons). 480px wide.
  - Rendered copy matches the ticket exactly (the Figma *layer names* are stale; the rendered text is correct).
- **Tokens (named):** `OHS/primary` #336A90 (primary button), `State/Error/error` #D54309 (destructive button),
  `Neutral/base-dark` #565c65, `Heading/H4` Merriweather Bold 17, `Body/Default` Source Sans Pro 16.
  Map to USWDS utility classes / Trussworks components, not new CSS (per `best_practices.md`).

## Requirements (verbatim from Jira ticket)

> A modal pops up if a user tries to exit the notification preferences [p]age without saving their opt in/out selections.
>
> **Modal trigger:** User clicks "Back to notifications" or clicks to a different page from the left nav (will not trigger if user hits "back" on their browser)
>
> **Modal details**
> - Text: "Are you sure you want to leave this page?" / "You have unsaved preferences that will be lost" underneath
> - Red "Continue without saving" button — Allows user to navigate away, changes are not saved
> - Blue "Save and continue" button — Saves preferences, allows user to navigate away
> - X to dismiss — clicking X to close dismisses the modal without saving changes, stays on the page

**Interpretation / amendments (ours, confirmed with user):**
- The ticket said browser-back must NOT trigger the modal. **User overrode this: browser back SHOULD trigger the modal.** This simplifies the implementation (single `history.block`).
- Confirmed decisions: save-failure → stay on page + show existing error alert, do not navigate; reuse via a hook wired only to this page; logout/session-timeout bypass the modal; the page's **Cancel** link should NOT trigger the modal.

## Requirements with stable IDs & acceptance criteria

- **REQ-1 Trigger on dirty navigation.** When the preferences form is dirty (`formState.isDirty`) and the
  user attempts to navigate away (left-nav link, header menu, "Back to Notifications" BackLink, or browser
  back/forward), show the modal and prevent navigation until a choice is made.
  - Given a dirty form, When the user clicks a left-nav link, Then the modal appears and the route does not change.
  - Given a dirty form, When the user clicks "Back to Notifications", Then the modal appears.
  - Given a dirty form, When the user presses browser Back, Then the modal appears and the URL stays on the preferences page.
  - Given a **pristine** form, When the user navigates away, Then no modal appears.
- **REQ-2 Continue without saving.** Red "Continue without saving" button navigates to the originally
  requested destination without saving.
  - Given the modal is open, When the user clicks "Continue without saving", Then navigation proceeds to the pending destination and no settings are persisted.
- **REQ-3 Save and continue.** Blue "Save and continue" button saves preferences, then navigates to the
  pending destination. On save failure, stay on the page and show the existing error alert; do not navigate.
  - Given the modal is open, When the user clicks "Save and continue" and the save succeeds, Then settings persist and navigation proceeds.
  - Given the modal is open, When "Save and continue" is clicked and the save fails, Then the user stays on the page, the error alert shows, and the modal closes.
- **REQ-4 Dismiss (X).** The X dismisses the modal, stays on the page, and saves nothing.
  - Given the modal is open, When the user clicks X, Then the modal closes, the route is unchanged, and the form retains unsaved values.
- **REQ-5 Cancel link bypasses.** The page's "Cancel" link (→ `/notifications`) must NOT trigger the
  modal, even when dirty. (It navigates to the same destination as Back, so it must explicitly bypass the guard.)
  - Given a dirty form, When the user clicks "Cancel", Then navigation proceeds immediately with no modal.
- **REQ-6 Logout bypass.** Logout and automatic session-timeout navigations bypass the modal.
- **CON-1** New frontend files authored in **TypeScript** (`best_practices.md`). Reuse existing
  `VanillaModal` (`frontend/src/components/VanillaModal.js`), Trussworks/USWDS components, and USWDS
  utility classes — no new CSS. Entire feature is behind the `actionable_notifications` feature flag
  (route already gated in `Routes.js`).
- **A11Y-1** Focus management, reading order, and SR announcements are handled by the Trussworks `Modal`
  component (per handoff). Ensure the destructive button has an accessible label and that the modal is
  reachable/operable by keyboard.

## Implementation notes

- `useNavigationPromptModal({ when })` hook:
  - Calls `const history = useHistory();` then `history.block((location, action) => {...})` inside an effect
    keyed on `when`; returns `unblock()` on cleanup.
  - When blocking, store the pending `location`, open the modal, and return `false` to stop the transition.
  - Expose `continueWithoutSaving()` (unblock → `history.push(pendingLocation)`), `saveAndContinue()`
    (run save callback → on success unblock + push; on failure stay + close), `dismiss()`, and modal open state.
  - **Cancel-link bypass (REQ-5):** the hook exposes a `bypassOnce()` setter; the page's Cancel link `onClick`
    calls it so the next transition is allowed. (Back and Cancel share the `/notifications` destination, so we
    cannot distinguish by URL — the bypass must be explicit.)
  - **Logout bypass (REQ-6):** allow transitions whose target pathname is `/logout` (and timeout flow) through.
- Presentational `NavigationPromptModal` built on `VanillaModal` with `heading="Are you sure you want to
  leave this page?"`, body text, and a CTA row: `usa-button--secondary` (red) "Continue without saving" and
  primary (blue) "Save and continue". Keep `forceAction={false}` so the Trussworks X dismisses (REQ-4).
- Wire into `ManageNotifications.tsx`: pull `formState.isDirty` from `useForm`, pass the existing
  `handleSubmit(onSubmit)` as the save callback, reset dirty state after a successful save.

## Open questions / [NEEDS DECISION]

All major gaps were resolved with the user. Residual items to confirm during review:
1. **[minor]** After a successful inline save via "Save and continue", should we rely on react-hook-form
   `reset(values)` to clear the dirty flag before navigating? (Recommended: yes.) — *impl detail, will implement as recommended.*
2. **[minor]** Does the guard also apply to the separate email-verification box interactions, or only the
   opt in/out preferences form dirtiness? (Recommended: only the react-hook-form opt in/out form.) — *will scope to the form.*

## Validation

- Unit/RTL tests for the hook + modal and the wired page: trigger on dirty nav, each button, X dismiss,
  Cancel bypass, browser-back, pristine no-op (`frontend` jest via craco, `TZ=America/New_York`).
- `cd frontend && yarn lint` and `yarn test --watchAll=false` for touched files.

## Todos (tracked in SQL)

1. `scaffold-branch-pr` — feature branch exists; draft PR not yet created
2. `nav-prompt-hook` — complete
3. `nav-prompt-modal` — complete
4. `wire-managenotifications` — complete
5. `tests` — complete
6. `lint-test` — complete
7. `spec-file` — complete; see `index.md`
8. `pr-ready` — fill PR template (Jira link, how-to-test), create draft PR

## Note on spec-handoff gate

Per the spec-handoff skill, the deliverable at gate 2 is the spec at `specs/notifications-modal/index.md`,
followed by a stop for human approval before implementation.

**Status:** The implementation is complete and verified; `index.md` is the approved, implemented spec.
The branch is ready for draft PR creation.
