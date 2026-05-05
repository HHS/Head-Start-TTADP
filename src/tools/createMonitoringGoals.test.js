/* eslint-disable no-console */
import faker from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { captureSnapshot, rollbackToSnapshot } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';
import {
  Citation,
  DeliveredReview,
  DeliveredReviewCitation,
  Goal,
  GoalStatusChange,
  GoalTemplate,
  Grant,
  GrantCitation,
  Recipient,
  sequelize,
} from '../models';
import createMonitoringGoals from './createMonitoringGoals';

jest.mock('../logger');

describe('createMonitoringGoals', () => {
  let goalTemplate;
  let recipient;
  let snapshot;

  const goalTemplateName =
    '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.';

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const createGrant = (overrides = {}) =>
    Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: uuidv4(),
      recipientId: recipient.id,
      regionId: 1,
      startDate: new Date(),
      endDate: new Date(),
      status: 'Active',
      ...overrides,
    });

  // Creates a Citation that is active by default, linked to a DeliveredReview.
  const createCitation = async (overrides = {}, reviewType = 'FA-1') => {
    const dr = await DeliveredReview.create({
      mrid: faker.datatype.number({ min: 99999 }),
      review_uuid: uuidv4(),
      review_type: reviewType,
      review_status: 'Complete',
      report_delivery_date: new Date('2025-06-01'),
    });
    const citation = await Citation.create({
      mfid: faker.datatype.number({ min: 9999 }),
      finding_uuid: uuidv4(),
      active: true,
      last_review_delivered: true,
      calculated_status: 'Active',
      raw_status: 'Active',
      latest_report_delivery_date: new Date('2025-06-01'),
      latest_review_uuid: dr.review_uuid,
      ...overrides,
    });
    await DeliveredReviewCitation.create({ deliveredReviewId: dr.id, citationId: citation.id });
    return citation;
  };

  const createGrantCitation = (grantId, citationId) =>
    GrantCitation.create({
      grantId,
      citationId,
    });

  const createMonitoringGoalForGrant = (grantId, overrides = {}) =>
    Goal.create({
      name: goalTemplateName,
      grantId,
      goalTemplateId: goalTemplate.id,
      status: 'Not Started',
      createdVia: 'monitoring',
      ...overrides,
    });

  // ---------------------------------------------------------------------------
  // Setup / teardown
  // ---------------------------------------------------------------------------

  beforeAll(async () => {
    process.env.ENABLE_MONITORING_GOAL_CREATION = 'true';
    snapshot = await captureSnapshot();

    recipient = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    goalTemplate = await GoalTemplate.findOne({
      where: { standard: 'Monitoring' },
      paranoid: false,
    });
  });

  afterAll(async () => {
    await rollbackToSnapshot(snapshot);
    await sequelize.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Ensure the feature flag is always restored between tests.
    process.env.ENABLE_MONITORING_GOAL_CREATION = 'true';
  });

  // ---------------------------------------------------------------------------
  // Feature-flag / error path
  // ---------------------------------------------------------------------------

  it('returns early without creating goals when ENABLE_MONITORING_GOAL_CREATION is not set', async () => {
    delete process.env.ENABLE_MONITORING_GOAL_CREATION;

    const grant = await createGrant();
    const citation = await createCitation();
    await createGrantCitation(grant.id, citation.id);

    await createMonitoringGoals();

    const goals = await Goal.findAll({ where: { grantId: grant.id } });
    expect(goals.length).toBe(0);
  });

  it('logs an error if the monitoring goal template does not exist', async () => {
    jest.spyOn(GoalTemplate, 'findOne').mockResolvedValueOnce(null);
    jest.spyOn(auditLogger, 'error');
    await createMonitoringGoals();
    expect(auditLogger.error).toHaveBeenCalledWith('Monitoring Goal template not found');
  });

  it('throws and logs when an unexpected error occurs', async () => {
    jest.spyOn(GoalTemplate, 'findOne').mockRejectedValueOnce(new Error('Test error'));
    jest.spyOn(auditLogger, 'error');
    await expect(createMonitoringGoals()).rejects.toThrow();
    expect(auditLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error creating monitoring:')
    );
  });

  // ---------------------------------------------------------------------------
  // Core: goal creation
  // ---------------------------------------------------------------------------

  it('creates a monitoring goal for a grant with an active Citation', async () => {
    const grant = await createGrant();
    const citation = await createCitation();
    await createGrantCitation(grant.id, citation.id);

    await createMonitoringGoals();

    const goals = await Goal.findAll({
      where: { grantId: grant.id, goalTemplateId: goalTemplate.id },
    });
    expect(goals.length).toBe(1);
    expect(goals[0].name).toBe(goalTemplateName);
    expect(goals[0].status).toBe('Not Started');
    expect(goals[0].createdVia).toBe('monitoring');
    expect(goals[0].isRttapa).toBe('Yes');
    expect(goals[0].source).toBe('Federal monitoring issues, including CLASS and RANs');
  });

  it('creates a GoalStatusChange for the new goal', async () => {
    const grant = await createGrant();
    const citation = await createCitation();
    await createGrantCitation(grant.id, citation.id);

    await createMonitoringGoals();

    const [goal] = await Goal.findAll({
      where: { grantId: grant.id, goalTemplateId: goalTemplate.id },
    });
    const gsc = await GoalStatusChange.findOne({
      where: {
        goalId: goal.id,
        oldStatus: null,
        newStatus: 'Not Started',
        reason: 'Goal created',
        context: 'Creation',
      },
    });
    expect(gsc).not.toBeNull();
    expect(gsc.userId).toBeNull();
  });

  it('creates one goal when multiple active Citations share the same grant', async () => {
    const grant = await createGrant();
    const [c1, c2] = await Promise.all([createCitation(), createCitation()]);
    await Promise.all([createGrantCitation(grant.id, c1.id), createGrantCitation(grant.id, c2.id)]);

    await createMonitoringGoals();

    const goals = await Goal.findAll({
      where: { grantId: grant.id, goalTemplateId: goalTemplate.id },
    });
    expect(goals.length).toBe(1);
  });

  it('is idempotent: running twice still produces only one goal', async () => {
    const grant = await createGrant();
    const citation = await createCitation();
    await createGrantCitation(grant.id, citation.id);

    await createMonitoringGoals();
    await createMonitoringGoals();

    const goals = await Goal.findAll({
      where: { grantId: grant.id, goalTemplateId: goalTemplate.id },
    });
    expect(goals.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Core: goal suppression
  // ---------------------------------------------------------------------------

  it('does not create a duplicate when a non-closed monitoring goal already exists', async () => {
    const grant = await createGrant();
    const citation = await createCitation();
    await createGrantCitation(grant.id, citation.id);
    await createMonitoringGoalForGrant(grant.id, { status: 'In Progress' });

    await createMonitoringGoals();

    const goals = await Goal.findAll({
      where: { grantId: grant.id, goalTemplateId: goalTemplate.id },
    });
    expect(goals.length).toBe(1);
    expect(goals[0].status).toBe('In Progress');
  });

  it('does not create a goal for a grant with only inactive Citations', async () => {
    const grant = await createGrant();
    const citation = await createCitation({ active: false, calculated_status: 'Corrected' });
    await createGrantCitation(grant.id, citation.id);

    await createMonitoringGoals();

    const goals = await Goal.findAll({ where: { grantId: grant.id } });
    expect(goals.length).toBe(0);
  });

  it('does not create a goal for a citation whose review type is not in the allowed list (e.g. CLASS)', async () => {
    const grant = await createGrant();
    const citation = await createCitation({}, 'CLASS');
    await createGrantCitation(grant.id, citation.id);

    await createMonitoringGoals();

    const goals = await Goal.findAll({ where: { grantId: grant.id } });
    expect(goals.length).toBe(0);
  });

  it('does not create a goal for a CDI grant even when it has an active Citation', async () => {
    const grant = await createGrant({ cdi: true });
    const citation = await createCitation();
    await createGrantCitation(grant.id, citation.id);

    await createMonitoringGoals();

    const goals = await Goal.findAll({ where: { grantId: grant.id } });
    expect(goals.length).toBe(0);
  });

  it('does not create a goal when a monitoring goal was closed after the latest report delivery date', async () => {
    // last_closed_goal is NOW (goal closed today), which is after the past delivery date,
    // so no new goal should be created.
    const grant = await createGrant();
    const citation = await createCitation({ latest_report_delivery_date: new Date('2025-01-01') });
    await createGrantCitation(grant.id, citation.id);

    // Creating a Goal with status 'Closed' triggers an afterCreate hook that
    // inserts a GoalStatusChange(newStatus='Closed', performedAt=NOW). citations_live_values
    // then surfaces last_closed_goal=NOW > 2025-01-01, suppressing a new goal.
    const closedGoal = await createMonitoringGoalForGrant(grant.id, { status: 'Closed' });

    await createMonitoringGoals();

    const goals = await Goal.findAll({
      where: { grantId: grant.id, goalTemplateId: goalTemplate.id },
    });
    expect(goals.length).toBe(1);
    expect(goals[0].id).toBe(closedGoal.id);
  });

  it('creates a new goal when the existing monitoring goal was closed before the latest report delivery date', async () => {
    // last_closed_goal is in the past (before the delivery date), so suppression
    // does not apply and a new goal should be created.
    const grant = await createGrant();
    const citation = await createCitation({ latest_report_delivery_date: new Date('2025-06-01') });
    await createGrantCitation(grant.id, citation.id);

    // Create a Goal and manually add a GoalStatusChange with a performedAt
    // before the delivery date.
    const oldGoal = await createMonitoringGoalForGrant(grant.id, { status: 'Not Started' });
    await GoalStatusChange.create({
      goalId: oldGoal.id,
      oldStatus: 'Not Started',
      newStatus: 'Closed',
      reason: 'Monitoring resolved',
      context: null,
      performedAt: new Date('2025-01-01'), // before delivery date — should not suppress
      userId: null,
      userName: 'system',
    });
    // updateGoalStatus hook will have set oldGoal.status = 'Closed'; that's fine.

    await createMonitoringGoals();

    const goals = await Goal.findAll({
      where: { grantId: grant.id, goalTemplateId: goalTemplate.id },
    });
    const newGoal = goals.find((g) => g.status === 'Not Started');
    expect(newGoal).not.toBeNull();
  });

  it('creates a new goal when an existing monitoring goal is soft-deleted', async () => {
    const grant = await createGrant();
    const citation = await createCitation();
    await createGrantCitation(grant.id, citation.id);

    const toDelete = await createMonitoringGoalForGrant(grant.id);
    await toDelete.destroy(); // paranoid soft-delete

    await createMonitoringGoals();

    // findAll default scope excludes soft-deleted records
    const goals = await Goal.findAll({
      where: { grantId: grant.id, goalTemplateId: goalTemplate.id },
    });
    expect(goals.length).toBe(1);
    expect(goals[0].status).toBe('Not Started');
  });

  it('creates a goal for an inactive (non-CDI) grant that has active Citations', async () => {
    const grant = await createGrant({ status: 'Inactive' });
    const citation = await createCitation();
    await createGrantCitation(grant.id, citation.id);

    await createMonitoringGoals();

    const goals = await Goal.findAll({
      where: { grantId: grant.id, goalTemplateId: goalTemplate.id },
    });
    expect(goals.length).toBe(1);
  });
});
