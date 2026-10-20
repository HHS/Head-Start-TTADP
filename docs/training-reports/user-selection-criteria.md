# Training Report User Roles and Selection Criteria

This document explains the user roles and selection criteria for three user selection fields in the Training Report system.

## Overview

The Training Report system has three key user selection fields:

1. **Event Collaborators** - Training Report Form (`eventSummary.js`)
2. **Who Provided the TTA?** (Trainers) - Session Form (`sessionSummary.js`)
3. **Approving Manager** - Session Form (`Submit.js`)

Each field uses different filtering criteria based on user roles, permissions, and event configuration.

---

## User Roles Reference

### Regional Trainer Roles

| Role Code | Role Name |
|-----------|-----------|
| HS | Health Specialist |
| SS | System Specialist |
| ECS | Early Childhood Specialist |
| GS | Grants Specialist |
| FES | Family Engagement Specialist |
| TTAC | Training and TA Coordinator |
| ECM | Early Childhood Manager |
| GSM | Grants Specialist Manager |
| AA | Administrative Assistant |

### National Center Trainer Role

| Role Code | Role Name |
|-----------|-----------|
| NC | National Center |

### Manager Roles (Approving Authority)

| Role Code | Role Name |
|-----------|-----------|
| ECM | Early Childhood Manager |
| GSM | Grants Specialist Manager |
| TTAC | Training and TA Coordinator |

---

## 1. Event Collaborators

**Location**: Training Report Form (`eventSummary.js`)

**Data Source**: `useEventAndSessionStaff` hook with `isEvent=true`

**API Endpoints**:
- Regional: `GET /api/users/trainers/regional/region/:regionId`
- National Center: `GET /api/users/trainers/national-center/region/:regionId`

### Selection Logic Flowchart

```
                          ┌─────────────────────────┐
                          │   Event Configuration   | 
                          |    Regional TTA         |
                          |   (No National Centers) │
                          │     (isEvent=true)      │
                          └───────────┬─────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐
        │   Regional TTA    │               │    Regional PD    │
        │ (No Nat'l Centers)│               │ (With Nat'l Ctrs) │
        └─────────┬─────────┘               └─────────┬─────────┘
                  │                                   │
                  ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐
        │ Regional Trainers │               │ National Center   │
        │      Only         │               │  Trainers Only    │
        └───────────────────┘               └───────────────────┘
```

### Selection Criteria by Event Organizer

| Event Organizer | Users Returned | Roles |
|-----------------|----------------|-------|
| Regional TTA (No National Centers) | Regional Trainers | HS, SS, ECS, GS, FES, TTAC, ECM, GSM, AA |
| Regional PD (With National Centers) | National Center Trainers | NC |

### Common Requirements

| Criteria | Value |
|----------|-------|
| **Permission Required** | SITE_ACCESS |
| **Region Filter (Regional)** | `homeRegionId` matching event region |
| **Region Filter (NC)** | None (available across all regions) |
| **Additional Filter** | Excludes the event owner (`ownerId`) |

### Why This Logic?

The Event Collaborators field adapts based on the event organizer type:

- **Regional TTA events**: Collaborators are drawn from regional staff who work in the same region, allowing regional teams to coordinate within their area.
- **Regional PD events**: Collaborators are National Center trainers, enabling regional event owners to collaborate with national-level staff for professional development events.
- **AA Role**: Administrative Assistants (AA) are included as Event Collaborators for Regional TTA events, but are excluded from Session Trainers ("Who Provided TTA?") and Approving Managers.

The `isEvent=true` flag only affects selection when the event organizer is "Regional PD (With National Centers)" - in that case, it triggers National Center trainer selection regardless of the `facilitation` field value.

---

## Event Creator Import

**Location**: `src/services/event.ts` (`csvImport`)

When importing events from CSV:

- Event creators can be imported regardless of whether they have NC or regional trainer roles.
- The gate is region write access, not trainer role membership.
- `csvImport` uses `EventReport(owner, { regionId }).canWriteInRegion()` to validate the creator, which checks for the region's `READ_WRITE_TRAINING_REPORTS` permission.

---

## 2. Who Provided the TTA? (Trainers)

**Location**: Session Form (`sessionSummary.js`)

**Data Source**: `useEventAndSessionStaff` hook

**Note:** Users with only the AA role are excluded from the Session Trainer options, as they serve as event collaborators rather than session facilitators.

**API Endpoints**:
- Regional: `GET /api/users/trainers/regional/region/:regionId`
- National Center: `GET /api/users/trainers/national-center/region/:regionId`

### Selection Logic Flowchart

```
                          ┌─────────────────────────┐
                          │   Event Configuration   │
                          └───────────┬─────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐
        │   Regional TTA    │               │    Regional PD    │
        │ (No Nat'l Centers)│               │ (With Nat'l Ctrs) │
        └─────────┬─────────┘               └─────────┬─────────┘
                  │                                   │
                  ▼                                   ▼
        ┌───────────────────┐               ┌─────────────────────────┐
        │ Regional Trainers │               │  Check "facilitation"   │
        │      Only         │               │        Field            │
        └───────────────────┘               └───────────┬─────────────┘
                                                        │
                    ┌───────────────────────────────────┼───────────────────────────────────┐
                    │                                   │                                   │
                    ▼                                   ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐               ┌───────────────────┐
        │ "regional_tta_    │               │   "national_      │               │      "both"       │
        │    staff"         │               │    center"        │               │                   │
        └─────────┬─────────┘               └─────────┬─────────┘               └─────────┬─────────┘
                  │                                   │                                   │
                  ▼                                   ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐               ┌───────────────────┐
        │ Regional Trainers │               │ National Center   │               │  Both (Grouped)   │
        │      Only         │               │  Trainers Only    │               │                   │
        └───────────────────┘               └───────────────────┘               └───────────────────┘
```

### Selection Criteria Summary

| Event Organizer | Facilitation | Users Returned |
|-----------------|--------------|----------------|
| Regional TTA (No National Centers) | N/A | Regional Trainers only |
| Regional PD (With National Centers) | `regional_tta_staff` | Regional Trainers only |
| Regional PD (With National Centers) | `national_center` | National Center Trainers only |
| Regional PD (With National Centers) | `both` | Both Regional and NC (grouped) |
| Regional PD (With National Centers) | Blank or unrecognized | No trainer candidates |

### Common Requirements

- User must have **SITE_ACCESS** permission
- Regional trainers must have `homeRegionId` matching the event's region
- National Center trainers are returned regardless of region

---

## 3. Approving Manager

**Location**: Session Form (`Submit.js`)

**Data Source**: `useSessionApprovers`, using `useEventAndSessionStaff` for the base candidates

### Selection Criteria

The approving manager list starts with the same base data as "Who Provided the TTA?" but applies additional filters:

| Filter | Description |
|--------|-------------|
| **Role Filter** | Regional candidates must have ECM, GSM, or TTAC; National Center-only facilitation has no additional manager-role filter |
| **Owner Exclusion** | The event owner is always excluded, including for admins |
| **Self-Exclusion** | Non-admin users cannot select themselves |
| **Regional Filter** | See table below based on event configuration |

### Manager Availability by Event Configuration

| Event Organizer | Facilitation | Approvers Available |
|-----------------|--------------|---------------------|
| Regional TTA (No National Centers) | Any | Regional trainers with ECM/GSM/TTAC roles |
| Regional PD (With National Centers) | `regional_tta_staff` | Regional trainers with ECM/GSM/TTAC roles |
| Regional PD (With National Centers) | `both` | **Regional trainers only** with ECM/GSM/TTAC roles |
| Regional PD (With National Centers) | `national_center` | National Center users (no additional manager-role requirement) |
| Regional PD (With National Centers) | Blank or unrecognized | No candidates |

### Who Can Select an Approver?

The `canSelectApprover` permission determines whether a user can choose an approving manager:

| User Role | Can Select Approver When |
|-----------|-------------------------|
| POC (Point of Contact) | Facilitation is `regional_tta_staff` or `both` |
| Regional/non-NC owner | Except `national_center`; also subject to POC restrictions if a POC |
| NC owner | Unless also a POC and blocked by the POC rule |
| Collaborator-only (neither owner nor POC) | Always passes the dropdown check |
| Admin | Always |

These are dropdown visibility rules, subject to session edit access and the current workflow view. In Regional PD with National Centers and regional/both facilitation, owner-only and collaborator-only users cannot normally edit; the POC selects the approver. See [session permissions](session-permissions.md#approver-selection-rules).

### Missing Facilitation and Admin Corrections

New sessions for Regional PD events with National Centers require a facilitation choice. Alert and direct creation links resolve the event organizer and redirect to the facilitation page before creating a session; the creation API rejects missing or invalid choices. This routing applies regardless of whether an owner, collaborator, POC, or admin is creating the session.

For Regional PD events with National Centers, blank or unrecognized session `facilitation` leaves the candidate list empty, even if the regional and National Center trainer endpoints return users. Admins can correct this on **Session summary → Training facilitation**, immediately after **Session name**, then save. Non-admin users cannot edit this field on an existing session. See [editing training facilitation](session-permissions.md#editing-training-facilitation) for access, save behavior, and the effect on existing assignments.

### Self-Exclusion Rule

Non-admin users are excluded from selecting themselves as the approving manager. Admins may select themselves if otherwise eligible, but the event owner is always excluded. A regional list containing only the owner and the current non-admin user will therefore be empty.

---

## Source Code References

| Component | File Location |
|-----------|---------------|
| Event Collaborators | `frontend/src/pages/TrainingReportForm/pages/eventSummary.js` |
| Who Provided the TTA? | `frontend/src/pages/SessionForm/pages/sessionSummary.js` |
| Approving Manager | `frontend/src/pages/SessionForm/components/Submit.js` |
| Approver Visibility | `frontend/src/hooks/useCanSelectApprover.js` |
| Approver Candidates | `frontend/src/hooks/useSessionApprovers.ts` |
| Hook Logic | `frontend/src/hooks/useEventAndSessionStaff.js` |
| Backend Handler | `src/routes/users/handlers.js` |
| User Service | `src/services/users.js` |

---

## Database Queries

### Regional Trainers Query

`getTrainingReportTrainersByRegion` in `src/routes/users/handlers.js` calls `usersByRoles` in `src/services/users.js` to retrieve users with:
- Any of the regional trainer roles (HS, SS, ECS, GS, FES, TTAC, ECM, GSM, AA)
- SITE_ACCESS permission
- `homeRegionId` matching the specified region

### National Center Trainers Query

`getTrainingReportNationalCenterUsers` calls `usersByRoles(['NC'])` to retrieve users with:
- NC (National Center) role
- SITE_ACCESS permission
- No region filtering (available across all regions)
