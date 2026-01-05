
# TTAHUB-2759

## Task
The task is to create a table of "session reports" at the bottom of the Training report regional dashboard

## Further information
Data for the events and sessions is generally stored in the JSONB field "data," with some exceptions 

## Specifications for frontend
- Table should scroll
- Heading should be "Training Reports" (despite that fact that the data is session reports)
- One row per session (event ID and event title will be duplicated when multiple sessions)
- Should match the appearance of the Activity reports table
- Fields that would overflow should use the Tooltip/underline pattern as in the ActivityReportsTable
- Component is @frontend/src/components/TooltipWithCollection.js
- Array fields (topics) will be a single value per line with a underline/tooltip to display them all

## Table Columns
Where session.event represents the inner join in SQL/Sequelize and session.data represents the JSONB data column

Event ID (session.event.data.eventId)
Event title (session.event.data.eventName)
Session name (session.data.sessionName)
Session start date (session.data.startDate)
Session end date (session.data.endDate)
Topics (session.data.objectiveTopics)

## Relevant Files/Context

Regional Dashboard page
@frontend/src/pages/RegionalDashboard/components/TrainingReportDashboard.js

(Training reports table should go at the bottom of this in it's own grid row)

Activity reports variation, for reference
@frontend/src/pages/RegionalDashboard/components/ActivityReportDashboard.js

(The training reports table should match the Activity reports table at the bottom of that page)
@frontend/src/components/ActivityReportsTable/index.js

Session services
@src/services/sessionReports.ts

Events service
@src/services/event.ts

Data model, sessions
@src/models/sessionReportPilot.js

Data model, events 
@src/models/eventReportPilot.js

Figma Design
@https://www.figma.com/design/u2NNSt3aTvC27pTl5S4sKi/TR-s-on-Regional-dashboard?node-id=3620-6392&m=dev

## Implementation details
All code should be robustly tested. After each file is changed, add a test if a relevant test doesn't exist, run it, and debug.

Table includes sorting and pagination. All columns will need to be sortable.
Initial sort will be PK for sessions (session.id desc)
Default page size for table is 10

### Frontend
- Use the USDWS CSS system with utility classes if at all possible
- Create a new TrainingReportsTable component
- Otherwise, reuse existing components if possible. 
- Table has select all checkbox and a checkbox next to each row. 
- Table has an "export reports" button that matches the Activity reports table (export selected or all)
- This functionality should be fully implemented
- Table should use CSS and responsive props from activity report table

### Backend
- Add a new route in @src/services/sessionReports.ts that returns sessions in the format needed for the table (GET /)
- The route should take a "format" query param and return data as JSON (default) or as a CSV
- The CSV format option should optionally return all sessions. Match the columns from the table exactly. For array values, separate with a newline. 
- Data size is small now. Affordances for scale should be added if possible.
- Table includes pagination and will need to accept filters. Don't worry about filters to start. The filters will apply to the included EventReportPilot model as in this file @src/widgets/helpers.js scopes.trainingReport. Simply pass in an empty array as a default param to the service for now.
- Use typescript strictly.
- Add a new handler to @src/routes/sessionReports/handlers.js and the route to @src/routes/sessionReports/index.js. Use existing error handling patterns
