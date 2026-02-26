# 24. Schema Validation with Joi

## Status

Accepted

## Context

The backend API has grown without a consistent strategy for validating incoming request payloads. This has led to:

- **Missing request validation** on many routes, allowing malformed or incomplete data to reach business logic and the database.
- **Inconsistent validation patterns** — some routes validate manually with ad-hoc conditionals, others not at all.
- **Lack of type safety at the boundary** between the frontend and backend, making it difficult to reason about what shape of data a route expects.

Joi (`joi.dev`) was already in limited use in the codebase — specifically in `src/models/schemas/activityReport.js`, where it validates required Activity Report fields at submission and approval gates, and in Sequelize model `beforeUpdate` hooks where it enforces data integrity before writes reach the database. This established precedent and familiarity with the library within the team.

## Decision

We will adopt Joi as the standard library for backend schema validation across the application.

- **Scope**: Backend only. This decision does not apply to frontend validation.
- **Use cases**:
  - **API request validation**: All new Express routes must define a Joi schema for any request parameters, query strings, or body payloads they accept.
  - **Model lifecycle hooks**: Joi schemas are used in Sequelize `beforeUpdate` (and similar) hooks to validate data integrity before writes reach the database.
- **New routes**: All new routes must define a Joi schema for accepted inputs.
- **Existing routes**: Will be retrofitted with Joi schemas incrementally, prioritized by risk and usage frequency.
- **Validation failure behavior**: Requests that fail schema validation will be rejected with a `400 Bad Request` response containing a descriptive error message. The request will not reach the route handler.
- **Schema location**: Schemas should be colocated with the route, service, or model they validate, following the existing pattern in `src/models/schemas/`.

No alternatives were formally evaluated. Joi was the clear choice given its existing footprint in the codebase, its maturity, and the team's existing familiarity with it.

## Consequences

**Easier:**
- Catching invalid or malformed input early, at both the API boundary and before database writes.
- Onboarding new engineers — Joi schemas serve as living documentation of what a route or model expects.
- Reducing defensive checks scattered throughout service and handler code.
- Consistent, predictable error responses for API consumers.

**More difficult / trade-offs:**
- Existing routes require incremental schema authoring as they are retrofitted. Until a route is covered, validation gaps remain.
- Schema definitions must be kept in sync with any changes to route contracts or model shapes.
- Joi does not generate TypeScript types natively; if stronger type guarantees across the stack are needed in the future, a different or complementary tool (e.g., Zod) may need to be evaluated.
