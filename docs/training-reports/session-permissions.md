# Training Report Session Permissions

This document describes session editing, deletion, facilitation correction, and approver selection within Training Reports. Frontend workflow restrictions and backend authorization are described separately below.

## Overview

Training Report sessions have a complex permission model based on user roles, session status, event organizer type, and facilitation type. Understanding these permissions is critical for maintaining the correct access control.

## User Roles

### Owner (Creator)
- The user who created the training event (`event.ownerId`)
- Can create sessions
- Can submit sessions (sets `collabComplete` in the standard flow; Regional owners use `ownerComplete` in the National Center facilitation flow)
- **For EDIT permissions**: Shares facilitation restrictions with collaborators, but uses a separate completion flag in the National Center facilitation flow
- **For DELETE permissions**: More permissive than collaborators - NOT blocked by regional facilitation rules
  - Owners can delete sessions with `regional_tta_staff` or `both` facilitation
  - Collaborators cannot delete those same sessions in Regional PD with National Centers events

### Collaborator
- Users listed in `event.collaboratorIds` array
- National center staff who facilitate sessions
- Can edit sessions when `collabComplete === false` or status is `NEEDS_ACTION`
- Blocked from editing sessions with `regional_tta_staff` or `both` facilitation in Regional PD with National Centers events

### POC (Point of Contact)
- Users listed in `event.pocIds` array
- Regional staff who coordinate training events
- Can create sessions
- Can edit sessions when `pocComplete === false` or status is `NEEDS_ACTION`
- Blocked from editing in Regional TTA No National Centers events
- Blocked from editing when facilitation is `national_center` and status is `NEEDS_ACTION`

### Approver
- User assigned to approve the session (`session.approverId`)
- Can edit as approver after the session is submitted (see completion flags below)
- Cannot edit when status is `NEEDS_ACTION` (returned for corrections)
- Cannot delete sessions (unless also owner/POC/collaborator)

### Admin
- Users with admin scope (`scopeId: 2`)
- Can edit any session until the event is complete
- Can delete any session until the event is complete
- Overrides role-based edit and approver-selection restrictions
- Can correct training facilitation on Session summary, immediately after Session name

## Permission Matrix

### Edit Permissions

| Role | Session In Progress | Session Submitted | Session Complete | Event Complete |
|------|--------------------|--------------------|------------------|----------------|
| Admin | Yes | Yes | Yes | No |
| Owner | Yes* | Approver only | No | No |
| Collaborator | Yes* | Approver only | No | No |
| POC | Yes** | Approver only | No | No |
| Approver | No | Yes | No | No |

\* Subject to the applicable `ownerComplete` / `collabComplete` flag and facilitation rules
\** Subject to `pocComplete` status and event organizer rules

### Delete Permissions

| Role | Session In Progress | Session Submitted | Session Complete | Event Complete |
|------|--------------------|--------------------|------------------|----------------|
| Admin | Yes | Yes | Yes | No |
| Owner | Yes | Yes | No | No |
| Collaborator | Yes* | Yes* | No | No |
| POC | Yes** | Yes** | No | No |
| Approver Only | No | No | No | No |

\* Collaborators are blocked in Regional PD with National Centers when facilitation is `regional_tta_staff` or `both`
\** POCs are blocked in Regional TTA No National Centers, or in Regional PD with National Centers when facilitation is `national_center`

**Note:** Unlike collaborators, owners are NOT blocked by facilitation rules for deletion.

### Session Creation Permissions

| Role | Can Create Session? |
|------|---------------------|
| Admin | Yes |
| Owner | Yes |
| Collaborator | Yes |
| POC | Yes |
| Approver Only | No |

**Note:** POCs can create sessions in addition to Admins, Owners, and Collaborators.

For Regional PD events with National Centers, every creation entry point must collect a valid facilitation choice before creating the session. The event card links directly to `SessionReportFacilitation`. The generic `/training-report/:trainingReportId/session/new/` route (used by alerts and direct links) first reads the event and redirects to `choose-facilitation` without creating a session. This applies to owners, collaborators, POCs, and admins. Regional-only events continue through the generic creation route without the facilitation step.

`POST /api/session-reports` rejects missing, blank, or unrecognized facilitation with HTTP 400 for Regional PD events with National Centers. Accepted values are `national_center`, `regional_tta_staff`, and `both`.

## Event Organizer Types

### Regional PD Event (with National Centers)
- `TRAINING_EVENT_ORGANIZER.REGIONAL_PD_WITH_NATIONAL_CENTERS`
- Involves both regional staff (POC) and national center staff (collaborators)
- Facilitation type determines which roles can edit

### Regional TTA Hosted Event (no National Centers)
- `TRAINING_EVENT_ORGANIZER.REGIONAL_TTA_NO_NATIONAL_CENTERS`
- Regional-only event
- POCs cannot edit or delete sessions
- Collaborators/Owners have full access

## Facilitation Types

| Facilitation Value | Who Facilitates | POC Can Edit | Collaborator/Owner Can Edit |
|-------------------|-----------------|--------------|----------------------------|
| `national_center` | National Centers only | Limited* | Yes |
| `regional_tta_staff` | Regional staff only | Yes | No** |
| `both` | Both regional and national | Yes | No** |

\* POC blocked when status is `NEEDS_ACTION`
\** Only in Regional PD with National Centers events

### Session Form Page Access (Regional PD with National Centers)

| User Context | Accessible Pages |
|--------------|------------------|
| Regional **owner** + Trainer = `national_center` | Participants, Supporting attachments, Next steps, Review and submit |
| NC **owner** + Trainer = `national_center` + not submitted | Session summary, Review and submit |
| NC **owner** + Trainer = `national_center` + submitted | Session summary, Participants, Supporting attachments, Next steps, Review and submit |
| **Collaborator-only** (any NC status) + Trainer = `national_center` | Session summary, Review and submit (regardless of submission state) |

A user who is both owner *and* collaborator keeps the broader owner privileges. These page-access rules come from `frontend/src/hooks/useSessionFormRoleAndPages.js` and split owners (responsible for the event) from collaborator-only users (TTAHUB-5502).

### Form Field Access (Regional PD with National Centers)

`frontend/src/pages/SessionForm/index.js` keeps the `determineKeyArray` function aligned with the page-access rules above. The same owner-vs-collaborator split applies to which form keys are loaded from and persisted to the database:

| User Context | Saved/loaded keys |
|--------------|-------------------|
| Regional **owner** + Trainer = `national_center` | `pocKeys` (Participants, Supporting attachments, Next steps fields). `pocComplete` is stripped on save; the Regional owner's submit sets `ownerComplete` instead of `collabComplete` (see below). |
| NC **owner** + Trainer = `national_center`, not submitted | `istKeys` (Session Summary fields). |
| NC **owner** + Trainer = `national_center`, submitted | `istKeys ∪ pocKeys` (full review). |
| **Collaborator-only** (any NC status) + Trainer = `national_center` | `istKeys` (Session Summary fields). `pocComplete` is stripped on save. |

When adding new fields to either page set, register them in `pocKeys` / `istKeys` (`frontend/src/pages/SessionForm/constants.js`) so the right group of users can save them.

### `ownerComplete` (Regional PD w/ NC + Trainer = National Centers only)

The event organizer **Regional PD Event (with National Centers)** combined with facilitation = `national_center` flow — has two distinct people contributing to the same session:

- The **Regional owner** fills the POC-side pages (Participants, Supporting attachments, Next steps).
- The **NC collaborator** fills the IST-side pages (Session summary).

To keep these two submissions independent, the Regional owner's submit is tracked via the dedicated `ownerComplete` flag (mirroring `collabComplete`'s shape: `ownerComplete`, `ownerCompleteId`, `ownerCompleteDate`). This prevents the owner's submit from setting `collabComplete = true`, which would otherwise block the NC collaborator from editing the Session summary they still own.

- **Submission semantics**: `submitted = approverId && collabComplete && (ownerComplete || pocComplete)` in the National Center facilitation flow. Owner-created sessions use `ownerComplete`; POC-created sessions can use `pocComplete`. Outside this flow, the frontend and backend policy require `approverId && collabComplete && pocComplete`.
- **Edit lockout**: the Regional owner is locked out by `ownerComplete && !needsAction` (independently from the NC collaborator's `collabComplete` gate), the same way `collabComplete` locks editors today.
- **Admin submits**: a non-POC admin submit in the flow sets both `ownerComplete = true` and `collabComplete = true` so the session can transition to `submitted`.

Backend pieces that participate in this semantics:

- `src/models/sessionReportPilot.js` — `submitted` virtual accepts either `pocComplete` or `ownerComplete` alongside `collabComplete`.
- `src/policies/event.js` — `isSubmitted()` delegates to `src/services/eventFlow.ts`, which accepts `ownerComplete` only in the National Center facilitation flow. The model virtual accepts either completion flag without checking the event organizer/facilitation, so stale flags can produce different results after changing workflows.
- `src/services/event.ts` — alert checker picks `ownerComplete` for the owner side in the flow and skips the POC-side check there.

## Owner vs Collaborator: Key Differences

Owners and collaborators share facilitation-based edit restrictions, with separate completion flags in the National Center facilitation flow. There is also a difference in **delete permissions**:

| Scenario | Owner Can Delete? | Collaborator Can Delete? |
|----------|------------------|-------------------------|
| Regional PD with National Centers + `national_center` facilitation | Yes | Yes |
| Regional PD with National Centers + `regional_tta_staff` facilitation | **Yes** | **No** |
| Regional PD with National Centers + `both` facilitation | **Yes** | **No** |
| Regional TTA No National Centers | Yes | Yes |

### Why the Difference?

The owner is the event creator and has ultimate responsibility for the training event. While they follow the same edit workflow as collaborators (blocked from editing sessions when it's not their turn), they retain the ability to delete sessions regardless of who is currently facilitating.

This means:
- An owner can remove sessions while neither the session nor event is complete
- Collaborators can only delete sessions they are responsible for facilitating

## Status-Based Rules

### Session Statuses
- `In progress` - Work is ongoing
- `Complete` - Session is finalized, no further edits
- `Needs action` - Returned by approver for corrections

### Completion Flags
- `pocComplete` - POC has finished their section
- `collabComplete` - Collaborator/Owner has finished their section (standard flow); the **NC collaborator** in the flow
- `ownerComplete` - The Regional **owner** has finished their section in the National Center facilitation flow (Regional PD w/ NC + Trainer = National Centers). See [`ownerComplete`](#ownercomplete-regional-pd-w-nc--trainer--national-centers-only) above for full semantics.
- `submitted` - Standard flow: `pocComplete && collabComplete` are true. National Center facilitation flow: `(ownerComplete || pocComplete) && collabComplete` is true. Both require an approver to be assigned; see the model/policy distinction above.

## Editing Training Facilitation

`SessionReportFacilitation` collects facilitation when creating a session for a Regional PD event with National Centers. That page creates a new session; it does not edit an existing one.

On an existing session's **Session summary** page, admins (`scopeId: 2`) see a **Training facilitation** dropdown immediately after **Session name**, with the same choices:

- National Center (`national_center`)
- Regional TTA staff (`regional_tta_staff`)
- Both (National Center and Regional TTA staff) (`both`)

Use **Save draft** or **Save and continue** to persist a correction. Non-admin users retain a hidden field and cannot change facilitation through the form. The update API uses the general session edit authorization and does not separately restrict changes to facilitation. Choosing facilitation during initial creation remains available to all authorized creators.

The field uses existing session access and save rules: completed events cannot be opened for editing, and the normal save handlers do not save completed sessions. A facilitation correction changes trainer/approver options and which roles can access the session. It does not automatically clear existing trainers, the assigned approver, or completion flags. Review those values when correcting facilitation, especially when switching between regional and National Center workflows.

### Empty Approver List

For Regional PD events with National Centers, blank or unrecognized facilitation produces **no staff candidates for trainers or approvers**, even when both trainer API requests return users. The trainer field still offers its separate Other option. Page completion and `collabComplete` do not populate facilitation. An admin can repair it using the dropdown above, save, and review the approving manager options. Do not infer facilitation from the event organizer alone.

Even with valid regional facilitation, the list can be empty after filtering: if the only regional managers are the event owner and the current non-admin user, both are excluded.

Previously, the alert's generic Create a session link bypassed facilitation selection, and the API accepted a session without that field. This was a possible source of missing values; it does not establish the history of any particular session. Creation now checks the event organizer before posting, with API validation as a backstop. Existing blank sessions still need an admin correction.

## Approver Selection Rules

### Who Can Select an Approver?

`useCanSelectApprover` controls visibility of the Approving manager field on the submission form:

| User context | Dropdown allowed? |
|--------------|-------------------|
| Admin | Yes, overrides the restrictions below |
| Regional/non-NC owner | No for `national_center`; otherwise subject to the POC rule if also a POC |
| NC owner | Yes, unless also a POC and blocked by the POC rule |
| POC | Only for `regional_tta_staff` or `both` |
| Collaborator who is neither owner nor POC | Yes |

These checks do not grant session edit access. For example, in Regional PD events with National Centers and regional/both facilitation, owner-only and collaborator-only users cannot normally edit the session; the POC selects the approver. The Needs action and approval views also use different components from the initial submission form.

### Who Can Be Selected?

`useSessionApprovers` derives candidates from `useEventAndSessionStaff`:

- Regional TTA events without National Centers: regional trainers with ECM, GSM, or TTAC roles.
- Regional PD events with National Centers, facilitated by regional staff or both: regional trainers with ECM, GSM, or TTAC roles.
- Regional PD events with National Centers, facilitated only by National Centers: National Center users; no additional ECM/GSM/TTAC role requirement.
- Regional PD events with blank or unrecognized facilitation: no candidates.

The current user is excluded unless they are an admin. The event owner (`event.ownerId`) is always excluded, including for admins. Being allowed to choose an approver does not make a user eligible to approve their own session.

See [User roles and selection criteria](user-selection-criteria.md) for candidate sources and filters.

## Key Implementation Files

- `frontend/src/hooks/useSessionCardPermissions.js` - Determines edit/delete button visibility
- `frontend/src/hooks/useSessionFormRoleAndPages.js` - Determines which session form pages are accessible based on role, event organizer, facilitation, and submission state
- `frontend/src/pages/SessionForm/index.js` - Form field access and submission logic
- `frontend/src/pages/SessionForm/pages/sessionSummary.js` - Admin facilitation correction field
- `frontend/src/pages/SessionForm/components/Submit.js` - Approver selection UI
- `frontend/src/hooks/useCanSelectApprover.js` - Approver dropdown visibility
- `frontend/src/hooks/useSessionApprovers.ts` - Approver candidate filtering
- `frontend/src/hooks/useEventAndSessionStaff.js` - Trainer candidates by event organizer and facilitation
- `src/routes/sessionReports/handlers.ts` - Required facilitation at creation for Regional PD with National Centers
- `src/policies/event.js` - Backend authorization (includes `canEditSession()`)

## Backend Authorization

The backend policy (`src/policies/event.js`) uses `canEditSession()`:

```javascript
canEditSession() {
  return !!(this.isAdmin() || this.isAuthor() || this.isCollaborator() || this.isPoc() || this.canEditAsSessionApprover());
}
```

Where `isAuthor()` checks if the user is the event owner (`event.ownerId`). This is broader than the frontend edit workflow: the approver dropdown visibility, candidate filters, and admin-only facilitation field are not enforced by this policy.

## Testing

Relevant tests:

- `frontend/src/hooks/__tests__/useSessionCardPermissions.js`
- `frontend/src/hooks/__tests__/useCanSelectApprover.js`
- `frontend/src/hooks/__tests__/useSessionApprovers.tsx`
- `frontend/src/hooks/__tests__/useEventAndSessionStaff.js`
- `frontend/src/pages/SessionForm/pages/__tests__/sessionSummary.js`
- `frontend/src/pages/SessionForm/__tests__/index.js`
- `frontend/src/pages/SessionReportFacilitation/__tests__/index.js`
- `src/routes/sessionReports/handlers.test.js`

Run focused tests with:

```bash
yarn --cwd frontend test --watch=false --watchAll=false --runInBand --runTestsByPath src/pages/SessionForm/pages/__tests__/sessionSummary.js src/pages/SessionForm/__tests__/index.js
node node_modules/jest/bin/jest.js src/routes/sessionReports/handlers.test.js --runInBand
```
