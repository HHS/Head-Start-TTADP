const {
  buildFailureMessage,
  buildSuccessMessage,
  extractRelevantErrors,
} = require('./createMonitoringNotification');

describe('createMonitoringNotification', () => {
  it('extracts structured and lowercase error lines', () => {
    const ftpError = [
      '{"label":"AUDIT","level":"error","message":"Failed to connect to FTP:',
      'Handshake failed: no matching host key format"}',
    ].join(' ');
    const logText = [
      'info line',
      ftpError,
      'RUN_IMPORT_JOB_FAILED step=download exit_code=1',
    ].join('\n');

    expect(extractRelevantErrors(logText)).toEqual([
      ftpError,
      'RUN_IMPORT_JOB_FAILED step=download exit_code=1',
    ]);
  });

  it('builds a success message with monitoring updates and recent errors', () => {
    const logText = [
      'Recent Monitoring Updates: [{"recipient":"Recipient A","region":1}]',
      '{"label":"AUDIT","level":"error","message":"Failed to connect to FTP: Handshake failed"}',
    ].join('\n');

    const message = buildSuccessMessage(logText);
    expect(message).toContain('Recipient A (Region 1)');
    expect(message).toContain('Recent Errors:');
    expect(message).toContain('Failed to connect to FTP');
  });

  it('builds a failure message with task and environment context', () => {
    const logText = [
      '{"label":"AUDIT","level":"error","message":"Failed to connect to FTP: Handshake failed"}',
      'RUN_IMPORT_JOB_FAILED step=download exit_code=1',
    ].join('\n');

    const message = buildFailureMessage(logText, 'prod', 'run_import_job-prod-123');
    expect(message).toContain('Monitoring import failed in prod.');
    expect(message).toContain('Task: run_import_job-prod-123');
    expect(message).toContain('RUN_IMPORT_JOB_FAILED step=download exit_code=1');
  });
});
