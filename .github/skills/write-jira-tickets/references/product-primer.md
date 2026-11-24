# TTA Hub product primer

_Last updated: 2026-11-17. Refresh this when navigation, roles or permissions change. Sources are listed in `repo-map.md`._

## What the TTA Hub is

The **Office of Head Start (OHS) Training and Technical Assistance (TTA) Smart Hub** is where OHS regional staff and TTA providers record and track the training and technical assistance they give to Head Start **recipients** (grantee organizations). It is used across the Head Start **regions**. Most data and permissions are scoped to a region.

## Vocabulary

| Term | Meaning |
|---|---|
| Recipient | A Head Start grantee organization that receives TTA. Older docs say "grantee". |
| Grant | A funding award to a recipient. A recipient can have several. |
| TTA | Training and technical assistance. |
| Activity Report (AR) | A record of a TTA activity, written by a specialist, sent to a manager for approval. |
| Training Report (TR) | A training event with one or more **Sessions**. Engineers call it `EventReportPilot`; in tickets, say **Training Report**. |
| Session | One session within a Training Report. Engineers call it `SessionReportPilot`; in tickets, say **Session**. |
| Collaboration Report | A record of collaboration work that isn't direct TTA to a recipient. |
| Communication Log | A log of communications with a recipient, kept per region. |
| TTA Request | A request for TTA (feature-flagged; not all users see it). |
| Goal / Objective | What a recipient is working toward (Goal) and the steps under it (Objective). Goals can be closed or suspended with a reason. |
| Standard goal / goal template | Pre-defined goals from OHS that recipients can use. |
| Monitoring / citation / review | OHS compliance reviews of recipients. Findings and citations show in the Regional Dashboard and drive some TTA. |
| National Center (NC) | National TTA providers who facilitate some Training Report sessions. |
| POC | Point of contact: regional staff who coordinate a Training Report. |
| Feature flag | Turns a feature on for selected users before full release. |
| What's New | In-app release notes page. |
| Site alert | Banner message admins can publish to all users. |

## Report statuses

- Activity Reports: **draft → submitted → approved**, or **needs action** when a manager sends it back for changes. Reports can be deleted.
- Training Reports: **Not started → In progress → Complete**, or **Suspended**.

## Who uses it

Each user has a **role** (their job title) and a set of **permissions per region**.

**Roles** (exact names, from `packages/common/src/constants.js`): Central Office, Other Federal Staff, National Center, Regional Program Manager, COR, Supervisory Program Specialist, Program Specialist, Grants Specialist, Customer Service Contract, TTAC, Admin. Assistant, Early Childhood Manager, Early Childhood Specialist, Family Engagement Specialist, Grantee Specialist Manager, Grantee Specialist, Health Specialist, System Specialist, Interim Management Team, Integrated Service Team, Grants Management Specialist.

Common groupings:
- **Specialists** write Activity Reports and deliver TTA. Examples: Grantee Specialist, Health Specialist, System Specialist, Early Childhood Specialist, Family Engagement Specialist.
- **Managers and approvers** approve reports. Examples: Grantee Specialist Manager, Early Childhood Manager, Supervisory Program Specialist.
- **Federal staff** mostly view and oversee. Examples: Program Specialist, Regional Program Manager, Central Office.

**Permissions** are granted per region by admins:

| Permission | What it allows |
|---|---|
| Site access | Log in at all |
| Admin | Admin tools (users, flags, site alerts, courses…) |
| Read/write activity reports | Create and edit Activity Reports in that region |
| Read reports | View reports in that region |
| Approve activity reports | Approve ARs in that region |
| Unlock approved reports | Reopen an approved report |
| Read/write training reports | Create and edit Training Reports |
| POC training reports | Act as point of contact on Training Reports |
| Read/write, review, approve, backup approve TTA requests | TTA Request workflow. Approve and backup approve are mutually exclusive in a region. |

Training Report sessions have their own detailed rules (owner, collaborator, POC, approver, admin). Fetch `docs/training-reports/session-permissions.md` before writing permission criteria for Training Reports.

**When writing a ticket, always state which roles and which permissions in which region can see or do the thing.** If it isn't known, mark it `[NEEDS DECISION]` with owner Product / OHS.

## Main areas (left navigation)

- **Home**: welcome page with widgets (account, notifications).
- **TTA Reporting**
  - Activity Reports
  - Collaboration Reports
  - Communication Log
  - Training Reports (tabs by status)
  - TTA Requests (feature-flagged)
- **Dashboards**
  - Goal Dashboard
  - Quality Assurance Dashboard (feature-flagged)
  - Regional Dashboard (tabs: Activity Reports, Training Reports, All Reports, Recipient Spotlight, Monitoring)
  - Resource Dashboard
- **Recipient TTA Records**: search for a recipient and see their goals, reports and history per region.

Other places:
- **Account / Manage account**: profile, **My Groups** (saved groups of recipients), and email notification preferences.
- **Notifications**: in-app notifications, plus an archive.
- **What's New**: release notes.
- **Admin**: admin-only tools, for example users and permissions, feature flags, site alerts, courses, national centers and digest previews.

## Things that commonly need deciding in TTA Hub tickets

- **Region scoping**: which regions' data shows, and what users with several regions see.
- **Filters**: most list pages and dashboards have filters that are kept in the URL. Should the new thing respect the existing filters?
- **Email notifications**: instant or included in a digest (daily, weekly, monthly), who receives it, and whether users can opt out in their notification settings.
- **Print and export**: several dashboards have print or CSV export. Does the new content need to be included?
- **Feature flag**: should this launch to a pilot group first?
- **Accessibility**: the Hub targets WCAG 2.2 AA and Section 508.
- **Existing records**: what happens to reports or goals created before the change?
