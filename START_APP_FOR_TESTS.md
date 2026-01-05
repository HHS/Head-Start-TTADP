# Starting the TTA Hub Application for E2E Tests

The E2E tests require the application to be running. You have several options:

## ⚠️ Current Status
- ❌ Application not running on http://localhost:3000
- ❌ Docker not installed (can't use Docker method)

## 🎯 Recommended Options

### Option 1: Use CI Mode (Simplest for Testing)

This starts the app in CI mode with built backend and frontend:

```bash
# Terminal 1: Build and start the application
cd /Users/fletcher/code/Head-Start-TTADP

# Build the backend
yarn build

# Start in CI mode (includes database setup)
yarn start:ci
```

Wait until you see messages like:
```
[backend] Server listening on port 8080
[frontend] webpack compiled successfully
```

Then in **Terminal 2**, run the tests:
```bash
./node_modules/.bin/playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --headed --workers=1 -g "should complete full workflow"
```

### Option 2: Install Docker and Use Docker Setup (Recommended Long-term)

This is the most reliable method used by the team:

```bash
# 1. Install Docker Desktop for Mac
# Download from: https://www.docker.com/products/docker-desktop/

# 2. Start Docker Desktop app

# 3. Reset and start the application
yarn docker:reset   # Builds everything and sets up database
yarn docker:start   # Starts all services

# Wait for services to be ready (check Docker Desktop logs)
```

Then run tests in another terminal:
```bash
./node_modules/.bin/playwright test tests/e2e/workflows/ --headed --workers=1
```

### Option 3: Manual Local Setup (Most Complex)

If you want to run services natively without Docker:

**Prerequisites:**
- PostgreSQL 15.x running on localhost:5432
- Redis 6.x running on localhost:6379
- Node.js 22.20.0

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env and configure DATABASE_URL, REDIS settings, etc.

# 2. Install dependencies
yarn deps:local

# 3. Setup database
yarn db:migrate
yarn db:seed

# 4. Build
yarn build

# 5. Start (in separate terminals or use concurrently)
# Terminal 1: Backend
yarn server

# Terminal 2: Worker
yarn worker

# Terminal 3: Frontend
yarn client

# Terminal 4: Tests
./node_modules/.bin/playwright test tests/e2e/workflows/ --headed
```

## 🚀 Quick Start (Easiest Right Now)

Since Docker isn't available, try the CI mode:

```bash
# Terminal 1
cd /Users/fletcher/code/Head-Start-TTADP
yarn build
yarn start:ci
```

**Wait for it to be ready** - you should see:
- Backend server starting
- Frontend webpack compiling
- Messages about database connections

Then in **Terminal 2**:
```bash
cd /Users/fletcher/code/Head-Start-TTADP
./node_modules/.bin/playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --headed --workers=1
```

## 🔍 Verify App is Running

Check if the app is accessible:
```bash
curl http://localhost:3000
```

You should get HTML back (not an error).

Or open in browser:
```
http://localhost:3000
```

You should see the TTA Hub login/home page.

## ⚡ Alternative: Mock Mode (Future Enhancement)

We could configure the tests to use a mock server, but that would require:
1. Setting up MSW (Mock Service Worker)
2. Creating mock data handlers
3. Modifying test configuration

For now, running the actual app is the best approach.

## 🐛 Troubleshooting

### "ECONNREFUSED" or "Cannot connect to database"
- Make sure PostgreSQL is installed and running
- Check DATABASE_URL in .env matches your PostgreSQL setup
- For CI mode, it should auto-configure

### "Redis connection failed"
- Make sure Redis is installed and running
- Check REDIS_HOST and REDIS_PASS in .env
- For CI mode, it should auto-configure

### "Port 3000 already in use"
- Kill existing process: `lsof -ti:3000 | xargs kill -9`
- Or use a different port in .env

### "webpack compilation failed"
- Try: `cd frontend && yarn install && cd ..`
- Then restart

### Tests still can't connect
- Verify app is running: `curl http://localhost:3000`
- Check the baseURL in tests/e2e/playwright.config.js
- Make sure TTA_SMART_HUB_URI environment variable isn't set to something else

## 📝 Environment Variables

The tests use these from playwright.config.js:
```javascript
baseURL: process.env.TTA_SMART_HUB_URI || 'http://localhost:3000'
```

To use a different URL:
```bash
export TTA_SMART_HUB_URI=http://localhost:3000
./node_modules/.bin/playwright test tests/e2e/workflows/ --headed
```

## ✅ When Ready to Run Tests

Once the app is running and you can access http://localhost:3000:

```bash
# Run all workflow tests
./node_modules/.bin/playwright test tests/e2e/workflows/ --headed --workers=1

# Run specific test
./node_modules/.bin/playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --headed --workers=1 -g "should complete full workflow"

# Interactive UI mode
./node_modules/.bin/playwright test --ui tests/e2e/workflows/

# Debug mode
./node_modules/.bin/playwright test tests/e2e/workflows/activity-report-complete-workflow.spec.ts \
  --debug
```

## 🎬 Expected Test Duration

- Complete workflow test: ~3 minutes
- Training report test: ~4 minutes
- All workflow tests: ~15 minutes

The browser window will open and you'll see it automatically:
1. Navigating through the app
2. Filling in forms
3. Creating reports
4. Approving workflows
5. Verifying data

## 💡 Tips

1. **First time setup**: Use `yarn build && yarn start:ci` for simplest start
2. **Long-term development**: Install Docker and use `yarn docker:start`
3. **Watching tests**: Always use `--workers=1` so you can see each test clearly
4. **Debugging**: Use `--debug` flag to step through tests
5. **Demo mode**: Edit playwright.config.js and add `slowMo: 500` to slow down actions

## 📚 More Info

- Full dev setup: `docs/guides/dev-setup.md`
- Test documentation: `tests/e2e/WORKFLOW_TESTS_README.md`
- Docker setup: Check `docker-compose.yml`
