import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
import * as transactionModule from './programmaticTransaction';
import {
  Grant,
  Topic,
  ActivityReport,
  ActivityReportApprover,
  User,
  sequelize,
} from '../models';
import { upsertApprover } from '../services/activityReportApprovers';
import { activityReportAndRecipientsById } from '../services/activityReports';
import { auditLogger } from '../logger';

describe('Programmatic Transaction', () => {
  afterAll(async () => {
    await sequelize.close();
  });
  it('Insert', async () => {
    const snapshot = await transactionModule.captureSnapshot();
    await Topic.create({
      name: 'Test Topic',
    });
    let topic = await Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).not.toBeNull();
    await transactionModule.rollbackToSnapshot(snapshot);
    topic = await Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).toBeNull();
  });
  it('Update', async () => {
    const snapshot = await transactionModule.captureSnapshot();
    const grant = await Grant.findOne({
      where: { status: 'Active' },
      order: [['id', 'ASC']],
      limit: 1,
    });
    await grant.update({ status: 'Inactive' });
    await grant.reload();
    expect(grant.status).toBe('Inactive');
    await transactionModule.rollbackToSnapshot(snapshot);
    await grant.reload();
    expect(grant.status).toBe('Active');
  });
  it('Delete', async () => {
    await Topic.create({
      name: 'Test Topic',
    });
    const snapshot = await transactionModule.captureSnapshot();
    await Topic.destroy({ where: { name: 'Test Topic' }, force: true });
    let topic = await Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).toBeNull();
    await transactionModule.rollbackToSnapshot(snapshot);
    topic = Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).not.toBeNull();
    await Topic.destroy({ where: { name: 'Test Topic' }, force: true });
  });
  it('should sort changes by timestamp in descending order', async () => {
    const snapshot = await transactionModule.captureSnapshot();
    // Simulate multiple changes with different timestamps
    await Topic.create({ name: 'Topic A' });
    // Delay to ensure different timestamps
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await Topic.create({ name: 'Topic B' });
    const changes = await transactionModule.fetchAndAggregateChanges(snapshot);
    expect(changes[0].new_row_data.name).toBe('Topic B');
    expect(changes[1].new_row_data.name).toBe('Topic A');
    await transactionModule.rollbackToSnapshot(snapshot);
  });
  it('should throw error for unknown dml_type', async () => {
    const fakeChange = {
      source_table: 'Topic',
      dml_type: 'INVALID_TYPE',
      old_row_data: { id: 1 },
      new_row_data: { id: 1 },
      dml_timestamp: new Date().toISOString(),
      data_id: 1,
    };

    // Spy and mock the implementation of fetchAndAggregateChanges
    const spy = jest.spyOn(transactionModule, 'fetchAndAggregateChanges')
      .mockResolvedValue([fakeChange]);

    await expect(transactionModule.revertChange([fakeChange]))
      .rejects
      .toThrow('Unknown dml_type(INVALID_TYPE) for table: Topic');

    // Restore the original function
    spy.mockRestore(); // This restores the original implementation
  });
  it('should log and rethrow the error during reversion of changes', async () => {
    jest.spyOn(auditLogger, 'error'); // Spy on auditLogger.error if not already done

    const snapshot = await transactionModule.captureSnapshot();

    // Spy on sequelize.query and force it to throw an error
    const querySpy = jest.spyOn(sequelize, 'query').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    await expect(transactionModule.revertAllChanges(snapshot))
      .rejects
      .toThrow('Database error');

    // Check if the error log was called correctly
    expect(auditLogger.error).toHaveBeenCalledWith(
      'Error during reversion:',
      expect.any(Error),
    );

    // Restore the spy
    querySpy.mockRestore();
    auditLogger.error.mockRestore();
  });
  it('should prevent reversion in production environment', async () => {
    // Mock the environment variable
    const currentEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Mock auditLogger to verify it gets called
    const logSpy = jest.spyOn(auditLogger, 'error');

    // Prepare a dummy maxId array as expected by revertAllChanges
    const mockMaxIds = [{ table_name: 'TestTable', max_id: 1 }];

    // Expect the function to throw an error about production restrictions
    await expect(transactionModule.revertAllChanges(mockMaxIds)).rejects.toThrow('Revert operations are not allowed in production environment');

    // Ensure the error logger was called
    expect(logSpy).toHaveBeenCalledWith('Attempt to revert changes in production environment');

    // Clean up by restoring the original environment variable
    process.env.NODE_ENV = currentEnv;

    // Restore the spy
    logSpy.mockRestore();
  });
  it('complex test - activityReportApprovers services - upsertApprover and ActivityReportApprover hooks - for submitted reports - calculatedStatus is "needs action" if any approver "needs_action"', async () => {
    const snapshot = await transactionModule.captureSnapshot();
    const mockUser = {
      id: 11184161,
      homeRegionId: 1,
      hsesUsername: 'user11184161',
      hsesUserId: 'user11184161',
      lastLogin: new Date(),
    };

    const mockUserTwo = {
      id: 22261035,
      homeRegionId: 1,
      hsesUsername: 'user22261035',
      hsesUserId: 'user22261035',
      lastLogin: new Date(),
    };

    const mockManager = {
      id: 22284981,
      homeRegionId: 1,
      hsesUsername: 'user22284981',
      hsesUserId: 'user22284981',
      lastLogin: new Date(),
    };

    const secondMockManager = {
      id: 33384616,
      homeRegionId: 1,
      hsesUsername: 'user33384616',
      hsesUserId: 'user33384616',
      lastLogin: new Date(),
    };

    const submittedReport = {
      userId: mockUser.id,
      regionId: 1,
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      numberOfParticipants: 1,
      deliveryMethod: 'method',
      duration: 0,
      endDate: '2000-01-01T12:00:00Z',
      startDate: '2000-01-01T12:00:00Z',
      activityRecipientType: 'something',
      requester: 'requester',
      targetPopulations: ['pop'],
      reason: ['reason'],
      participants: ['participants'],
      topics: ['topics'],
      ttaType: ['type'],
      version: 2,
    };

    await User.bulkCreate([mockUser, mockUserTwo, mockManager, secondMockManager]);
    const report1 = await ActivityReport.create(submittedReport);
    // One approved
    await ActivityReportApprover.create({
      activityReportId: report1.id,
      userId: mockManager.id,
      status: APPROVER_STATUSES.APPROVED,
    });
    // One pending
    await ActivityReportApprover.create({
      activityReportId: report1.id,
      userId: secondMockManager.id,
    });
    // Works with managed transaction
    await sequelize.transaction(async () => {
      // Pending updated to needs_action
      const approver = await upsertApprover({
        status: APPROVER_STATUSES.NEEDS_ACTION,
        activityReportId: report1.id,
        userId: secondMockManager.id,
      });
      expect(approver.status).toEqual(APPROVER_STATUSES.NEEDS_ACTION);
      expect(approver.user).toBeDefined();
    });
    const [updatedReport] = await activityReportAndRecipientsById(report1.id);
    expect(updatedReport.approvedAt).toBeNull();
    expect(updatedReport.submissionStatus).toEqual(REPORT_STATUSES.SUBMITTED);
    expect(updatedReport.calculatedStatus).toEqual(REPORT_STATUSES.NEEDS_ACTION);

    await transactionModule.rollbackToSnapshot(snapshot);
    const report = await ActivityReport.findOne({ where: { id: report1.id } });
    expect(report).toBeNull();
    const users = await User.findAll({
      where: {
        id: [
          mockUser.id,
          mockUserTwo.id,
          mockManager.id,
          secondMockManager.id,
        ],
      },
    });
    expect(users).toEqual([]);
  });
});
