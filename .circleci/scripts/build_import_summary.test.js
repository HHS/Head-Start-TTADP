const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SCRIPT_PATH = path.join(__dirname, 'build_import_summary.sh');

function runSummaryScript(artifactDir, summaryFile, expectedTasks = '6') {
  execFileSync('bash', [SCRIPT_PATH, artifactDir, summaryFile, expectedTasks], {
    encoding: 'utf-8',
  });
}

describe('build_import_summary.sh', () => {
  it('writes a concise success summary when monitoring updates exist', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-success-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(
      path.join(artifactDir, 'import-status.json'),
      JSON.stringify(
        {
          metadata: {
            targetEnv: 'sandbox',
            startedAt: '2026-03-24T10:00:00Z',
          },
          taskRuns: [
            {
              taskName: 'import-download-sandbox-1',
              status: 'SUCCEEDED',
              exitCode: 0,
              startedAt: '2026-03-24T10:00:00Z',
              finishedAt: '2026-03-24T10:05:00Z',
              logFile: path.join(logDir, 'phase-download.log'),
            },
            {
              taskName: 'import-process-sandbox-1',
              status: 'SUCCEEDED',
              exitCode: 0,
              startedAt: '2026-03-24T10:05:00Z',
              finishedAt: '2026-03-24T10:10:00Z',
              logFile: path.join(logDir, 'phase-process.log'),
            },
          ],
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(logDir, 'phase-report_updates.log'),
      'Recent Monitoring Updates: [{"recipient":"New Goals: COMMUNITY CONCEPTS, INCORPORATED","region":1},{"recipient":"New Goals: University of Pittsburgh, The","region":3}]\n'
    );

    runSummaryScript(artifactDir, summaryFile, '2');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toBe(
      'Monitoring Updates: ```\n' +
        'New Goals: COMMUNITY CONCEPTS, INCORPORATED (Region 1)\n' +
        'New Goals: University of Pittsburgh, The (Region 3)\n' +
        '```\n'
    );
  });

  it('writes "none" when a successful run has no monitoring updates', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-none-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(
      path.join(artifactDir, 'import-status.json'),
      JSON.stringify(
        {
          metadata: {
            targetEnv: 'sandbox',
            startedAt: '2026-03-24T10:00:00Z',
          },
          taskRuns: [
            {
              taskName: 'import-download-sandbox-1',
              status: 'SUCCEEDED',
              exitCode: 0,
              startedAt: '2026-03-24T10:00:00Z',
              finishedAt: '2026-03-24T10:05:00Z',
              logFile: path.join(logDir, 'phase-download.log'),
            },
          ],
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(logDir, 'phase-report_updates.log'),
      'Recent Monitoring Updates: []\n'
    );

    runSummaryScript(artifactDir, summaryFile, '1');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toBe('Monitoring Updates: none\n');
  });

  it('writes a concise failure message from the failed phase log', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-failure-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(
      path.join(artifactDir, 'import-status.json'),
      JSON.stringify(
        {
          metadata: {
            targetEnv: 'prod',
            startedAt: '2026-03-24T10:00:00Z',
          },
          taskRuns: [
            {
              taskName: 'import-download-prod-1',
              status: 'SUCCEEDED',
              exitCode: 0,
              startedAt: '2026-03-24T10:00:00Z',
              finishedAt: '2026-03-24T10:05:00Z',
              logFile: path.join(logDir, 'phase-download.log'),
            },
            {
              taskName: 'import-process-prod-1',
              status: 'FAILED',
              exitCode: 1,
              startedAt: '2026-03-24T10:05:00Z',
              finishedAt: '2026-03-24T10:10:00Z',
              logFile: path.join(logDir, 'phase-process.log'),
            },
          ],
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(logDir, 'phase-process.log'),
      'Task import-process-prod-1 status: RUNNING\nError: downstream system unavailable\nPHASE_FAILURE process exit 1\n'
    );

    runSummaryScript(artifactDir, summaryFile, '6');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toBe('Monitoring job failure: ```\nError: downstream system unavailable\n```');
  });

  it('falls back to the phase name when no error line is available', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-fallback-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(
      path.join(artifactDir, 'import-status.json'),
      JSON.stringify(
        {
          metadata: {
            targetEnv: 'prod',
            startedAt: '2026-03-24T10:00:00Z',
          },
          taskRuns: [
            {
              taskName: 'import-process-prod-1',
              status: 'FAILED',
              exitCode: 1,
              startedAt: '2026-03-24T10:05:00Z',
              finishedAt: '2026-03-24T10:10:00Z',
              logFile: path.join(logDir, 'phase-process.log'),
            },
          ],
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(logDir, 'phase-process.log'),
      'Starting task import-process-prod-1 on tta-smarthub-prod\nPHASE_FAILURE process exit 1\n'
    );

    runSummaryScript(artifactDir, summaryFile, '6');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toBe('Monitoring job failure: ```\nPhase failed: process\n```');
  });

  it('reports login failure when no task runs were recorded', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-login-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(
      path.join(artifactDir, 'import-status.json'),
      JSON.stringify(
        {
          metadata: {
            targetEnv: 'staging',
            startedAt: '2026-03-24T10:00:00Z',
          },
          taskRuns: [],
        },
        null,
        2
      )
    );
    fs.writeFileSync(path.join(logDir, 'phase-login.log'), 'Cloud Foundry login failed\n');

    runSummaryScript(artifactDir, summaryFile, '6');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toBe('Monitoring job failure: ```\nCloud Foundry login failed\n```');
  });
});
