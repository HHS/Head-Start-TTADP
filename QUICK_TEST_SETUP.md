# Quick Setup Guide for Running E2E Tests

## Prerequisites Check

You need Node.js v22.20.0 (as specified in `.nvmrc`)

Check your current Node version:
```bash
node --version
```

If you don't have v22.20.0, install it using nvm:
```bash
# If you have nvm installed
nvm install 22.20.0
nvm use 22.20.0

# If you don't have nvm, install it first:
# https://github.com/nvm-sh/nvm#installing-and-updating
```

## Step 1: Install Yarn (if not installed)

```bash
npm install -g yarn
```

Verify:
```bash
yarn --version
```

## Step 2: Install Project Dependencies

```bash
# From the project root directory
cd /Users/fletcher/code/Head-Start-TTADP

# Install all dependencies (this will take a few minutes)
yarn install

# Install frontend dependencies
cd frontend
yarn install
cd ..
```

## Step 3: Install Playwright Browsers

```bash
# This downloads the browser binaries needed for Playwright
npx playwright install
```

## Step 4: Verify Installation

```bash
# Check that Playwright is installed
ls node_modules/@playwright/test
```

You should see files there.

## Step 5: Run the Tests!

Now you can use the project's Playwright installation:

### Option A: Use the existing yarn script (easiest)

```bash
# Run all E2E tests in headed mode
./node_modules/.bin/playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --headed --workers=1 -g "should complete full workflow"
```

### Option B: Run via config

```bash
./node_modules/.bin/playwright test \
  --config=tests/e2e/playwright.config.js \
  tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --headed --workers=1
```

### Option C: Add to your PATH (optional)

If you want to use `playwright` command directly:

```bash
# Add node_modules/.bin to your current session
export PATH="./node_modules/.bin:$PATH"

# Then you can run
playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts --headed
```

## Quick Test Commands

Once dependencies are installed:

```bash
# Run all workflow tests (headed mode)
./node_modules/.bin/playwright test tests/e2e/workflows/ --headed --workers=1

# Run specific test
./node_modules/.bin/playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --headed --workers=1

# Run with grep filter
./node_modules/.bin/playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --headed --workers=1 -g "should complete full workflow"

# Open UI mode (interactive)
./node_modules/.bin/playwright test --ui tests/e2e/workflows/

# Debug mode
./node_modules/.bin/playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --debug
```

## Troubleshooting

### "Cannot find module '@playwright/test'"
- Make sure you ran `yarn install` in the root directory
- Make sure you're using `./node_modules/.bin/playwright`, not `npx playwright`

### "Executable doesn't exist"
- Run `npx playwright install` to download browser binaries

### "yarn: command not found"
- Install yarn globally: `npm install -g yarn`

### Wrong Node version
- Install correct version with nvm: `nvm install 22.20.0 && nvm use 22.20.0`

### Port already in use
- Make sure you're not already running the development server
- The tests expect the app to be running (or they'll use global setup)

## Full Development Setup

If you want to run the full application locally along with tests:

```bash
# Terminal 1: Start the application
yarn docker:start

# Wait for it to be ready, then in Terminal 2:
./node_modules/.bin/playwright test tests/e2e/workflows/ --headed
```

## Need the app running?

Check `tests/e2e/playwright.config.js` - it has `globalSetup` which should handle test environment setup.

If tests fail because app isn't running:

```bash
# Option 1: Use Docker
yarn docker:start

# Option 2: Start services manually (check docs/guides/dev-setup.md)
```
