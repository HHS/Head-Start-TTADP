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
- "Link Tables" ( i.e. those that exist only to represent non-scalar attributes of a single collab report ) have been designed with an auto-generated PK column, and a foreign key reference to the `CollabReports` table, following the convention in use by other table.
- A singular column named `id` has been used a primary key for all tables to ensure interoperability with existing audit log framework.

### Tables

#### CollabReports

Purpose: This is the top-level "root" table for Collaboration Reports. Scalar properties of collab reports ( that are not calculated at run/read time ) should be stored as columns here. Non-scalar properties are stored in other tables and that all share the `reportId` column in this table as a primary key.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| id | INTEGER | Yes | No | none (generated) | PK, AUTO | |
| name | VARCHAR | Yes | No | String |||
| status | ENUM | Yes | No | None/String || `['draft', 'submitted', 'reviewed', 'needs_approval', 'approved']` |
| startDate | DATE | Yes | No | YYYYMMDD |||
| endDate | DATE | Yes | No | YYYYMMDD |||
| duration | SMALLINT | Yes | No | non-negative integer |||
| isStateActivity | boolean | Yes | No | Binary Radio Buttons || If there will EVER be a third option to regional/state then this should be a different type, but assume this is unlikely |
| conductMethod | enum | Yes | No | CHOICE ||`['email', 'phone', 'in_person', 'virtual']`|
| description | TEXT | Yes | No | Text Area |||
| createdAt | TIMESTAMP_ZONE | Yes | No | none (generated) || Default value: now() |
| updatedAt | TIMESTAMP_ZONE | Yes | No | none (generated) || Default value: now() |
| deletedAt | TIMESTAMP_ZONE | No | Yes | none (generated) || Default value: now() |

##### CollabReportSpecialists - link table

Purpose: The `CollabReportSpecialist` table is used to store the one-to-many relationship between a collab report & the collaboration specialists that are part of it. This is the only relationship that needs to be expressed, and there should never be duplicate collaboration specialists for the same report.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| id | INTEGER | Y | N | none (generated) | PK, AUTO | |
| collabReportId | INTEGER | Y | N | NONE | FK (`CollabReport.id`)| |
| specialistId | INTEGER | Y | N | "Collaborating Specialist" | FK (`User.userId`)| |
| createdAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |
| updatedAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |

A new `UNIQUE` BTREE index is needed to enforce uniqueness, named `collab_report_specialists_specialist_id_collab_report_id`. The index will have the following keys:

- collabReportId
- specialistId

##### CollabReportReasons - link table

Purpose: The `CollabReportReasons` table is used to store the one-to-many relationship between A collab report & the reason(s) ( i.e. purpose ) of the report. The UI presents a short list of reasons, of which one or more are selected. These could be stored as top-level `boolean` types, however expanding the list of reasons in the future would require new columns. Instead, a single column is used to store a well known mnemonic for each ( these mnemonics could also be broken out into their own distinct `CollabReportReasonDict` with a foreign key pointed back)

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| id | INTEGER | Y | N | none (generated) | PK, AUTO | |
| collabReportId | INTEGER | Y | N | NONE | FK (`CollabReport.id`)||
| reasonId | ENUM | Y | N | See above || `['participate_work_groups', 'support_coordination', 'agg_regional_data', 'develop_presentations']` |
| createdAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |
| updatedAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |

A new `UNIQUE` BTREE index is needed to enforce uniqueness, named `collab_report_reasons_reason_id_collab_report_id`. The index will have the following keys:

- collabReportId
- reasonId

Basic enum ( or Dictionary ) Values

| reasonId mnemonic | Associated UI text |
|-------------------|--------------------|
| participate_work_groups | Participate in national, regional, state and local working groups and meetings. |
| support_coordination | Support partnerships, coordination, and collaboration with state/regional partners |
| agg_regional_data | Aggregate, analyze, and/or present regional data |
| develop_presentations | Develop and provide presentations, training, and resources to RO and/or state/regional partners |

##### CollabReportActivityStates - link table

Purpose: The `CollabReportActivityStates` table is used to store the one-to-many relationship that _may exist_ between a collab report and the states where the activity takes place. A collab report can either represent _state_ or _regionally_ activity. If _state_ activity is chosen, then there needs to be one _or more_ rows in this table for the collab report in question. For region based collab reports, there should be no rows here.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| id | INTEGER | Y | N | none (generated) | PK, AUTO | |
| collabReportId | INTEGER | Y | N | NONE | FK (`CollabReport.id`) ||
| activityStateCode | ENUM | Y | N | String || If we have state Dictionary/table, but if so that would be a FK here rather than an enum of all the state codes |
| createdAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |
| updatedAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |

A new `UNIQUE` BTREE index is needed to enforce uniqueness, named `collab_report_activity_states_activity_state_code_collab_report_id`. The index will have the following keys:

- collabReportId
- activityStateCode

##### CollabReportGoals - link table

Purpose: The `CollabReportGoals` table is used to store the one-to-many relationship that _may exist_ between a collab report and the goals it supports. A collab report can have zero or more goals. In the UI, the "Goals" field is gated by a radio button ( i.e. If "yes" is chosen, one or more states are required) so optionally a boolean column could be added to the `CollabReport` table, but this is largely superfluous and not needed for the underlying model.

The goals chosen are each a foreign key to the GoalTemplates.standard table/column. I don't think this value should be represented as its own value in this table to ensure there is no drift from the FK.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| id | INTEGER | Y | N | none (generated) | PK, AUTO | |
| collabReportId | INTEGER | Y | N | NONE | FK (`CollabReport.id`) ||
| goalTemplateId | INTEGER | Y | N | NONE | FK (`GoalTemplates.id`) | The actual value a user chooses is a string that is from the `GoalTemplates.standard` column |
| createdAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |
| updatedAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |

A new `UNIQUE` BTREE index is needed to enforce uniqueness, named `collab_report_goals_collab_report_goal_Template_id_collab_report_id`. The index will have the following keys:

- collabReportId
- collabReportGoalTemplateId

##### CollabReportDataUsed - link table

Purpose: The `CollabReportDataUsed` table is used to store the one-to-many relationship that _may exist_ between a collab report and the pieces of data being collected/shared/used.

Similar to the note in `CollabReportGoals` above, this multiple is gated by a boolean radio button in the UI.

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| id | INTEGER | Y | N | none (generated) | PK, AUTO | |
| collabReportId | INTEGER | Y | N | NONE | FK (`CollabReport.id`) ||
| collabReportDatum | ENUM | Y | N | String || `['census_data', 'child_abuse_and_neglect','child_safety','child_family_health','disabilities','foster_care','homelessness','kids_count','licensing_data','ohs_monitoring','pir','tta_hub','other']`|
| createdAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |
| updatedAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |

A new `UNIQUE` BTREE index is needed to enforce uniqueness, named `collab_report_data_used_collab_report_datum_id_collab_report_id`. The index will have the following keys:

- collabReportId
- collabReportDatum

##### CollabReportSteps - link table

Purpose: The `CollabReportSteps` table is used to store the one-to-many relationship that exists between a collab report and the steps it is comprised of. Steps include an ordering value ( i.e. Step `n-1` comes before step `n`)

| ColumnName | DataType | Required? | Allow Null? |  UI DataType | Attributes | Notes |
|------------|----------|-----------|-------------|--------------|------------|-------|
| id | INTEGER | Y | N | none (generated) | PK, AUTO | |
| collabReportId | INTEGER | Y | N | NONE | FK (`CollabReport.id`) ||
| collabStepId | INTEGER | Y | N | NONE | FK ||
| collabStepDetail | TEXT | Y | N | String | | |
| collabStepCompleteDate | DATE | Y | N | YYMMDD ||  |
| collabStepPriority | SMALLINT | Y | N | NONE || The purpose of this column is to de-couple the auto-generated primary key from the actual step number shown. Purpose this is to support re-ordering steps without having to actually delete & update the rows involved. |
| createdAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |
| updatedAt | TIMESTAMP_ZONE | Y | N | none (generated) || Default value: now() |

A new `UNIQUE` BTREE index is needed to enforce uniqueness, named `collab_report_steps_collab_step_id_collab_report_id`. The index will have the following keys:

- collabReportId
- collabStepId

## Consequences

These are all brand new tables so there is no impacting on any existing Database Schema.
