# Training Report Session Permissions

This document describes the permission model for editing and deleting sessions within Training Reports.

## Overview

Training Report sessions have a complex permission model based on user roles, session status, event organizer type, and facilitation type. Understanding these permissions is critical for maintaining the correct access control.

## User Roles

### Owner (Creator)
- The user who created the training event (`event.ownerId`)
- Can create sessions
- Can submit sessions (sets `collabComplete`)
- **For EDIT permissions**: Treated identically to collaborators (same blocking rules apply)
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
- Can edit sessions when `pocComplete === false` or status is `NEEDS_ACTION`
- Blocked from editing in Regional TTA No National Centers events
- Blocked from editing when facilitation is `national_center` and status is `NEEDS_ACTION`

### Approver
- User assigned to approve the session (`session.approverId`)
- Can only edit after session is submitted (when `pocComplete && collabComplete && approverId`)
- Cannot edit when status is `NEEDS_ACTION` (returned for corrections)
- Cannot delete sessions (unless also owner/POC/collaborator)

### Admin
- Users with admin scope (`scopeId: 2`)
- Can edit any session until the event is complete
- Can delete any session until the event is complete
- Overrides all other permission rules

## Permission Matrix

### Edit Permissions

| Role | Session In Progress | Session Submitted | Session Complete | Event Complete |
|------|--------------------|--------------------|------------------|----------------|
| Admin | Yes | Yes | Yes | No |
| Owner | Yes* | Approver only | No | No |
| Collaborator | Yes* | Approver only | No | No |
| POC | Yes** | Approver only | No | No |
| Approver | No | Yes | No | No |

\* Subject to `collabComplete` status and facilitation rules
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

## Owner vs Collaborator: Key Differences

While owners use the `collabComplete` flag (like collaborators) and share edit restrictions, there is an important difference in **delete permissions**:

| Scenario | Owner Can Delete? | Collaborator Can Delete? |
|----------|------------------|-------------------------|
| Regional PD with National Centers + `national_center` facilitation | Yes | Yes |
| Regional PD with National Centers + `regional_tta_staff` facilitation | **Yes** | **No** |
| Regional PD with National Centers + `both` facilitation | **Yes** | **No** |
| Regional TTA No National Centers | Yes | Yes |

### Why the Difference?

The owner is the event creator and has ultimate responsibility for the training event. While they follow the same edit workflow as collaborators (blocked from editing sessions when it's not their turn), they retain the ability to delete sessions regardless of who is currently facilitating.

This means:
- An owner can always clean up or remove sessions they created
- Collaborators can only delete sessions they are responsible for facilitating

## Status-Based Rules

### Session Statuses
- `In progress` - Work is ongoing
- `Complete` - Session is finalized, no further edits
- `Needs action` - Returned by approver for corrections

### Completion Flags
- `pocComplete` - POC has finished their section
- `collabComplete` - Collaborator/Owner has finished their section
- `submitted` - Both `pocComplete` and `collabComplete` are true, and an approver is assigned

## Approver Selection Rules

When selecting an approving manager for a session:

1. **Current user filter**: The logged-in user cannot select themselves as an approver (unless they are an admin)
2. **Event owner filter**: The event owner cannot be selected as an approver by anyone (prevents conflict of interest)
3. **Role requirements**: Approvers must have ECM, GSM, or TTAC role for Regional TTA events

### Implementation

The approver filtering logic is in `frontend/src/pages/SessionForm/components/Submit.js`:

```javascript
// filter current user out of approver list
if (!isAdmin) {
  approverOptions = approverOptions.filter((a) => a.id !== user.id);
}

// filter out event owner from approver list
const eventOwnerId = event?.ownerId;
if (eventOwnerId) {
  approverOptions = approverOptions.filter((a) => a.id !== eventOwnerId);
}
```

## Key Implementation Files

- `frontend/src/hooks/useSessionCardPermissions.js` - Determines edit/delete button visibility
- `frontend/src/hooks/useSessionFormRoleAndPages.js` - Determines which form pages are accessible
- `frontend/src/pages/SessionForm/index.js` - Form field access and submission logic
- `frontend/src/pages/SessionForm/components/Submit.js` - Approver selection and filtering
- `src/policies/event.js` - Backend authorization (includes `canEditSession()`)

## Backend Authorization

The backend policy (`src/policies/event.js`) uses `canEditSession()`:

```javascript
canEditSession() {
  return !!(this.isAdmin() || this.isAuthor() || this.isCollaborator() || this.isPoc() || this.canEditAsSessionApprover());
}
```

Where `isAuthor()` checks if the user is the event owner (`event.ownerId`).

## Testing

Tests are located in:
- `frontend/src/hooks/__tests__/useSessionCardPermissions.js`
- `frontend/src/pages/TrainingReports/components/__tests__/SessionCard.js`

Run tests with:
```bash
yarn --cwd frontend test -- useSessionCardPermissions
yarn --cwd frontend test -- SessionCard
```
