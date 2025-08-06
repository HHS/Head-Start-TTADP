import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Topic,
  GoalTemplate,
  GoalCollaborator,
  Goal,
  Objective,
  Grant,
  Recipient,
  CollaboratorType,
  User,
} from '../models';
import {
  standardGoalsForRecipient,
} from './standardGoals';
import {
  createGrant,
  createRecipient,
  createGoalTemplate,
  createReport,
  destroyReport,
} from '../testUtils';
import { CREATION_METHOD, GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';

describe('standardGoalsForRecipient Only Approved Topics', () => {
  let user;
  let recipientForTopics;
  let grant;
  let goalTemplate;
  let goalForTopics;
  let topicOnApprovedObjective;
  let topicOnNonApprovedObjective;
  let approvedObjective;
  let nonApprovedObjective;
  let activityReport;
  let activityReportObjectiveForApproved;
  let activityReportObjectiveForNonApproved;
  let creatorCollabType;

  beforeAll(async () => {
    user = await User.create({
      id: faker.datatype.number({ min: 2000 }),
      homeRegionId: 1,
      name: 'Test Topics User',
      hsesUsername: 'Test Topics User',
      hsesUserId: 'Test Topics User',
      lastLogin: new Date(),
    });

    creatorCollabType = await CollaboratorType.findOrCreate({
      where: { name: 'Creator' },
      defaults: { name: 'Creator' },
      validForId: 1,
    });

    recipientForTopics = await createRecipient({});

    grant = await createGrant({
      recipientId: recipientForTopics.id,
      regionId: 1,
    });

    goalTemplate = await createGoalTemplate({
      name: 'Test Topics Template',
      creationMethod: CREATION_METHOD.CURATED,
    });

    goalForTopics = await Goal.create({
      name: 'Goal for Topics Test',
      status: GOAL_STATUS.NOT_STARTED,
      createdAt: new Date(),
      goalTemplateId: goalTemplate.id,
      grantId: grant.id,
    });

    await GoalCollaborator.create({
      goalId: goalForTopics.id,
      userId: user.id,
      collaboratorTypeId: creatorCollabType[0].id,
    });

    // Create objectives - one approved, one not approved
    approvedObjective = await Objective.create({
      title: 'Approved Objective',
      status: OBJECTIVE_STATUS.NOT_STARTED,
      goalId: goalForTopics.id,
      createdVia: 'activityReport',
      onApprovedAR: true,
    });

    nonApprovedObjective = await Objective.create({
      title: 'Non-Approved Objective',
      status: OBJECTIVE_STATUS.NOT_STARTED,
      goalId: goalForTopics.id,
      createdVia: 'activityReport',
      onApprovedAR: false,
    });

    // Create activity report
    activityReport = await createReport({
      calculatedStatus: REPORT_STATUSES.APPROVED,
      activityRecipients: [
        {
          grantId: grant.id,
        },
      ],
    });

    // Create activity report objectives
    activityReportObjectiveForApproved = await ActivityReportObjective.create({
      activityReportId: activityReport.id,
      objectiveId: approvedObjective.id,
    });

    activityReportObjectiveForNonApproved = await ActivityReportObjective.create({
      activityReportId: activityReport.id,
      objectiveId: nonApprovedObjective.id,
    });

    // Create topics
    topicOnApprovedObjective = await Topic.create({
      name: 'Topic on approved objective',
    });

    topicOnNonApprovedObjective = await Topic.create({
      name: 'Topic on non-approved objective',
    });

    // Link topics to activity report objectives
    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: activityReportObjectiveForApproved.id,
      topicId: topicOnApprovedObjective.id,
    });

    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: activityReportObjectiveForNonApproved.id,
      topicId: topicOnNonApprovedObjective.id,
    });
  });

  afterAll(async () => {
    // Clean up all the resources created for this test
    await ActivityReportObjectiveTopic.destroy({
      where: {
        topicId: [
          topicOnApprovedObjective.id,
          topicOnNonApprovedObjective.id,
        ],
      },
    });

    await Topic.destroy({
      where: {
        id: [
          topicOnApprovedObjective.id,
          topicOnNonApprovedObjective.id,
        ],
      },
      force: true,
    });

    await ActivityReportObjective.destroy({
      where: {
        id: [
          activityReportObjectiveForApproved.id,
          activityReportObjectiveForNonApproved.id,
        ],
      },
      individualHooks: true,
      force: true,
    });

    await GoalCollaborator.destroy({
      where: {
        goalId: goalForTopics.id,
      },
      force: true,
    });

    await Objective.destroy({
      where: {
        id: [
          approvedObjective.id,
          nonApprovedObjective.id,
        ],
      },
      force: true,
    });

    await destroyReport(activityReport);

    await Goal.destroy({ where: { id: goalForTopics.id }, force: true });
    await GoalTemplate.destroy({ where: { id: goalTemplate.id }, force: true });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true, force: true });
    await Recipient.destroy({ where: { id: recipientForTopics.id }, force: true });
    await CollaboratorType.destroy({
      where: { id: creatorCollabType[0].id },
      force: true,
    });
    await User.destroy({ where: { id: user.id }, force: true });

    await db.sequelize.close();
  });

  it('returns goals with topics only from objectives with onApprovedAR=true', async () => {
    const result = await standardGoalsForRecipient(
      recipientForTopics.id,
      grant.regionId,
      {},
      true,
    );

    expect(result.count).toBe(1);

    // Extract all topics from the goals
    const goalRow = result.goalRows[0];

    // Access the topics correctly - they might be strings directly instead of objects
    const objectiveTopics = goalRow.objectives.flatMap(
      (objective) => {
        // Handle both string topics and object topics with name property
        if (objective.topics) {
          return objective.topics.map((topic) => (typeof topic === 'string' ? topic : topic.name));
        }
        return [];
      },
    );

    // Should include the topic from the approved objective
    expect(objectiveTopics).toContain('Topic on approved objective');

    // Should NOT include the topic from the non-approved objective
    expect(objectiveTopics).not.toContain('Topic on non-approved objective');
  });
});
