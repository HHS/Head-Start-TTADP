# Code Review: PR #3261 - Recipient Spotlight Frontend Integration

## Summary

This PR integrates the backend recipient spotlight API with the frontend, implementing table functionality, overview widgets, indicator filtering, and general filters. The changes involve significant refactoring of the backend service (removing static test data and replacing with production SQL queries) and adding loading state handling to the frontend.

**Files Changed:**
- `src/services/recipientSpotlight.js` (290 additions, 502 deletions)
- `src/services/recipientSpotlight.test.js` (770 additions, 92 deletions)
- `src/routes/recipientSpotlight/handlers.js` (34 additions, 16 deletions)
- `src/routes/recipientSpotlight/handlers.test.js` (16 additions, 8 deletions)
- `frontend/src/pages/RegionalDashboard/components/RecipientSpotlightDashboardCards.js` (27 additions, 0 deletions)
- `frontend/src/pages/RegionalDashboard/components/RecipientSpotlightDataController.js` (1 addition, 0 deletions)

**Overall Assessment:** The implementation is solid with comprehensive test coverage (770 new test lines). However, there are several critical security concerns related to SQL injection vulnerabilities, accessibility issues with the loading state, and a hardcoded date in production SQL that must be addressed before merge.

---

## Approval Status

❌ **Changes Requested**

### Critical issues that must be addressed before merge:
1. SQL injection vulnerabilities (grant IDs, sort parameters, indicator filtering)
2. Hardcoded date '2025-01-20' in production SQL query
3. Accessibility - missing ARIA attributes on loading state
4. Missing input validation for pagination limits and regions array

### Recommended for follow-up:
- Add security test cases for SQL injection attempts
- Improve SQL documentation and extract magic numbers to constants
- Add frontend loading state tests
- Consider database query performance monitoring

---

## Critical Issues

### **CRITICAL: SQL Injection Vulnerability in Grant ID Filter**

**File**: `src/services/recipientSpotlight.js:85`

**Problem**: The grant IDs are directly interpolated into the SQL query without sanitization. While these IDs come from the database via Sequelize, this pattern is dangerous and could lead to SQL injection if the source of grant IDs ever changes or if there's a bug in upstream code.

```javascript
const grantIdFilter = hasGrantIds ? `gr.id IN (${grantIdList.join(',')})` : 'TRUE';
```

**Impact**: Potential SQL injection attack vector. This violates security best practices and project guidelines (best_practices.md: "sanitize all data for SQL injection").

**Suggested Fix**:
```javascript
// Validate grant IDs are integers
const validatedGrantIds = grantIdList.map(id => {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) {
    throw new Error(`Invalid grant ID: ${id}`);
  }
  return numId;
});

// Build the filter safely
const grantIdFilter = hasGrantIds
  ? `gr.id IN (${validatedGrantIds.join(',')})`
  : 'TRUE';

// Even better: use Sequelize's built-in QueryInterface for identifier escaping
// or construct this part of the query differently to avoid interpolation
```

**Additional Context**: Defense-in-depth security principle suggests validating at each layer. Even though grant IDs are from the database, explicit validation as integers adds safety.

---

### **CRITICAL: Hardcoded Date in Production SQL**

**File**: `src/services/recipientSpotlight.js:198-201`

**Problem**: The SQL query contains a hardcoded date `'2025-01-20'` that filters monitoring reviews. This appears to be temporary/debugging code that made it into production.

```sql
WHERE mr."deletedAt" IS NULL
  AND (
    mr."reportDeliveryDate" > '2025-01-20'
    OR
    mr."sourceCreatedAt" > '2025-01-20'
  )
```

**Impact**: Data integrity issue. This hardcoded date will cause the query to exclude valid historical data and become increasingly incorrect as time passes. This looks like temporary test/debug code.

**Suggested Fix**:
```javascript
// If this is meant to filter recent reviews (e.g., last 12 months):
WHERE mr."deletedAt" IS NULL
  AND (
    mr."reportDeliveryDate" >= NOW() - INTERVAL '12 months'
    OR
    mr."sourceCreatedAt" >= NOW() - INTERVAL '12 months'
  )

// OR if it's a specific business requirement cutoff date:
// 1. Define constant at top of file with clear comment explaining why
const MONITORING_REVIEW_CUTOFF = new Date('2025-01-20');

// 2. Use parameterized query
WHERE mr."deletedAt" IS NULL
  AND (
    mr."reportDeliveryDate" > :reviewCutoff
    OR
    mr."sourceCreatedAt" > :reviewCutoff
  )

// 3. Pass via replacements
replacements: {
  reviewCutoff: MONITORING_REVIEW_CUTOFF,
  // ... other params
}
```

**Additional Context**: If this date has business meaning, document it clearly with a comment. Otherwise, remove it or use a relative date calculation.

---

### **CRITICAL: SQL Injection Vulnerability in Dynamic Sorting**

**File**: `src/services/recipientSpotlight.js:374-376`

**Problem**: The `sortBy` and `direction` parameters from user input are directly interpolated into the SQL query without validation. A malicious user could craft values that inject SQL code.

```javascript
ORDER BY "${sortBy || 'recipientName'}" ${direction || 'ASC'}${
  (sortBy === 'indicatorCount' || sortBy === 'regionId') ? ', "recipientName" ASC' : ''
}
```

**Impact**: Critical SQL injection vulnerability. User-controlled input is directly inserted into SQL query.

**Suggested Fix**:
```javascript
// At the top of the function, add strict validation
const VALID_SORT_COLUMNS = ['recipientName', 'indicatorCount', 'lastTTA', 'regionId'];
const VALID_DIRECTIONS = ['ASC', 'DESC', 'asc', 'desc'];

// Validate and sanitize inputs
const sanitizedSortBy = VALID_SORT_COLUMNS.includes(sortBy)
  ? sortBy
  : 'recipientName';

const sanitizedDirection = VALID_DIRECTIONS.includes(direction)
  ? direction.toUpperCase()
  : 'ASC';

// Use sanitized values in query
ORDER BY "${sanitizedSortBy}" ${sanitizedDirection}${
  (sanitizedSortBy === 'indicatorCount' || sanitizedSortBy === 'regionId')
    ? ', "recipientName" ASC'
    : ''
}
```

**Additional Context**: This is a common vulnerability pattern. Per best_practices.md, filters derived from URLs must be sanitized for SQL injection. The handler receives these from `req.query` which is user-controlled.

---

### **CRITICAL: SQL Injection in Indicator Filter Construction**

**File**: `src/services/recipientSpotlight.js:118-125`

**Problem**: While the indicator labels are mapped through `INDICATOR_LABEL_TO_COLUMN`, there's no validation that the resulting column names are safe before interpolating them into the SQL WHERE clause.

```javascript
const includeConditions = indicatorsToInclude
  .map((label) => INDICATOR_LABEL_TO_COLUMN[label])
  .filter(Boolean)
  .map((col) => `"${col}" = TRUE`);

if (includeConditions.length > 0) {
  indicatorWhereClause = `(${includeConditions.join(' OR ')})`;
}
```

**Impact**: If INDICATOR_LABEL_TO_COLUMN mapping is ever modified or if undefined labels slip through, SQL injection is possible.

**Suggested Fix**:
```javascript
// Validate column names against a whitelist
const VALID_INDICATOR_COLUMNS = [
  'childIncidents',
  'deficiency',
  'newRecipients',
  'newStaff',
  'noTTA',
  'DRS',
  'FEI'
];

if (indicatorsToInclude.length > 0) {
  const includeConditions = indicatorsToInclude
    .map((label) => INDICATOR_LABEL_TO_COLUMN[label])
    .filter(col => col && VALID_INDICATOR_COLUMNS.includes(col))
    .map((col) => `"${col}" = TRUE`);

  if (includeConditions.length > 0) {
    indicatorWhereClause = `(${includeConditions.join(' OR ')})`;
  }
}
```

**Additional Context**: Double validation (mapping + whitelist) provides defense-in-depth against configuration errors or future refactoring mistakes.

---

### **CRITICAL: Accessibility - Non-Accessible Loading State**

**File**: `frontend/src/pages/RegionalDashboard/components/RecipientSpotlightDashboardCards.js:51-52`

**Problem**: The loading state uses a plain `<span>` element without any ARIA attributes to announce the loading state to screen readers. Users with assistive technology won't be informed that content is loading.

```jsx
<div className="usa-table-container--scrollable padding-x-3 padding-y-2 display-flex flex-justify-center">
  <span className="text-base-dark">Loading...</span>
</div>
```

**Impact**: Violates WCAG 2.1 AA requirements. Screen reader users receive no indication that content is being fetched, creating a confusing and inaccessible user experience.

**Suggested Fix**:
```jsx
<div
  className="usa-table-container--scrollable padding-x-3 padding-y-2 display-flex flex-justify-center"
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  <span className="text-base-dark">
    Loading recipient spotlight data...
  </span>
</div>
```

**Additional Context**:
- `role="status"` indicates this is a status message
- `aria-live="polite"` ensures screen readers announce the loading state
- `aria-busy="true"` indicates the region is currently updating
- More descriptive text helps all users understand what is loading
- Consider using a USWDS loading spinner component if available

---

## High Priority Issues

### **HIGH: Missing Input Validation for Priority Indicators**

**File**: `src/routes/recipientSpotlight/handlers.js:69-78`

**Problem**: The priority indicator filter values are extracted from query parameters without validation before being passed to the service. Defense-in-depth principle suggests validating at each layer, not just in the service.

**Impact**: Potential for unexpected behavior or security issues if malicious input is crafted. Makes debugging harder.

**Suggested Fix**:
```javascript
// Define valid indicators at the top of the file
const VALID_INDICATORS = [
  'Child incidents',
  'Deficiency',
  'New recipient',
  'New staff',
  'No TTA',
  'DRS',
  'FEI'
];

// Extract indicator filter params with validation
const indicatorFilterIn = req.query['priorityIndicator.in[]']
  || req.query['priorityIndicator.in'];
let indicatorsToInclude = [];
if (indicatorFilterIn) {
  const rawIndicators = Array.isArray(indicatorFilterIn)
    ? indicatorFilterIn
    : [indicatorFilterIn];

  // Only include valid indicators
  indicatorsToInclude = rawIndicators.filter(
    indicator => typeof indicator === 'string' && VALID_INDICATORS.includes(indicator)
  );

  // Log warning if invalid indicators were filtered out
  if (rawIndicators.length !== indicatorsToInclude.length) {
    auditLogger.log('warn', 'Invalid priority indicators filtered', {
      userId,
      requestedIndicators: rawIndicators,
      validIndicators: indicatorsToInclude
    }, logContext);
  }
}
```

**Additional Context**: Per best_practices.md: "sanitize all data for SQL injection, as the filters are usually derived from URLs."

---

### **HIGH: No Pagination Limit Validation**

**File**: `src/routes/recipientSpotlight/handlers.js:29-30`

**Problem**: The `limit` parameter is parsed from user input but not validated for reasonable bounds. A malicious user could request an extremely large limit (e.g., 999999999) which could cause performance issues or memory exhaustion.

**Impact**: Potential denial-of-service vector or performance degradation.

**Suggested Fix**:
```javascript
// Define bounds
const MAX_LIMIT = 100; // reasonable maximum
const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 1;

// Parse and validate pagination params
const parsedOffset = offset ? Math.max(0, parseInt(offset, DECIMAL_BASE)) : 0;
let parsedLimit = limit ? parseInt(limit, DECIMAL_BASE) : DEFAULT_LIMIT;

// Validate parsing succeeded and apply bounds
if (isNaN(parsedOffset)) {
  res.status(httpCodes.BAD_REQUEST).json({
    error: 'Invalid offset parameter'
  });
  return;
}

if (isNaN(parsedLimit) || parsedLimit < MIN_LIMIT) {
  parsedLimit = DEFAULT_LIMIT;
} else if (parsedLimit > MAX_LIMIT) {
  parsedLimit = MAX_LIMIT;
}
```

**Additional Context**: This is a common API security pattern to prevent resource exhaustion attacks. Most APIs have reasonable limits (10-100 records per page).

---

### **HIGH: Insufficient Test Coverage for SQL Injection Edge Cases**

**File**: `src/services/recipientSpotlight.test.js`

**Problem**: While test coverage is excellent overall (770 new lines), there are no tests that verify the service handles malicious input safely (e.g., SQL injection attempts in sort parameters, malicious indicator labels).

**Impact**: Without explicit security tests, regressions could introduce vulnerabilities. Security bugs are often caught too late without explicit tests.

**Suggested Fix**:

Add security test cases:

```javascript
describe('Security - Input Validation', () => {
  it('handles SQL injection attempts in sortBy parameter safely', async () => {
    const scopes = createScopesWithRegion(REGION_ID);

    // Should not crash or execute malicious SQL
    await expect(
      getRecipientSpotlightIndicators(
        scopes,
        'recipientName"; DROP TABLE Recipients; --',
        'ASC',
        0,
        10,
        [],
        [REGION_ID],
      )
    ).resolves.toBeDefined();

    // Verify Recipients table still exists
    const recipientCount = await Recipient.count();
    expect(recipientCount).toBeGreaterThan(0);
  });

  it('handles SQL injection in direction parameter safely', async () => {
    const scopes = createScopesWithRegion(REGION_ID);

    await expect(
      getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC; DELETE FROM "Recipients"; --',
        0,
        10,
        [],
        [REGION_ID],
      )
    ).resolves.toBeDefined();
  });

  it('handles malicious indicator labels safely', async () => {
    const scopes = createScopesWithRegion(REGION_ID);

    await expect(
      getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        ['Child incidents", TRUE); DROP TABLE "Recipients"; --'],
        [REGION_ID],
      )
    ).resolves.toBeDefined();
  });
});
```

**Additional Context**: Security testing should be part of standard test suites, especially for services that construct SQL dynamically.

---

### **HIGH: Inconsistent Error Handling for Empty Regions Array**

**File**: `src/services/recipientSpotlight.js:107`

**Problem**: The service expects `regions` parameter to be a non-empty array. If it's empty, the SQL query will have `IN ()` which is invalid SQL. This would cause a runtime error despite handler validation.

**Impact**: Application crash or unhandled error if regions array is empty due to a bug in handler validation.

**Suggested Fix**:
```javascript
// Add validation at the start of getRecipientSpotlightIndicators:
if (!regions || regions.length === 0) {
  throw new Error('At least one region must be specified');
}

// Validate region IDs are numeric
const validRegions = regions.map(r => {
  const regionId = parseInt(r, 10);
  if (isNaN(regionId) || regionId <= 0) {
    throw new Error(`Invalid region ID: ${r}`);
  }
  return regionId;
});

// Use validRegions throughout:
replacements: {
  regions: validRegions,
  cutoffDate: INACTIVATION_CUT_OFF,
},
```

**Additional Context**: Services should validate inputs defensively even if handlers validate. This prevents bugs during refactoring or when services are called from new contexts.

---

## Medium Priority Issues

### **MEDIUM: Complex SQL Query Lacks Adequate Documentation**

**File**: `src/services/recipientSpotlight.js:128-379`

**Problem**: The 250+ line SQL query is complex with multiple CTEs and joins, but lacks inline comments explaining the business logic of each CTE. The deficiency calculation has a TODO comment suggesting the logic may not be finalized.

**Impact**: Maintainability issue. Future developers will struggle to understand and modify this query safely.

**Suggested Fix**:

Add inline SQL comments explaining each major section:

```sql
-- grant_recipients CTE: Base dataset joining grants and recipients
-- filtered by scopes. This represents the grants the user can see.
grant_recipients AS (
  SELECT
    r.id rid,
    r.name AS rname,
    gr."regionId" region,
    gr.id grid,
    gr.number grnumber
  FROM "Recipients" r
  JOIN "Grants" gr
    ON r.id = gr."recipientId"
  WHERE ${grantIdFilter}
),

-- recipients CTE: Aggregates grants per recipient-region pair
-- and calculates lastTTA (most recent approved activity report).
-- This is the base for our result set.
recipients AS (
  SELECT
    rid,
    rname,
    region,
    ARRAY_AGG(DISTINCT grid)::text[] grant_ids,
    MAX(ar."startDate") last_tta
  FROM grant_recipients
  -- ... rest of query
),

-- all_grants CTE: Retrieves ALL grants for each recipient,
-- not just those matching the filter. Needed because indicators
-- like "new recipient" and "new staff" need full grant history.
all_grants AS (
  -- ... query
),

-- all_reviews CTE: Pre-filters monitoring reviews for performance.
-- Only includes reviews with delivery/creation after 2025-01-20.
-- TODO: Confirm this date filter with product team - why 2025-01-20?
all_reviews AS (
  -- ... query
),
```

**Additional Context**: Consider creating a separate documentation file or diagram explaining the overall data flow and business rules.

---

### **MEDIUM: Hardcoded Magic Numbers in SQL**

**File**: `src/services/recipientSpotlight.js:214, 265, 277, 287, 302`

**Problem**: Time intervals like `'12 months'`, `'4 years'`, `'2 years'` are hardcoded throughout the SQL query without constants or explanation. These are business rules that may need adjustment.

**Impact**: Changing these requirements means finding and updating multiple locations. Risk of inconsistency if requirements change.

**Suggested Fix**:

```javascript
// At the top of the function, define business rule constants:
const BUSINESS_RULES = {
  CHILD_INCIDENT_LOOKBACK_MONTHS: 12,
  NEW_RECIPIENT_THRESHOLD_YEARS: 4,
  NEW_STAFF_THRESHOLD_YEARS: 2,
  TTA_LOOKBACK_MONTHS: 12,
};

// Then use in SQL (via template literals or comments):
-- Child incidents: RAN citations in last ${BUSINESS_RULES.CHILD_INCIDENT_LOOKBACK_MONTHS} months
WHERE review_type = 'RAN'
  AND review_status = 'Complete'
  AND rdd >= NOW() - INTERVAL '12 months'  -- ${BUSINESS_RULES.CHILD_INCIDENT_LOOKBACK_MONTHS} months
```

**Additional Context**: This makes business logic self-documenting and easier to test with different values. Consider making these configurable via environment variables for different environments.

---

### **MEDIUM: Potential Race Condition with Loading State**

**File**: `frontend/src/pages/RegionalDashboard/components/RecipientSpotlightDashboardCards.js:35-57`

**Problem**: The component relies on a `loading` prop to hide stale data, but there's no guarantee about the timing of when `loading` becomes false versus when `recipients` is updated. If the parent sets `loading=false` before updating `recipients`, stale data could briefly flash.

**Impact**: Poor user experience with flickering or stale data during transitions.

**Suggested Fix**:

Consider using a ref to track the request ID in the parent component:

```javascript
// In the parent component (DataController), ensure atomic updates:
const [state, setState] = useState({
  recipients: [],
  loading: true,
  requestId: 0
});

// When fetching:
const fetchData = async (filters) => {
  const currentRequestId = state.requestId + 1;
  setState(prev => ({ ...prev, loading: true, requestId: currentRequestId }));

  try {
    const data = await fetchRecipients(filters);

    // Only update if this is still the most recent request
    setState(prev => {
      if (prev.requestId === currentRequestId) {
        return { ...prev, recipients: data, loading: false };
      }
      return prev; // Ignore stale response
    });
  } catch (error) {
    // Handle error
  }
};
```

**Additional Context**: While not a critical bug, this pattern improves reliability. Consider using a data-fetching library like React Query which handles race conditions automatically.

---

### **MEDIUM: Incomplete Frontend Loading State Testing**

**File**: `frontend/src/pages/RegionalDashboard/components/RecipientSpotlightDashboardCards.js`

**Problem**: The new loading state functionality is not covered by tests. There's no verification that the loading state renders correctly or that stale data isn't shown during loading.

**Impact**: Risk of regressions in future changes. Loading state bugs can be confusing for users.

**Suggested Fix**:

Add test cases:

```javascript
import { render } from '@testing-library/react';
import RecipientSpotlightDashboardCards from './RecipientSpotlightDashboardCards';

describe('RecipientSpotlightDashboardCards', () => {
  const mockProps = {
    recipients: [{
      recipientId: 1,
      regionId: 1,
      recipientName: 'Test Recipient',
      grantIds: ['123'],
      childIncidents: false,
      deficiency: true,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 1
    }],
    count: 1,
    sortConfig: { sortBy: 'recipientName', direction: 'asc', activePage: 1, offset: 0 },
    requestSort: jest.fn(),
    handlePageChange: jest.fn(),
    perPage: 10,
    perPageChange: jest.fn(),
    filters: [],
    userHasOnlyOneRegion: false
  };

  it('shows loading state when loading prop is true', () => {
    const { getByText, queryByText } = render(
      <RecipientSpotlightDashboardCards {...mockProps} loading={true} />
    );

    expect(getByText(/Loading/i)).toBeInTheDocument();
    // Verify recipients are not rendered
    expect(queryByText('Test Recipient')).not.toBeInTheDocument();
  });

  it('shows recipients when loading is false', () => {
    const { getByText, queryByText } = render(
      <RecipientSpotlightDashboardCards {...mockProps} loading={false} />
    );

    expect(queryByText(/Loading/i)).not.toBeInTheDocument();
    expect(getByText('Test Recipient')).toBeInTheDocument();
  });

  it('loading state is accessible to screen readers', () => {
    const { container } = render(
      <RecipientSpotlightDashboardCards {...mockProps} loading={true} />
    );

    const loadingRegion = container.querySelector('[role="status"]');
    expect(loadingRegion).toHaveAttribute('aria-live', 'polite');
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true');
  });
});
```

---

## Low Priority Issues

### **LOW: Inconsistent Error Response Format**

**File**: `src/routes/recipientSpotlight/handlers.js:47, 60, 90`

**Problem**: The handler returns `403 Forbidden` and `404 Not Found` with no body. Best practice is to include descriptive error messages for client debugging.

**Impact**: Makes debugging harder for frontend developers and API consumers.

**Suggested Fix**:
```javascript
// Instead of:
res.sendStatus(httpCodes.FORBIDDEN);

// Use:
res.status(httpCodes.FORBIDDEN).json({
  error: 'Access denied: no regions specified or insufficient permissions'
});

// And:
res.status(404).json({
  error: 'No spotlight data found for the specified criteria'
});
```

---

### **LOW: Magic String Repeated in Tests**

**File**: `src/services/recipientSpotlight.test.js:1108`

**Problem**: The role validation logic expects `'cfo'` or `'director'`, reflected in test line 1108. These should be defined as constants rather than magic strings.

**Impact**: If role names change, multiple locations need updating.

**Suggested Fix**:

```javascript
// In a shared constants file or service:
export const LEADERSHIP_ROLES = ['cfo', 'director'];

// In SQL query (line 276):
WHERE pp.role IN (:leadershipRoles)

// With replacements:
replacements: {
  leadershipRoles: LEADERSHIP_ROLES,
  // ... other params
}

// In tests:
role: LEADERSHIP_ROLES[0], // 'cfo'
```

---

### **LOW: Generic Loading Message**

**File**: `frontend/src/pages/RegionalDashboard/components/RecipientSpotlightDashboardCards.js:52`

**Problem**: The loading message "Loading..." is generic and doesn't tell users what is loading.

**Impact**: Suboptimal user experience.

**Suggested Fix**:
```jsx
<span className="text-base-dark">
  Loading recipient spotlight data...
</span>
```

Or use a USWDS loading spinner component for better visual feedback.

---

### **LOW: Missing JSDoc Comments on Complex Service Function**

**File**: `src/services/recipientSpotlight.js:20`

**Problem**: The `getRecipientSpotlightIndicators` function is complex with many parameters but lacks JSDoc explaining the contract.

**Impact**: Developer experience - harder to understand function without reading implementation.

**Suggested Fix**:

```javascript
/**
 * Retrieves recipient spotlight indicators based on filters, sorting, and pagination.
 *
 * Indicators include:
 * - Child incidents: >1 RAN citation in last 12 months
 * - Deficiency: At least one uncorrected deficiency finding
 * - New recipient: Oldest grant < 4 years old
 * - New staff: Director/CFO hired within 2 years
 * - No TTA: No approved activity reports in last 12 months
 *
 * @param {Object} scopes - Sequelize scopes for filtering grants
 * @param {string} sortBy - Column to sort by (recipientName, indicatorCount, lastTTA, regionId)
 * @param {string} direction - Sort direction (ASC or DESC)
 * @param {number} offset - Number of records to skip (pagination)
 * @param {number} limit - Maximum number of records to return
 * @param {string[]} indicatorsToInclude - Indicator labels to filter by (empty = no filter)
 * @param {number[]} regions - Region IDs to include
 * @returns {Promise<Object>} Object with { recipients, count, overview }
 */
export async function getRecipientSpotlightIndicators(
```

---

## Testing Recommendations

### Positive Observations:
- **Excellent test coverage**: 770 new lines in recipientSpotlight.test.js
- Tests cover edge cases: multi-region recipients, secondary sorting, indicator filtering
- Good test data lifecycle management with beforeAll/afterAll
- Proper cleanup to avoid cross-test contamination
- Tests for empty datasets and error conditions

### Additional Test Scenarios:

1. **Accessibility testing** (add to frontend tests)
2. **Security testing** (SQL injection attempts)
3. **Boundary testing** (offset larger than result set, limit of 0 or negative)
4. **Integration test** for full handler → service → database flow
5. **Performance test** with large datasets to ensure query executes within acceptable time

---

## Performance Considerations

### Query Performance:
The SQL query is complex with multiple CTEs and joins. Recommendations:

1. **Ensure proper indexes exist** on:
   - `Grants.recipientId`, `Grants.regionId`, `Grants.status`, `Grants.inactivationDate`
   - `ActivityReports.calculatedStatus`, `ActivityReports.startDate`
   - `MonitoringReviews.reportDeliveryDate`, `MonitoringReviews.sourceCreatedAt`
   - `ProgramPersonnel.grantId`, `ProgramPersonnel.effectiveDate`, `ProgramPersonnel.role`
   - `Goals.grantId`
   - `ActivityReportGoals.goalId`, `ActivityReportGoals.activityReportId`

2. **Monitor query execution time** in production, especially with large datasets. Consider adding query timing logs.

3. **The `COUNT(*) OVER()` window function** (line 371) is efficient for pagination - good choice.

4. **Consider query caching** if this endpoint is frequently called with the same parameters.

---

## Positive Highlights

✅ **Excellent Test Coverage**: 770 new test lines demonstrating comprehensive edge case coverage

✅ **Well-Structured SQL**: Clean CTE-based query organization makes complex logic manageable

✅ **Good Error Resilience**: Tests create and clean up their own data, no reliance on seed data

✅ **Proper Authorization**: Handler validates user permissions before querying data

✅ **User Experience**: Loading state prevents stale data display during fetching

✅ **Comprehensive Indicator Filtering**: Supports multiple indicators with OR logic

✅ **Proper Secondary Sorting**: Ensures consistent ordering even when primary sort values match

✅ **Production-Ready Queries**: Moved from static test data to real SQL queries with proper filters

---

## References

- **WCAG 2.1 AA Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **OWASP SQL Injection Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- **Sequelize Security Best Practices**: https://sequelize.org/docs/v6/core-concepts/raw-queries/#replacements
- **Project Best Practices**: `/best_practices.md` (Sequelize section on SQL injection sanitization)
- **AGENTS.md**: Guidelines on error handling and logging
