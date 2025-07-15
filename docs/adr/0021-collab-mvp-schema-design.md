# Proposed Schema for Collaboration Reports MVP

## Status

Proposed

## Context

[TTAHUB-3473](https://jira.acf.gov/browse/TTAHUB-3473) is tracking the work to create an MVP (Minimum Viable Product) for Collaboration (collab) Reports. Collab reports are a new entity within the TTA Hub and as such new database constructs ( tables, indices etc.) are needed. This ADR will document a proposed schema to serve as basis for the database design, prior to implementation.

## Decision

The following is proposed design of the tables required to support the collab report MVP. Non-Primary key indices have not been included as it is not yet clear if any are needed ( can be added during the MVP process as needed). Data types and and attributes have been expressed as PostgreSQL provided constructs, rather than the abstractions provided by [Sequelize](https://sequelize.org/docs/v7/models/data-types/)


### Terminology

The following are a list of mnemonics and abbreviations used through the rest of the section:

- AUTO - Auto Generated/SERIAL Value
- FK - Foreign Key
- PK - Primary Key

### Overall Design Comments

- The `enum` type has been used heavily given that there are many collab reports attributes that are presented to the user as a list of options rather than arbitrary strings. These could also be represented as dictionary-style tables in their own right if desired.
- "Supporting tables" ( i.e. those that exist only to represent a non-scalar attribute of a single collab report ) have been designed without any auto-generated PK column, instead using a multiple column PK (of which, the associated collab report ID is always included). This enforces inherent uniqueness of the additional primary key values without additional attributes / logic.

### Tables

#### CollabReports

Purpose: This is the top-level "root" table for Collaboration Reports. Scalar properties of collab reports ( that are not calculated at run/read time ) should be stored as columns here. Non-scalar properties are stored in other tables and that all share the `reportId` column in this table as a primary key.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| reportId | INTEGER | Yes | No | none (generated) | PK, AUTO | |
| name | VARCHAR | Yes | No | String |||
| status | ENUM | Yes | No | None/String || `[DRAFT,SUBMITTED,REVIEWED,NEEDS_APPROVAL,APPROVED]` |
| startDate | DATE | Yes | No | YYYYMMDD |||
| endDate | DATE | Yes | No | YYYYMMDD |||
| duration | SMALLINT | Yes | No | non-negative integer |||
| isStateActivity | boolean | Yes | No | Binary Radio Buttons || If there will EVER be a third option to regional/state then this should be a different type, but assume this is unlikely |
| conductMethod | enum | Yes | No | CHOICE ||`[EMAIL, PHONE, IN_PERSON, VIRTUAL]`|
| description | TEXT | Yes | No | Text Area |||

##### CollabReportSpecialists

Purpose: The `CollabReportSpecialist` table is used to store the one-to-many relationship between a collab report & the collaboration specialists that are part of it. This is the only relationship that needs to be expressed, and there should never be duplicate collaboration specialists for the same report.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| collabReportId | INTEGER | Y | N | NONE | PK, FK (`CollabReport.reportId`)| |
| specialistId | INTEGER | Y | N | "Collaborating Specialist" | PK, FK (`User.userId`)| |

##### CollabReportReasons

Purpose: The `CollabReportReasons` table is used to store the one-to-many relationship between A collab report & the reason(s) ( i.e. purpose ) of the report. The UI presents a short list of reasons, of which one or more are selected. These could be stored as top-level `boolean` types, however expanding the list of reasons in the future would require new columns. Instead, a single column is used to store a well known mnemonic for each ( these mnemonics could also be broken out into their own distinct `CollabReportReasonDict` with a foreign key pointed back)

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| collabReportId | INTEGER | Y | N | NONE | PK, FK (`CollabReport.reportId`)||
| reasonId | ENUM | Y | N | See above | PK | see proposed mnemonic values below |

Basic enum ( or Dictionary ) Values

| reasonId mnemonic | Associated UI text |
|-------------------|--------------------|
| PARTICIPATE_WORK_GROUPS | Participate in national, regional, state and local working groups and meetings. |
| SUPPORT_COORDINATION | Support partnerships, coordination, and collaboration with state/regional partners |
| AGG_REGIONAL_DATA | Aggregate, analyze, and/or present regional data |
| DEVELOP_PRESENTATIONS | Develop and provide presentations, training, and resources to RO and/or state/regional partners |  

##### CollabReportActivityStates

Purpose: The `CollabReportActivityStates` table is used to store the one-to-many relationship that _may exist_ between a collab report and the states where the activity takes place. A collab report can either represent _state_ or _regionally_ activity. If _state_ activity is chosen, then there needs to be one _or more_ rows in this table for the collab report in question. For region based collab reports, there should be no rows here.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| collabReportId | INTEGER | Y | N | NONE | PK, FK (`CollabReport.reportId`) ||
| activityStateCode | ENUM | Y | N | String | PK | If we have state Dictionary/table, but if so that would be a FK here rather than an enum of all the state codes |

##### CollabReportGoals

Purpose: The `CollabReportGoals` table is used to store the one-to-many relationship that _may exist_ between a collab report and the goals it supports. A collab report can have zero or more goals. In the UI, the "Goals" field is gated by a radio button ( i.e. If "yes" is chosen, one or more states are required) so optionally a boolean column could be added to the `CollabReport` table, but this is largely superfluous and not needed for the underlying model.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| collabReportId | INTEGER | Y | N | NONE | PK, FK (`CollabReport.reportId`) ||
| collabReportGoalId | ENUM | Y | N | String | PK | If there is already a table for this, but if so that would be a FK here rather than an enum of all goals |

##### CollabReportDataUsed

Purpose: The `CollabReportDataUsed` table is used to store the one-to-many relationship that _may exist_ between a collab report and the pieces of data being collected/shared/used.

Similar to the note in `CollabReportGoals` above, this multiple is gated by a boolean radio button in the UI.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| collabReportId | INTEGER | Y | N | NONE | PK, FK (`CollabReport.reportId`) ||
| collabReportDatumId | ENUM | Y | N | String | PK | If there is already a table for this, or if this is a new list of goals.|
| collabReportDatumOther | VARCHAR| N | Y | String || If `collabReportDatumId` is `OTHER`, then this is a required field. Otherwise not |

##### CollabReportSteps

Purpose: The `CollabReportSteps` table is used to store the one-to-many relationship that exists between a collab report and the steps it is comprised of. Steps include an ordering value ( i.e. Step `n-1` comes before step `n`)

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| collabReportId | INTEGER | Y | N | NONE | PK, FK (`CollabReport.reportId`) ||
| collabStepId | INTEGER | Y | N | NONE | PK, AUTO ||
| collabStepDetail | TEXT | Y | N | String | | |
| collabStepCompleteDate | DATE | Y | N | YYMMDD ||  |
| collabStepPriority | SMALLINT | Y | N | NONE || The purpose of this column is to de-couple the auto-generated primary key from the actual step number shown. Purpose this is to support re-ordering steps without having to actually delete & update the rows involved. |

## Consequences

These are all brand new tables so there is no impacting on any existing Database Schema.
