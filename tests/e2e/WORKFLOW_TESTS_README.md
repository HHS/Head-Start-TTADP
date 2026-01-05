# E2E Workflow Tests - User Guide

## Overview

This directory contains comprehensive end-to-end tests that exercise the TTA Hub application through complete user workflows in **headed mode** (visible browser).

## Directory Structure

```
tests/e2e/
├── workflows/              # Complete end-to-end user workflows
│   ├── activity-report-complete-workflow.spec.ts
│   ├── training-report-workflow.spec.ts
│   └── recipient-goal-lifecycle.spec.ts
├── helpers/                # Reusable helper functions
│   ├── testHelpers.ts      # Common utilities
│   └── pages/              # Page Object Models
│       ├── ActivityReportPage.ts
│       ├── RecipientRecordPage.ts
│       └── DashboardPage.ts
├── fixtures/               # Test data builders
│   └── dataBuilders.ts
├── common.ts               # Existing common helpers
└── WORKFLOW_TESTS_README.md (this file)
```

## Running Tests

### Run All Workflow Tests (Headed Mode)

```bash
# Watch tests run in a visible browser
yarn e2e --headed workflows/

# Run with a single worker (one test at a time)
yarn e2e --headed workflows/ --workers=1
```

### Run Specific Test File

```bash
# Activity Report workflows
npx playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts --headed

# Training Report workflows
npx playwright test tests/e2e/workflows/training-report-workflow.spec.ts --headed
```

### Run Specific Test Case

```bash
# Run only the complete workflow test
npx playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  -g "should complete full workflow" --headed
```

### Interactive UI Mode (Recommended for Development)

```bash
# Opens Playwright UI for visual test execution
yarn test:e2e:ui

# Then filter to workflows in the UI
```

### Debug Mode

```bash
# Opens browser and pauses at each step
npx playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts --debug
```

### Slow Motion Mode (Great for Demos)

Edit `tests/e2e/playwright.config.js` and add:

```javascript
use: {
  headless: false,
  slowMo: 500,  // Slows down by 500ms per action
  // ... rest of config
}
```

## Test Architecture

### Page Object Models (POMs)

POMs encapsulate page interactions, making tests more maintainable:

```typescript
// Example: Using ActivityReportPage
import { ActivityReportPage } from '../helpers/pages/ActivityReportPage';

const arPage = new ActivityReportPage(page);
await arPage.createNew();
await arPage.fillActivitySummary(activityData);
await arPage.submitForApproval(approverName);
```

**Available POMs:**
- `ActivityReportPage` - Activity report creation and management
- `RecipientRecordPage` - Recipient records and goal management
- `DashboardPage` - Dashboard interactions and filtering (coming soon)

### Test Data Builders

Builders provide flexible, readable test data construction:

```typescript
import { ActivitySummaryBuilder, GoalBuilder, ObjectiveBuilder } from '../fixtures/dataBuilders';

// Build custom activity data
const activity = new ActivitySummaryBuilder()
  .withDefaultRecipient()
  .withTTAType('Training')
  .withVirtual()
  .withDates('01/01/2024', '01/31/2024')
  .build();

// Build a goal with objectives
const goal = new GoalBuilder()
  .withChildSafety()
  .withObjective(
    new ObjectiveBuilder()
      .withTitle('Improve safety protocols')
      .withSingleTopic()
      .withTTAProvided('Training on safety')
      .withImplementing()
      .build()
  )
  .build();

// Use presets for common scenarios
import { TestPresets } from '../fixtures/dataBuilders';
const standardActivity = TestPresets.standardTrainingActivity();
```

### Helper Functions

Common utilities for test operations:

```typescript
import { 
  waitForAutosave, 
  fillMultiSelect, 
  fillDateInput,
  getUserFullName,
  extractReportIdFromUrl
} from '../helpers/testHelpers';

// Wait for autosave to complete
await waitForAutosave(page);

// Get current user name
const userName = await getUserFullName(page);

// Extract report ID from URL
const reportId = extractReportIdFromUrl(page.url());
```

## Writing New Tests

### 1. Create Test File

```typescript
import { test, expect } from '@playwright/test';
import { ActivityReportPage } from '../helpers/pages/ActivityReportPage';
import { TestPresets } from '../fixtures/dataBuilders';

test.describe('My New Feature Tests', () => {
  let arPage: ActivityReportPage;

  test.beforeEach(async ({ page }) => {
    arPage = new ActivityReportPage(page);
  });

  test('should do something amazing', async ({ page }) => {
    // Your test here
  });
});
```

### 2. Use Page Objects

Instead of direct page interactions:
```typescript
// ❌ DON'T: Direct interaction
await page.getByRole('button', { name: 'Submit' }).click();
await page.waitForLoadState('networkidle');

// ✅ DO: Use Page Object
await arPage.submitForApproval(approverName);
```

### 3. Use Builders for Test Data

```typescript
// ❌ DON'T: Inline data objects
await arPage.fillActivitySummary({
  startDate: '01/01/2024',
  endDate: '01/31/2024',
  ttaType: 'Training',
  // ... many fields
});

// ✅ DO: Use builders
const activity = new ActivitySummaryBuilder()
  .withDefaultRecipient()
  .withTTAType('Training')
  .withDates('01/01/2024', '01/31/2024')
  .build();

await arPage.fillActivitySummary(activity);
```

### 4. Add Meaningful Assertions

```typescript
// ❌ DON'T: Vague assertions
await expect(page.locator('.heading')).toBeVisible();

// ✅ DO: Specific, meaningful assertions
await expect(page.getByRole('heading', { name: 'Activity summary' })).toBeVisible();
await arPage.verifyReportInTable(`R01-AR-${reportId}`);
```

## Test Patterns & Best Practices

### Timeouts

```typescript
// Set timeout for long workflows
test('complex workflow', async ({ page }) => {
  test.setTimeout(180_000); // 3 minutes
  
  // ... test code
});
```

### Waiting Strategies

```typescript
// ✅ GOOD: Wait for specific state
await page.waitForLoadState('networkidle');
await expect(page.getByText('Success')).toBeVisible();

// ⚠️ AVOID: Fixed timeouts (use only when necessary)
await page.waitForTimeout(2000);
```

### Error Handling

```typescript
// Verify error messages
await expect(page.getByText(/valid resource links must start with http/i))
  .toBeVisible();

// Handle expected failures
try {
  await arPage.submitForApproval('');
  throw new Error('Should have failed validation');
} catch (e) {
  // Expected
}
```

### Data Cleanup

```typescript
test.afterEach(async ({ page }) => {
  // Clean up test data if needed
  // Note: Most tests use seeded data that resets between runs
});
```

## Test Data

### Seeded Test Data

The application seeds test data in `globalSetup.ts`:

- **User**: Existing test users with different roles
- **Recipients**: "Agency 1.a in region 1, Inc." and others
- **Grants**: Pre-configured grant numbers
- **Goals**: Standard goal templates

### Creating Dynamic Test Data

For tests requiring specific data:

```typescript
test.beforeAll(async ({ request }) => {
  // Create test-specific data via API
  await query(request, 'INSERT INTO...');
});

test.afterAll(async ({ request }) => {
  // Clean up
  await query(request, 'DELETE FROM...');
});
```

## Debugging Failed Tests

### 1. Screenshots and Videos

Failed tests automatically capture:
- Screenshots: `tests/e2e/test-results/*/test-failed-1.png`
- Videos: `tests/e2e/test-results/*/video.webm`
- Traces: `tests/e2e/test-results/*/trace.zip`

### 2. View Trace

```bash
# Open trace viewer
npx playwright show-trace tests/e2e/test-results/*/trace.zip
```

### 3. Run in Debug Mode

```bash
npx playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --debug
```

### 4. Add Debug Logs

```typescript
// Add temporary console logs
console.log('Current URL:', page.url());
console.log('Report ID:', await arPage.getCurrentReportId());

// Take manual screenshot
await page.screenshot({ path: 'debug-screenshot.png' });
```

## Common Issues & Solutions

### Issue: Test Fails with "Element not visible"

**Solution**: Add explicit waits
```typescript
await page.waitForSelector('selector', { state: 'visible' });
```

### Issue: Autosave interfering with test

**Solution**: Use `waitForAutosave()` helper
```typescript
await arPage.saveDraft();
await waitForAutosave(page);
```

### Issue: Flaky test (passes sometimes, fails others)

**Solutions**:
1. Replace `waitForTimeout` with `waitForLoadState`
2. Add explicit element visibility checks
3. Ensure proper test isolation

### Issue: Test times out

**Solutions**:
1. Increase timeout: `test.setTimeout(180_000)`
2. Check for infinite waits or hanging operations
3. Verify application is responding

## Performance Tips

### Run Tests in Parallel

```bash
# Run with 4 workers
yarn e2e --headed workflows/ --workers=4
```

⚠️ **Note**: Current config uses `workers: 1` due to potential test interference. Increase with caution.

### Run Specific Tests

```bash
# Use grep to filter
yarn e2e --headed -g "complete workflow"

# Run single file
yarn e2e --headed workflows/activity-report-complete-workflow.spec.ts
```

## CI/CD Integration

Tests run in headless mode in CI:

```yaml
# .circleci/config.yml
- run:
    name: E2E Tests
    command: yarn e2e:ci
```

For local testing that matches CI:
```bash
yarn e2e:ci
```

## Contributing

### Adding New Page Objects

1. Create file in `helpers/pages/`
2. Extend with methods for all page interactions
3. Use consistent method naming
4. Add TypeScript interfaces for data structures
5. Document complex interactions

### Adding New Builders

1. Create builder class in `fixtures/dataBuilders.ts`
2. Follow builder pattern with fluent interface
3. Add preset methods for common scenarios
4. Export from `TestPresets` if generally useful

### Code Review Checklist

- [ ] Uses Page Objects instead of direct selectors
- [ ] Uses builders for test data
- [ ] Has meaningful test descriptions
- [ ] Includes specific assertions
- [ ] Has appropriate timeouts
- [ ] Cleans up test data if needed
- [ ] Passes in headed mode
- [ ] Documented if complex

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Project README](../../README.md)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)

## Support

For questions or issues:
1. Check this README
2. Review existing test examples
3. Ask in #engineering Slack channel
4. Create GitHub issue with test reproduction steps
