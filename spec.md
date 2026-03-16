# TTAHUB-5042

Task: Refactor the current ActivityReportObjectiveCitatations table as defined here (@src/models/activityReportObjectiveCitation.js) with a new many to many junction to Citations (@src/models/citation.js)

## Breakdown
- Inspect current implementation. Ensure there are API tests and Open API documentation that validate the API contract
- Create a Joi validator that validates the backend request
- Create a migration if necessary. Update relevant model files.
- Update services that interact with this model
- Preserve API