# Best practices: code authoring and review

This document captures project-specific constraints for engineers and LLM-based code tools.
For general coding standards, follow existing style in the surrounding code.

## Code Style
- Prefer creating new backend files as TypeScript.
- Follow existing style in the surrounding code.
- Ensure changes pass Biome lint checks.
- Reuse existing components and hooks before creating new ones.

## Testing
- Add or update tests for behavior changes unless the change is purely documentation or formatting.
- All tests run against the same database instance — never rely on seed data.
- Create test data in `beforeAll`/`beforeEach`, destroy in `afterAll`/`afterEach`.
- Use `Promise.all()` for multiple async operations in setup.
- Use transactions where appropriate to maintain data integrity.
- Mock database interaction when a real database isn't required.
- Avoid network calls in unit tests; mock external services.
- Prefer focused unit/integration tests; add E2E only when the user-facing flow changes.
- If tests are skipped, note why and suggest follow-up coverage.

For detailed testing patterns including database state management helpers, see `docs/guides/testing.md`.

## Backend

### Sequelize
- **No hooks that write data.** Validation in hooks (e.g., `beforeUpdate`) is fine. Update associated data directly in services — hooks that write obfuscate operations and lead to unexpected states.
- **No enum arrays.** Use a joined table instead. There is a Sequelize bug that intermittently returns the wrong data type from enum arrays.
- **Sanitize filter inputs for SQL injection.** Filters are derived from URLs. `sequelize.escape` is insufficient alone — independently validate expected types (e.g., confirm all region IDs are numbers).
- Avoid raw SQL unless necessary; use Sequelize scopes/models.
- Dates stored in JSONB fields use `MM/DD/YYYY` format. When sorting or comparing these values in SQL, use `TO_DATE(field, 'MM/DD/YYYY')` rather than `CAST(field AS DATE)` — PostgreSQL's `CAST AS DATE` expects ISO format and will throw a `DateTimeParseError` (error code `22007`) on `MM/DD/YYYY` values. Use `NULLIF(field, '')` to guard against empty strings: `TO_DATE(NULLIF(field, ''), 'MM/DD/YYYY')`. See `src/scopes/trainingReports/startDate.js` for reference examples.

### Migrations
- Always include reversible `down` logic.
- Name migrations clearly: `verb_object_table`.
- Prefer transactions for multi-step writes.

### Error Handling & Logging
- Use consistent error handling patterns in the surrounding code; avoid introducing new styles.
- Log actionable context (request IDs, relevant entity IDs) without leaking PII.

### Validation
- We leverage the Joi.dev library for schema validation. Example: [src/models/hooks/activityReport.js](src/models/hooks/activityReport.js)


## Frontend

### Hook and Component Reuse
- Reuse existing components for consistency and maintainability. Use hooks if they exist (example: use the `useFetch` hook instead of manual `useEffect` + `useState` for data fetching) and create new hooks if change can be reusable 
- Use `@trussworks/react-uswds` components.

### CSS
- Use USWDS utility classes instead of authoring new CSS.
- One level of nesting maximum.
- Prefer vanilla CSS over SCSS.

### WYSIWYG Fields
- We use React Draft (`frontend/src/components/RichEditor.js`).
- **Disable autosave on forms with WYSIWYG editors.** Autosave triggers `reset()` which destroys cursor position and in-progress text. See `frontend/src/utils/formRichTextEditorHelper.js` for the guard pattern.

## Release Hygiene
- Update OpenAPI specs (`docs/openapi/`) when API shape changes.
- Update `docs/adr/` if an architecture decision is introduced or changed.
