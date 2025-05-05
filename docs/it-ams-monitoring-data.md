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
3. Relevant data is processed and stored in the PostgreSQL database at **8:30 AM EST**.
4. The system matches reviews with grant recipients and auto-generates goals.
5. The HSES system processes its copy at **8:00 AM EST** to ensure visibility.
6. Specialists can manually add objectives based on compliance citations.

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

## Import Process
- **Schedule:** 8:30 AM EST.
- **Trigger:** Runs automatically but may require manual execution if it fails.
- **Issue:** The import job is complex, and manual imports are sometimes needed.

*Note: For debugging purposes, the import currently runs on the following schedule: 2:30 AM, 8:30 AM, 2:30 PM, and 8:30 PM.

## FAQs
### Q: What does this feature do?
A: It tracks monitoring reviews, ensuring grant recipients receive TTA to help address compliance issues.

### Q: How often is data updated?
A: The system updates daily at 8:30 AM EST, after HSES processes its copy at 8:00 AM EST.

### Q: Can specialists manually edit goals?
A: Yes, specialists can add objectives to automatically created monitoring goals.

### Q: What happens if data import fails?
A: If the automatic import fails, an engineer must manually run an import command in production.

### Q: What needs to happen within monitoring data in order for citations to be selectable on ARs?
A: The intent is for citations to be available to select within the time period that TTA is being provided and ARs written. So:
- As a prerequisite, a **Review** needs to reach a `Complete` status while being linked an `Active` **Finding** so a **Monitoring Goal** is created and available for use in ARs
- The **Finding** must be linked through a **MonitoringFindingStandards** record to a **MonitoringStandards** record, which contains the citation text
- As long as the **Finding** remains in `Active` status, it will remain selectable on ARs using the monitoring goal.
- Regardless of **Finding** status, if the _most recent_ **Review** has not reached a `Complete` state, then the citation will remain selectable
- Once _both_ the most recent **Review** is `Complete` _and_ the **Finding** reaches one of the terminal states (`Corrected`,`Withdrawn`,`Closed`), then the citation will not appear or be selectable.

## 📎 Additional Documentation
For developer details, see: [Technical Documentation](monitoring-tech.md)
For diagram, see [High Level Diagram](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/sequence-diagrams/data-ingestion-monitoring-goal.puml)
