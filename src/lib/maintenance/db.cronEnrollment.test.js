// src/lib/maintenance/db.cronEnrollment.test.js

// Reset modules so our mocks are applied before module load.
jest.resetModules();

// Define a global auditLogger to satisfy the reference in db.js.
global.auditLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

// --- Set up our mocks BEFORE importing the module under test ---

// Optionally, if your module also imports from '../../logger', we mock it:
jest.mock('../../logger', () => ({
  auditLogger: global.auditLogger,
}));

// Mock the common functions so that we can intercept calls.
// Note: We add a dummy implementation for addQueueProcessor.
jest.mock('./common', () => ({
  registerCronEnrollmentFunction: jest.fn(),
  addCronJob: jest.fn(),
  enqueueMaintenanceJob: jest.fn(),
  addQueueProcessor: jest.fn(),
}));

// Now import our dependencies.
const { CronJob } = require('cron');
const { MAINTENANCE_CATEGORY, MAINTENANCE_TYPE } = require('../../constants');
const { registerCronEnrollmentFunction, addCronJob } = require('./common');

// Import the module under test inside an isolated module context
// so that our mocks are used when the module is evaluated.
jest.isolateModules(() => {
  // eslint-disable-next-line global-require
  require('./db');
});

// Store the enrollment callback once it's registered.
// Do this in a beforeAll so that we grab the value before any mocks are cleared.
let enrollmentCallback;
beforeAll(() => {
  if (registerCronEnrollmentFunction.mock.calls.length === 0) {
    throw new Error('registerCronEnrollmentFunction was not called');
  }
  // eslint-disable-next-line prefer-destructuring
  enrollmentCallback = registerCronEnrollmentFunction.mock.calls[0][0];
});

describe('DB Cron Enrollment', () => {
  // Note: We no longer clear all mocks in beforeEach since we need the stored enrollmentCallback.

  test('should skip enrollment in non-production environments', async () => {
    expect(typeof enrollmentCallback).toBe('function');
    // Simulate a non-production environment.
    await enrollmentCallback('0', 0, 'development');
    expect(global.auditLogger.log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Skipping DB cron job enrollment in non-production environment (development)'),
    );
    expect(addCronJob).not.toHaveBeenCalled();
  });

  test('should skip enrollment when instanceId is not "0"', async () => {
    expect(typeof enrollmentCallback).toBe('function');
    // Simulate production environment but an instanceId other than '0'.
    await enrollmentCallback('1', 0, 'production');
    expect(global.auditLogger.log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Skipping DB cron job enrollment on instance 1 in environment production'),
    );
    expect(addCronJob).not.toHaveBeenCalled();
  });

  test('should skip enrollment when contextId is not 1', async () => {
    expect(typeof enrollmentCallback).toBe('function');
    // Simulate production with instanceId "0" but contextId of 2.
    await enrollmentCallback('0', 2, 'production');
    expect(global.auditLogger.log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Skipping DB cron job enrollment on context 2 in environment production instance 0'),
    );
    expect(addCronJob).not.toHaveBeenCalled();
  });

  test('should register a cron job when in production with instanceId "0" and contextId 1', async () => {
    expect(typeof enrollmentCallback).toBe('function');
    // Simulate the proper environment.
    await enrollmentCallback('0', 1, 'production');
    expect(global.auditLogger.log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Registering DB maintenance cron jobs for context 1 in environment production instance 0'),
    );
    // Verify that addCronJob is called with the expected parameters.
    expect(addCronJob).toHaveBeenCalledWith(
      MAINTENANCE_CATEGORY.DB,
      MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE,
      expect.any(Function),
      '0 23 * * *',
    );

    // (Optional) Verify that the provided job creator function returns a CronJob instance.
    const cronJobCreator = addCronJob.mock.calls[0][2];
    const testTimezone = 'UTC';
    const testSchedule = '0 23 * * *';
    const job = cronJobCreator(
      MAINTENANCE_CATEGORY.DB,
      MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE,
      testTimezone,
      testSchedule,
    );

    expect(typeof job.start).toBe('function');
    expect(typeof job.stop).toBe('function');
    // Verify that the cron job uses the schedule we provided.
    expect(job.cronTime.source).toBe(testSchedule);
  });
});
