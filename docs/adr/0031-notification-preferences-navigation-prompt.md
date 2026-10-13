# 0031. Intercept dirty notification preference navigation with React Router

## Status

Accepted

## Context

The Notification Preferences form can be dirty while users navigate through the sidebar, header,
or page links, or use browser back/forward. Intercepting individual links would miss navigation
surfaces and require shared app-level state. The page also has a Cancel link that shares a
destination with its Back link but is intentionally exempt from the prompt.

## Decision

Use React Router v5's `history.block()` in the reusable `useNavigationPromptModal` hook, enabled only
while the Notification Preferences form is dirty. This intercepts in-app and browser-history
navigation consistently. Store the attempted destination until the user chooses to discard changes,
save and continue, or dismiss the modal. Provide a one-time bypass for the page's Cancel link and
allow `/logout` and session-timeout unmounts to bypass the prompt. Wire the hook only to
Notification Preferences for now.

## Consequences

New and existing React Router navigations are guarded without adding an app-wide provider or
individual link handlers. Browser back/forward is covered by the same mechanism. The Cancel link
must call the one-time bypass before navigating because its path is the same as the guarded Back
link. Future uses of the hook should provide equivalent deliberate bypasses for navigation that
must not prompt.
