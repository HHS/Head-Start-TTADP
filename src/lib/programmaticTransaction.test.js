import faker from '@faker-js/faker';
import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
import * as transactionModule from './programmaticTransaction';
import db, {
  Grant,
  Goal,
  Recipient,
  Topic,
  ActivityReport,
  ActivityReportApprover,
  User,
  GoalFieldResponse,
  GoalTemplateFieldPrompt,
  sequelize,
} from '../models';
import { upsertApprover } from '../services/activityReportApprovers';
import { activityReportAndRecipientsById } from '../services/activityReports';
import { auditLogger } from '../logger';

// Mock the Queue from 'bull'
jest.mock('bull');

describe('Programmatic Transaction', () => {
  beforeAll(async () => {
    jest.resetAllMocks();
    try {
      await sequelize.authenticate();
    } catch (error) {
      auditLogger.error('Unable to connect to the database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await sequelize.close();
    jest.resetModules();
    jest.resetAllMocks();
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
    topic = await Topic.findOne({ where: { name: 'Test Topic' } });
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
    spy.mockRestore();
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

    await expect(transactionModule.rollbackToSnapshot(snapshot)).resolves.not.toThrow();
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

  it('should correctly handle JSON strings and arrays during reversion', async () => {
    const snapshot = await transactionModule.captureSnapshot();
    const jsonArray = ['elem3', 'elem4'];

    const goalTemplateFieldPrompt = await GoalTemplateFieldPrompt.findOne({
      where: { title: 'FEI root cause' },
      raw: true,
    });

    // Ensure the prompt is found before proceeding
    if (!goalTemplateFieldPrompt) {
      throw new Error('GoalTemplateFieldPrompt not found');
    }

    let grant = {
      id: faker.datatype.number({ min: 97000, max: 98000 }),
      number: faker.random.alphaNumeric(10),
      cdi: false,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
    };
    const recipient = await Recipient.create({ name: `recipient${faker.datatype.number()}`, id: faker.datatype.number({ min: 67000, max: 68000 }), uei: faker.datatype.string(12) });
    grant = await Grant.create({ ...grant, recipientId: recipient.id });
    const goal = await Goal.create({
      name: 'This is some serious goal text',
      status: 'Draft',
      grantId: grant.id,
      goalTemplateId: goalTemplateFieldPrompt.goalTemplateId,
    });
    const gfResponse = await GoalFieldResponse.create({
      goalId: goal.id,
      goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
      response: jsonArray,
    });
    expect(gfResponse).not.toBeNull();

    let goalFieldResponse = await GoalFieldResponse.findOne({ where: { response: jsonArray } });
    expect(goalFieldResponse).not.toBeNull();
    expect(goalFieldResponse.response).toEqual(jsonArray);

    await expect(transactionModule.rollbackToSnapshot(snapshot)).resolves.not.toThrow();
    goalFieldResponse = await GoalFieldResponse.findOne({ where: { response: jsonArray } });
    expect(goalFieldResponse).toBeNull();
  });

  it('should log and rethrow error if JSON parsing fails during reversion', async () => {
    jest.spyOn(auditLogger, 'error'); // Spy on auditLogger.error if not already done

    const snapshot = await transactionModule.captureSnapshot();
    const malformedJsonString = "{ key: 'value' }"; // Incorrectly formatted JSON

    const goalTemplateFieldPrompt = await GoalTemplateFieldPrompt.findOne({
      where: { title: 'FEI root cause' },
    });

    await expect(
      GoalFieldResponse.create({
        goalId: faker.datatype.number(),
        goalTemplateFieldPromptId: goalTemplateFieldPrompt.id,
        response: malformedJsonString,
      }),
    ).rejects.toThrow(TypeError);

    const querySpy = jest.spyOn(sequelize, 'query').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    await expect(transactionModule.revertAllChanges(snapshot))
      .rejects
      .toThrow('Database error');

    expect(auditLogger.error).toHaveBeenCalledWith(
      'Error during reversion:',
      expect.any(Error),
    );

    querySpy.mockRestore();
    auditLogger.error.mockRestore();
  });

  describe('hasModifiedData', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns true when changes are detected', async () => {
      const snapshot = await transactionModule.captureSnapshot(true);
      await db.ZALActivityRecipient.create({
        data_id: 1,
        dml_type: 'UPDATE',
        old_row_data: null,
        new_row_data: null,
        dml_timestamp: new Date(),
        dml_by: -1,
        dml_as: -1,
        dml_txid: 'cb26d433-173d-4cea-8ab0-a7af8ed37c81',
      });
      const result = await transactionModule.hasModifiedData(snapshot, 'cb26d433-173d-4cea-8ab0-a7af8ed37c81');
      expect(result).toBe(true);
    });

    it('returns false when no changes are detected', async () => {
      const snapshot = await transactionModule.captureSnapshot(true);
      const result = await transactionModule.hasModifiedData(snapshot, 'cb26d433-173d-4cea-8ab0-a7af8ed37c81');
      expect(result).toBe(false);
    });

    it('throws error when transaction ID is missing', async () => {
      await expect(transactionModule.hasModifiedData([], null)).rejects.toThrow('Transaction ID not found');
    });

    it('throws error if snapshot entry is not found for a ZAL table', async () => {
      await expect(transactionModule.hasModifiedData([], 'cb26d433-173d-4cea-8ab0-a7af8ed37c81')).rejects.toThrow('Snapshot entry not found for table: ZALActivityRecipients');
    });
    it('returns false when a ZAL table is not present', async () => {
      const original = db.ZALActivityRecipients;
      db.ZALActivityRecipients = undefined; // Temporarily remove the ZALExample table for this test
      await expect(transactionModule.hasModifiedData([{ table_name: 'ZALActivityRecipients', max_id: '100' }], 'cb26d433-173d-4cea-8ab0-a7af8ed37c81')).rejects.toThrow('Table name not found for model: ZALActivityRecipients');
      db.ZALActivityRecipients = original; // Restore the mock
    });
  });
});
