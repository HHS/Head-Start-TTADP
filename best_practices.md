# Best practices: code authoring and review

This document is intended as an onboarding guide for new engineers as they create code. It should also be leveraged by LLM based code tools for authroing and reviewing code.

## Backend

### Schema design
- Avoid the use of enum arrays. This should be a joined table, as there is a Sequelize bug that causes intermittent bugs where the wrong data type is returned.

### Sequelize
- Avoid the use of _hooks_ that perform database writes. It's completely fine to leverage a beforeUpdate hook in order to validate data (this is an ideal place for the use of runtime schema validation). Updating data with hooks obfuscates operations in a way that makes debugging more difficult and leads to unexpected states. Instead, update associated data directly in services.
- When authoring a new filter, sanitize all data for SQL injection, as the filters are usually derived from URLs. sequelize.escape will do some of this, but independent validation of expected types (are all region IDs numbers, for example) should also be performed.

## Frontend

### Hook and component based architecture
- Whenever possible, leverage existing hooks. For example, the common pattern of fetching data with a useEffect and storing it in a useState is encapsulated with the "useFetch" hook
- Whenever possible, reuse existing components. This makes the codebase more maintainable and consistent, and leans into the strengths of React.

### CSS
- Use the USWDS utility classes rather than authoring new CSS whenever possible. (It is usually possible)
- Avoid complicated nesting. One level should be the maximum, as deep nesting becomes unreadable almost immediately.
- Prefer vanilla CSS over SCSS. Long term, we should consider abandoning SCSS as the platform offers us full access to all the features without needing to opt-in to a third party dependency. 
