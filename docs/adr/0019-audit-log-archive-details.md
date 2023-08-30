# ADR: Archiving Audit Logs Implementation

## Status
Proposed

## Context
The need to archive audit logs has arisen to ensure efficient management of growing data and maintain application performance. We have identified two options for implementing the archiving process.

## Decision
We are evaluating the following alternatives for archiving audit logs:

### Option 1: Logical Entity Archiving
This option involves implementing a logical entity archiving process using Node.js cron functionality with JavaScript/TypeScript code. The process follows strict rules based on an entity reaching a terminal state. The steps involved in this option include:

- System components:
  - Building a cron job to run archival on the first of every month.
  - Packaging each archive type (and optionally entity instance) into a separate file.
  - Creating an archival db table to maintain the metadata (who/what/when/where/why).
  - Including the fileId in the archival file and updating the system to avoid purging these S3 files.

- What to collect/remove:
	- Activity Report Data
	    - Archive & remove all audit data for reports that have been approved/deleted for over X months across all the tables directly related to the report.
	- Goal/Objective Data
	    - Archive/Remove all audit log entries for data that has been replaced. We did not clear/reset the audit as part of the goal refactor last year. As a result there are records for the old data, and new data with the same id's. This makes retrieving useful data from the audit log more difficult.
	    - Does this data need to be archived before removal from the active log?
	    - Archive & remove all audit data for goals that have been closed/complete for over X months across all the tables directly related to the goal. This includes the data relating to objectives attached to closed/complete goals.
	- User/Permission Data
	    - Archive & remove all audit data for Users that have had login permissions revoked for over X months across all the tables directly related to the user.
	    - Archive & remove login audit data for all Users for logins over X months old across the Users table.
	- Grant/Recipient Data
	    - Archive & remove data associated to inactive grants for over X months.

With this option, the data most likely not to change will be archived and grouped by its logical association. This allows for a more focused and targeted set if/when data needs to be restored, and only the needed data needs to be referenced. A disadvantage of this option is that it is a more complex solution and not generic, as each new logical entity would need to be added to the archival process as it is added. A disadvantage of this option is that we will need to dedicate resources to implement, test and monitor the solution.

### Option 2: Time-Slice Archiving
This option involves archiving all audit log tables based on a time slice, such as quarterly or monthly. The archival process covers all tables, including any new tables added during future application development. An admin UI will display a list of archives based on the time covered, allowing easy selection for restoration purposes.

Advantages of this option include its simplicity and the ability to handle new tables without requiring code changes. However, a potential disadvantage arises when restoring data related to an individual activity report with large spans between modifications. In such cases, multiple time-based archives would need to be restored, although these scenarios are expected to be rare.

## Consequences
Both options provide a means to archive audit logs and manage growing data effectively. However, they differ in complexity, flexibility, and resource requirements.

Option 1, logical entity archiving, offers more targeted archiving and facilitates selective restoration of specific data. However, it requires adding new logical entities to the archival process and dedicating resources for implementing archiving of future tables.

Option 2, time-slice archiving, simplifies the archival process and accommodates new tables seamlessly. It requires minimal code changes and offers a straightforward admin UI for restoration. However, it may result in the need to restore multiple archives for specific cases with large spans between modifications.

The final decision will depend on factors such as the frequency and nature of data restoration needs, resource availability, and the trade-off between flexibility and implementation effort. Further discussions and assessments with stakeholders are recommended to determine the most suitable approach for archiving growing audit logs.