# IT-AMS Monitoring Data Integration Guide

## Overview
The TTA Hub integrates with IT-AMS to retrieve and process monitoring data related to Head Start recipients’ reviews and findings. The main steps are:
- Monitoring review data is securely transferred from IT-AMS.
- The system automatically imports the data and stores it in the database (PostgreSQL).
- The findings generate automatic goals for grant recipients to address compliance issues.
- The HSES also receives this data for program management visibility. This happens in parallel to the TTA Hub's import.

## How the Integration Works
1. IT-AMS generates XML data files containing monitoring reviews daily.
2. The TTA Hub downloads the data via SFTP from IT-AMS host.
3. Relevant data is processed and stored in the PostgreSQL database at **8:30 AM EST** (workaround schedule).
4. The system matches reviews with grant recipients and auto-generates monitoring goals when criteria are met.
5. If an AR has propagated a Monitoring goal to a replacing grant, that goal is marked as 'monitoring' so it can be used like the auto-generated goals.
6. The HSES system processes its copy at **8:00 AM EST** to ensure visibility.
7. Specialists can manually add objectives based on compliance citations.

## Key System Components
- **IT-AMS**: The external system that generates monitoring review data.
- **TTA Hub**: Processes and displays monitoring data for grant recipients.
- **HSES**: A system that also receives and presents monitoring data.
- **PostgreSQL Database**: Stores imported monitoring review data.
- **SFTP**: Secure transfer mechanism for IT-AMS data.

## Database Schema (Simplified)
| **Table** | **Purpose** |
|-----------|------------|
| `MonitoringReviews` | Stores review metadata. |
| `MonitoringFindings` | Stores findings per review. |
| `MonitoringReviewLinks` | Links reviews with other entities. |
| `MonitoringReviewStatusLinks` | Tracks status changes for reviews. |

## Reference: Monitoring Status Codes
### Monitoring Finding Statuses
| `statusId` | Name                |
| ---------- | ------------------- |
| 7000       | Start               |
| 7001       | Active              |
| 7002       | Abandoned           |
| 7003       | Corrected           |
| 7004       | Dropped             |
| 7005       | Preliminary         |
| 7006       | Withdrawn           |
| 7007       | Closed              |
| 7010       | Reported            |
| 7101       | Elevated Deficiency |
| 7102       | N/A                 |

### Monitoring Finding History Statuses
| `statusId` | Name                |
| ---------- | ------------------- |
| 14000      | Start               |
| 14001      | Not Reviewed        |
| 14002      | Corrected           |
| 14003      | Not Corrected       |
| 14004      | Withdrawn           |
| 14005      | New                 |
| 14006      | Closed              |
| 14007      | Abandoned           |
| 14008      | T/TA                |
| 14009      | Dropped             |
| 14101      | Elevated Deficiency |
| 14102      | N/A                 |
### Monitoring Review Statuses
| `statusId` | Name                    |
| ---------- | ----------------------- |
| 6000       | Start                   |
| 6001       | Scheduled               |
| 6002       | Team Access Provided    |
| 6003       | Onsite                  |
| 6004       | RTL Final Edit          |
| 6005       | In Analysis             |
| 6006       | Complete                |
| 6007       | Cancelled               |
| 6009       | Rejected                |
| 6013       | Data Cleansing          |
| 6014       | Inactive                |
| 6015       | In Progress             |
| 6017       | Analysis                |
| 6018       | Editing                 |
| 6019       | Editing/Proofing        |
| 6020       | Pre-Region Review       |
| 6021       | Ready for Region        |
| 6022       | Out to Region           |
| 6023       | Post-Region Review      |
| 6024       | SME Review              |
| 6025       | Final Proofing          |
| 6026       | Final Production        |
| 6027       | Print for Signature     |
| 6029       | In for Signature        |
| 6030       | Signed                  |
| 6031       | Shipped                 |
| 6032       | On Hold                 |
| 6033       | QC                      |
| 6034       | Revision                |
| 6035       | Edit 2                  |
| 6036       | OGC Review              |
| 6037       | Waiting to Print        |
| 6038       | Final Read              |
| 6039       | Final Editing           |
| 6040       | Final Revision          |
| 6043       | Provisional             |
| 6044       | Planner Assignment      |
| 6045       | Review Planning         |
| 6046       | Team Planning           |
| 6047       | Regional Planning       |
| 6048       | Ready for Print         |
| 6050       | Follow Up Recs          |
| 6052       | Final Recs Approval     |
| 6053       | Report Not Issued       |
| 6054       | RFL Questions           |
| 6100       | Report Signed           |
| 6110       | Delivered               |
| 6120       | Follow Up Recs Complete |

## Import Process
- **Schedule:** 8:30 AM EST (workaround).
- **Trigger:** Runs automatically but may require manual execution if it fails.
- **Issue:** The import job is complex, and manual imports are sometimes needed.

## FAQs
### Q: What does this feature do?
A: It tracks monitoring reviews, ensuring grant recipients receive TTA to help address compliance issues.

### Q: How often is data updated?
A: The system updates daily at 8:30 AM EST, after HSES processes its copy at 8:00 AM EST.

### Q: Can specialists manually edit goals?
A: Specialists can add objectives to automatically created monitoring goals, or goals on their replacement grants once they have been marked by the daily job.

### Q: What happens if data import fails?
A: If the automatic import fails, an engineer must manually run an import command in production.

### Q: What needs to happen within monitoring data in order for citations to be selectable on ARs?
A: The intent is for citations to be available to select within the time period that TTA is being provided and ARs written. So:
- A **Review** must exist and link to a **Finding** through **MonitoringFindingHistories**.
- The **Finding** must be linked through **MonitoringFindingStandards** to a **MonitoringStandards** record, which contains the citation text.
- Citations are considered open if either:
  - the Finding is `Active` or `Elevated Deficiency`, or
  - the most recent review for the Finding has a `NULL` report delivery date (review not yet delivered).
- Citations are filtered to reviews delivered after the monitoring cutoff date and before the AR start date.
- Citations are only returned for grants with an open (not Closed/Suspended) Monitoring goal.

## Monitoring Goal Creation Logic (Current)
Monitoring goals are created only when all of the following are true:
- Monitoring goal creation is enabled (`ENABLE_MONITORING_GOAL_CREATION=true`).
- The review type is in the allowlist: `AIAN-DEF`, `RAN`, `Follow-up`, `FA-1`, `FA1-FR`, `FA-2`, `FA2-CR`, `Special`.
- The review `reportDeliveryDate` is between the cutoff date (`2025-01-21`) and now.
- There is an `Active` or `Elevated Deficiency` finding linked to the review and grantee.
- The grant maps to an active grant via `GrantRelationshipToActive` and is not CDI.
- There is no existing open monitoring goal on the active or replaced grant.

## Finding Type Display
Monitoring finding display uses determination first logic:
- If `determination = Concern`, display **Area of Concern**.
- Else if `determination` is present, display it.
- Else fall back to `findingType`.

## 📎 Additional Documentation
For developer details, see: [Technical Documentation](monitoring-tech.md)
For diagram, see [High Level Diagram](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/sequence-diagrams/data-ingestion-monitoring-goal.puml)
