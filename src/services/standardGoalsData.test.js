import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveCitation,
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
  let topicOnApprovedReport;
  let topicOnNonApprovedReport;
  let approvedObjective;
  let nonApprovedObjective;
  let approvedReport;
  let nonApprovedReport;
  let activityReportObjectiveForApprovedReport;
  let activityReportObjectiveForNonApprovedReport;
  let creatorCollabType;
  let citationOnApprovedReport;
  let citationOnNonApprovedReport;

  beforeAll(async () => {
    try {
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

      // Create objectives - both with onApprovedAR=true but will be linked to different reports
      approvedObjective = await Objective.create({
        title: 'Objective on Approved Report',
        status: OBJECTIVE_STATUS.NOT_STARTED,
        goalId: goalForTopics.id,
        createdVia: 'activityReport',
        onApprovedAR: true,
      });

      nonApprovedObjective = await Objective.create({
        title: 'Objective on Non-Approved Report',
        status: OBJECTIVE_STATUS.NOT_STARTED,
        goalId: goalForTopics.id,
        createdVia: 'activityReport',
        // Also set to true to test that we're filtering by report status, not this flag
        onApprovedAR: true,
      });

      // Create activity reports - one approved, one not approved
      approvedReport = await createReport({
        calculatedStatus: REPORT_STATUSES.APPROVED,
        activityRecipients: [
          {
            grantId: grant.id,
          },
        ],
      });

      nonApprovedReport = await createReport({
        calculatedStatus: REPORT_STATUSES.SUBMITTED, // Not approved
        activityRecipients: [
          {
            grantId: grant.id,
          },
        ],
      });

      // Create activity report objectives
      activityReportObjectiveForApprovedReport = await ActivityReportObjective.create({
        activityReportId: approvedReport.id,
        objectiveId: approvedObjective.id,
      });

      activityReportObjectiveForNonApprovedReport = await ActivityReportObjective.create({
        activityReportId: nonApprovedReport.id,
        objectiveId: nonApprovedObjective.id,
      });

      // Create topics
      topicOnApprovedReport = await Topic.create({
        name: 'Topic on approved report',
      });

      topicOnNonApprovedReport = await Topic.create({
        name: 'Topic on non-approved report',
      });

      // Link topics to activity report objectives
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: activityReportObjectiveForApprovedReport.id,
        topicId: topicOnApprovedReport.id,
      });

      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: activityReportObjectiveForNonApprovedReport.id,
        topicId: topicOnNonApprovedReport.id,
      });

      // Create citations for both approved and non-approved reports' objectives
      citationOnApprovedReport = await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: activityReportObjectiveForApprovedReport.id,
        citation: 'Citation on approved report',
        monitoringReferences: [{
          grantId: grant.id,
          findingId: 1,
          reviewName: 'Review 1',
          findingType: 'Type 1',
          findingSource: 'Source 1',
        }],
      });

      citationOnNonApprovedReport = await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: activityReportObjectiveForNonApprovedReport.id,
        citation: 'Citation on non-approved report',
        monitoringReferences: [{
          grantId: grant.id,
          findingId: 2,
          reviewName: 'Review 2',
          findingType: 'Type 2',
          findingSource: 'Source 2',
        }],
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in beforeAll setup:', error);
    }
  });

  afterAll(async () => {
    try {
      // Clean up all the resources created for this test
      // Clean up citations first
      await ActivityReportObjectiveCitation.destroy({
        where: {
          id: [
            citationOnApprovedReport.id,
            citationOnNonApprovedReport.id,
          ],
        },
        force: true,
      });

      await ActivityReportObjectiveTopic.destroy({
        where: {
          topicId: [
            topicOnApprovedReport.id,
            topicOnNonApprovedReport.id,
          ],
        },
      });

      await Topic.destroy({
        where: {
          id: [
            topicOnApprovedReport.id,
            topicOnNonApprovedReport.id,
          ],
        },
        force: true,
      });

      await ActivityReportObjective.destroy({
        where: {
          id: [
            activityReportObjectiveForApprovedReport.id,
            activityReportObjectiveForNonApprovedReport.id,
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

      await destroyReport(approvedReport);
      await destroyReport(nonApprovedReport);

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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in afterAll cleanup:', error);
    }
  });

  it('returns goals with topics and citations only from activity reports with calculatedStatus=APPROVED', async () => {
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

    // Should include the topic from the approved report
    expect(objectiveTopics).toContain('Topic on approved report');

    // Should NOT include the topic from the non-approved report
    expect(objectiveTopics).not.toContain('Topic on non-approved report');

    // Get the citations to assert.
    const objectiveCitations = goalRow.objectives.flatMap(
      (objective) => {
        // Handle both string topics and object topics with name property
        if (objective.citations) {
          return objective.citations.map((citation) => (typeof citation === 'string' ? citation : citation.name));
        }
        return [];
      },
    );

    const objectiveStructure = JSON.stringify(goalRow.objectives, null, 2);
    expect(true).toBeTruthy(); // Force output the structure in case of failure

    // Should include the citation from the approved report
    expect(objectiveCitations).toContain('Type 1 - Citation on approved report - Source 1');

    // Should NOT include the citation from the non-approved report
    expect(objectiveCitations).not.toContain('Type 2 - Citation on non-approved report - Source 2');
  });
});
