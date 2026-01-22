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
                          │   Event Configuration   │
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
| Regional TTA (No National Centers) | Regional Trainers | HS, SS, ECS, GS, FES, TTAC, ECM, GSM |
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

The `isEvent=true` flag only affects selection when the event organizer is "Regional PD (With National Centers)" - in that case, it triggers National Center trainer selection regardless of the `facilitation` field value.

---

## 2. Who Provided the TTA? (Trainers)

**Location**: Session Form (`sessionSummary.js`)

**Data Source**: `useEventAndSessionStaff` hook

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

### Common Requirements

- User must have **SITE_ACCESS** permission
- Regional trainers must have `homeRegionId` matching the event's region
- National Center trainers are returned regardless of region

---

## 3. Approving Manager

**Location**: Session Form (`Submit.js`)

**Data Source**: `useEventAndSessionStaff` hook, then filtered by manager roles

### Selection Criteria

The approving manager list starts with the same base data as "Who Provided the TTA?" but applies additional filters:

| Filter | Description |
|--------|-------------|
| **Role Filter** | Must have ECM, GSM, or TTAC role |
| **Self-Exclusion** | Non-admin users cannot select themselves |
| **Regional Filter** | See table below based on event configuration |

### Manager Availability by Event Configuration

| Event Organizer | Facilitation | Approvers Available |
|-----------------|--------------|---------------------|
| Regional TTA (No National Centers) | Any | All users with ECM/GSM/TTAC roles |
| Regional PD (With National Centers) | `regional_tta_staff` | All trainers with ECM/GSM/TTAC roles |
| Regional PD (With National Centers) | `both` | **Regional trainers only** with ECM/GSM/TTAC roles |
| Regional PD (With National Centers) | `national_center` | National Center users with manager roles |

### Who Can Select an Approver?

The `canSelectApprover` permission determines whether a user can choose an approving manager:

| User Role | Can Select Approver When |
|-----------|-------------------------|
| POC (Point of Contact) | Facilitation is `regional_tta_staff` or `both` |
| Event Owner | Always |
| Admin | Always |

### Self-Exclusion Rule

Non-admin users are excluded from selecting themselves as the approving manager. This ensures proper separation of duties in the approval workflow.

---

## Source Code References

| Component | File Location |
|-----------|---------------|
| Event Collaborators | `frontend/src/pages/TrainingReportForm/pages/eventSummary.js` |
| Who Provided the TTA? | `frontend/src/pages/SessionForm/components/sessionSummary.js` |
| Approving Manager | `frontend/src/pages/SessionForm/components/Submit.js` |
| Hook Logic | `frontend/src/hooks/useEventAndSessionStaff.js` |
| Backend Handler | `src/routes/users/handlers.js` |
| User Service | `src/services/users.js` |

---

## Database Queries

### Regional Trainers Query

The `usersWithRegionalTrainerRoles` function in `src/services/users.js` retrieves users with:
- Any of the regional trainer roles (HS, SS, ECS, GS, FES, TTAC, ECM, GSM)
- SITE_ACCESS permission
- `homeRegionId` matching the specified region

### National Center Trainers Query

The `usersWithNationalCenterTrainerRoles` function retrieves users with:
- NC (National Center) role
- SITE_ACCESS permission
- No region filtering (available across all regions)
