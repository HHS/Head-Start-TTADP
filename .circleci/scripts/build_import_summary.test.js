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
      'Recent Monitoring Updates: [{"recipient":"New Goals: Example Recipient Alpha","region":1},{"recipient":"New Goals: Example Recipient Bravo","region":3}]\n'
    );
    fs.writeFileSync(
      path.join(logDir, 'phase-validate_monitoring_data.log'),
      'Monitoring Validation Alerts: {"asOf":"2026-03-24 06:00 EDT","alerts":[{"message":"Region 5 created no monitoring reviews in the last four complete weeks"}]}\n'
    );
    // report-only critical: criticalCount > 0 but the phase succeeded (nothing
    // blocked), so it must still be surfaced alongside the alerts
    fs.writeFileSync(
      path.join(logDir, 'phase-validate_monitoring_gate.log'),
      'Monitoring Gate: {"asOf":"2026-03-24 06:00 EDT","criticalCount":1,"alerts":[{"check_name":"findings_mass_source_deletion","message":"52.0% of monitoring findings from the last year have no live row (900 of 1730)","severity":"critical"}]}\n'
    );

    runSummaryScript(artifactDir, summaryFile, '2');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toBe(
      'Monitoring Updates: ```\n' +
        'New Goals: Example Recipient Alpha (Region 1)\n' +
        'New Goals: Example Recipient Bravo (Region 3)\n' +
        '```\n' +
        'Monitoring Validation Alerts (as of 2026-03-24 06:00 EDT): ```\n' +
        'Region 5 created no monitoring reviews in the last four complete weeks\n' +
        '```\n' +
        'Monitoring Gate Criticals (as of 2026-03-24 06:00 EDT) - did not block the fact-table refresh: ```\n' +
        '52.0% of monitoring findings from the last year have no live row (900 of 1730)\n' +
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
    // with no validation or gate logs present, each section reports "no result"
    expect(summary).toBe(
      'Monitoring Updates: none\n' +
        'Monitoring Validation: no result found\n' +
        'Monitoring Gate: no result found\n'
    );
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

  it('reports a block when the gate ran and found a critical', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-gate-block-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(
      path.join(artifactDir, 'import-status.json'),
      JSON.stringify(
        {
          metadata: { targetEnv: 'prod', startedAt: '2026-03-24T10:00:00Z' },
          taskRuns: [
            {
              taskName: 'import-validate_monitoring_gate-prod-1',
              status: 'FAILED',
              exitCode: 1,
              startedAt: '2026-03-24T10:05:00Z',
              finishedAt: '2026-03-24T10:06:00Z',
              logFile: path.join(logDir, 'phase-validate_monitoring_gate.log'),
            },
          ],
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(logDir, 'phase-validate_monitoring_gate.log'),
      'Monitoring Gate: {"status":"success","asOf":"2026-03-24 06:00 EDT","criticalCount":1,"alerts":[{"check_name":"findings_mass_source_deletion","message":"52.0% of monitoring findings from the last year have no live row (900 of 1730)","severity":"critical"}]}\n'
    );

    runSummaryScript(artifactDir, summaryFile, '6');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    // The critical data condition is the headline; the refresh block is a clause.
    expect(summary).toBe(
      'Monitoring Gate Criticals (as of 2026-03-24 06:00 EDT) - blocked the fact-table refresh: ```\n' +
        '52.0% of monitoring findings from the last year have no live row (900 of 1730)\n' +
        '```\n'
    );
  });

  it('surfaces a report-only critical even when an unrelated later phase fails', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-report-only-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(
      path.join(artifactDir, 'import-status.json'),
      JSON.stringify(
        {
          metadata: { targetEnv: 'prod', startedAt: '2026-03-24T10:00:00Z' },
          taskRuns: [
            {
              taskName: 'import-validate_monitoring_gate-prod-1',
              status: 'SUCCEEDED',
              exitCode: 0,
              logFile: path.join(logDir, 'phase-validate_monitoring_gate.log'),
            },
            {
              taskName: 'import-update_fact_tables-prod-1',
              status: 'FAILED',
              exitCode: 1,
              logFile: path.join(logDir, 'phase-update_fact_tables.log'),
            },
          ],
        },
        null,
        2
      )
    );
    // Gate found a critical but ran report-only (exit 0, phase SUCCEEDED); a later
    // phase is what failed. The critical must still reach the channel.
    fs.writeFileSync(
      path.join(logDir, 'phase-validate_monitoring_gate.log'),
      'Monitoring Gate: {"status":"success","asOf":"2026-03-24 06:00 EDT","criticalCount":1,"alerts":[{"check_name":"findings_mass_source_deletion","message":"52.0% of monitoring findings from the last year have no live row (900 of 1730)","severity":"critical"}]}\n'
    );
    fs.writeFileSync(
      path.join(logDir, 'phase-update_fact_tables.log'),
      'Task import-update_fact_tables-prod-1 status: RUNNING\nError: fact-table refresh failed\nPHASE_FAILURE update_fact_tables exit 1\n'
    );

    runSummaryScript(artifactDir, summaryFile, '8');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).toBe(
      'Monitoring job failure: ```\n' +
        'Error: fact-table refresh failed\n' +
        '```\n' +
        'Monitoring Gate Criticals (as of 2026-03-24 06:00 EDT) - did not block the fact-table refresh: ```\n' +
        '52.0% of monitoring findings from the last year have no live row (900 of 1730)\n' +
        '```\n'
    );
  });

  it('does not report a block when the gate phase errored (execution failure, not a block)', () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-summary-gate-error-'));
    const logDir = path.join(artifactDir, 'logs');
    const summaryFile = path.join(artifactDir, 'monitoring-updates.txt');
    fs.mkdirSync(logDir, { recursive: true });

    fs.writeFileSync(
      path.join(artifactDir, 'import-status.json'),
      JSON.stringify(
        {
          metadata: { targetEnv: 'prod', startedAt: '2026-03-24T10:00:00Z' },
          taskRuns: [
            {
              taskName: 'import-validate_monitoring_gate-prod-1',
              status: 'FAILED',
              exitCode: 1,
              startedAt: '2026-03-24T10:05:00Z',
              finishedAt: '2026-03-24T10:06:00Z',
              logFile: path.join(logDir, 'phase-validate_monitoring_gate.log'),
            },
          ],
        },
        null,
        2
      )
    );
    // The runner still prints its greppable line on failure, but with status=failure
    // and no criticals - this must NOT be mislabeled as a critical block.
    fs.writeFileSync(
      path.join(logDir, 'phase-validate_monitoring_gate.log'),
      'Monitoring Gate: {"status":"failure","asOf":"2026-03-24 06:00 EDT","error":"connection terminated unexpectedly"}\n'
    );

    runSummaryScript(artifactDir, summaryFile, '6');

    const summary = fs.readFileSync(summaryFile, 'utf-8');
    expect(summary).not.toContain('BLOCKED');
    expect(summary).toContain('Monitoring job failure:');
  });
});
