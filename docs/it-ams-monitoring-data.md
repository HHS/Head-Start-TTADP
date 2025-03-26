# IT-AMS Monitoring Data Integration Guide

## Overview
The TTA Hub integrates with IT-AMS to retrieve and process monitoring data related to Head Start recipients’ reviews and findings. The main steps are:
- Monitoring review data is securely transferred from IT-AMS.
- The system automatically imports the data and stores it in the database (PostgreSQL).
- The findings generate automatic goals for grant recipients to address compliance issues.
- The HSES also receives this data for program management visibility. This happens in parallel to the TTA Hub's import.

## How the Integration Works
1. IT-AMS generates XML data files containing monitoring reviews daily.
2. The TTA Hub downloads the data via SFTP from `cloud.gov`.
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

## FAQs
### Q: What does this feature do?
A: It tracks monitoring reviews, ensuring grant recipients receive TTA to help address compliance issues.

### Q: How often is data updated?
A: The system updates daily at 8:30 AM EST, after HSES processes its copy at 8:00 AM EST.

### Q: Can specialists manually edit goals?
A: Yes, specialists can add objectives to automatically created monitoring goals.

### Q: What happens if data import fails?
A: If the automatic import fails, an engineer must manually run an import command in production.

## 📎 Additional Documentation
For developer details, see: [Technical Documentation](docs/monitoring-tech.md)
For diagram, see [High Level Diagram](http://www.plantuml.com/plantuml/proxy?src=https://raw.githubusercontent.com/HHS/Head-Start-TTADP/main/docs/sequence-diagrams/data-ingestion-monitoring-goal.puml)
