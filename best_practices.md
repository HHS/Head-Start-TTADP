# Best practices: code authoring and review

This document is intended as an onboarding guide for new engineers as they create code. 
It should also be leveraged by LLM based code tools for authoring and reviewing code.

## Code Style
- Prefer creating new backend files as Typescript
- Prefer following existing style in the surrounding code.
- Ensure changes pass lint checks after work is complete.

## Testing
- Add or update tests for behavior changes unless the change is purely documentation or formatting.
- Prefer focused unit/integration tests; add E2E only when the user-facing flow changes.
- If tests are skipped, note why and suggest follow-up coverage.
- Avoid network calls in unit tests; mock external services.
- Keep in mind that all tests run against the same database instance.
- Avoid relying on seed data in tests; always create/destroy test data within tests.
- Use transactions where appropriate to maintain data integrity
- Mock db interaction when a real database isn't required
- Create test data in `beforeAll`/`beforeEach`, destroy in `afterAll`/`afterEach`
- Use `Promise.all()` for multiple async operations in setup

For detailed testing patterns including database state management helpers, see `docs/guides/testing.md`.

### Error Handling & Logging
- Use consistent error handling patterns in the surrounding code; avoid introducing new styles.
- Log actionable context (request IDs, relevant entity IDs) without leaking PII.

## Backend

### Database
- Always include migrations for schema changes; name them clearly (verb + object).
- Ensure migrations are reversible; include `down` logic.
- Prefer transactions for multi-step writes.
- Avoid the use of enum arrays. This should be a joined table, as there is a Sequelize bug that causes intermittent bugs where the wrong data type is returned.

### Sequelize

- Avoid the use of _hooks_ that perform database writes. It's completely fine to leverage a beforeUpdate hook in order to validate data (this is an ideal place for the use of runtime schema validation). Updating data with hooks obfuscates operations in a way that makes debugging more difficult and leads to unexpected states. Instead, update associated data directly in services.
- When authoring a new filter, sanitize all data for SQL injection, as the filters are usually derived from URLs. sequelize.escape will do some of this, but independent validation of expected types (are all region IDs numbers, for example) should also be performed.
- Avoid raw SQL unless necessary; use Sequelize scopes/models.

## Frontend

### Hook and component based architecture
- Whenever possible, leverage existing hooks. For example, the common pattern of fetching data with a useEffect and storing it in a useState is encapsulated with the "useFetch" hook
- Whenever possible, reuse existing components. This makes the codebase more maintainable and consistent, and leans into the strengths of React.

### CSS
- Use the USWDS utility classes rather than authoring new CSS whenever possible. (It is usually possible)
- Avoid complicated nesting. One level should be the maximum, as deep nesting becomes unreadable almost immediately.
- Prefer vanilla CSS over SCSS. Long term, we should consider abandoning SCSS as the platform offers us full access to all the features without needing to opt-in to a third party dependency. 

### WYSIWYG Fields
- We use a WYSIWYG libray called "React Draft" (example: @frontend/src/components/RichEditor.js)
- When we use this component within our React Hook Form forms (our standard form library), it is vital that we disable features like autosave, as this can cause re-rendering and loss of text for users actively entering text in those fields. An example of this pattern is documented along with the helper function here: @frontend/src/utils/formRichTextEditorHelper.js


## Other

### Release Hygiene
- Update documentation when behavior has been changed
- Update OpenAPI specs when API shape changes.
- Update docs/ADRs if a decision or architecture change is introduced.
