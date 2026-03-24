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
  it('summarizes a fully successful taskRuns status file', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-success-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(path.join(artifactDir, 'import-status.json'), JSON.stringify({
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
    }, null, 2));

    runSummaryScript(artifactDir, summaryFile, '2');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toContain('Import data cron status: SUCCEEDED');
    expect(summary).toContain('Environment: sandbox');
    expect(summary).toContain('- download: SUCCEEDED (exit 0)');
    expect(summary).toContain('- process: SUCCEEDED (exit 0)');
    expect(summary).not.toContain('Partial run: yes');
  });

  it('summarizes failed and partial taskRuns', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-failure-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(path.join(artifactDir, 'import-status.json'), JSON.stringify({
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
    }, null, 2));

    runSummaryScript(artifactDir, summaryFile, '6');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toContain('Import data cron status: FAILED');
    expect(summary).toContain('Failed phase: process');
    expect(summary).toContain('Partial run: yes');
    expect(summary).toContain('- process: FAILED (exit 1)');
  });

  it('reports login failure when no task runs were recorded', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-login-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(path.join(artifactDir, 'import-status.json'), JSON.stringify({
      metadata: {
        targetEnv: 'staging',
        startedAt: '2026-03-24T10:00:00Z',
      },
      taskRuns: [],
    }, null, 2));
    fs.writeFileSync(path.join(logDir, 'phase-login.log'), 'Cloud Foundry login failed\n');

    runSummaryScript(artifactDir, summaryFile, '6');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toContain('Import data cron status: FAILED');
    expect(summary).toContain('Failed phase: login');
    expect(summary).toContain('Partial run: yes');
  });
});
