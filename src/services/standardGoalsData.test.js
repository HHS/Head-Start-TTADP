import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveCitation,
  Citation,
  GrantCitation,
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
  createObjectivesForGoal,
} from './standardGoals';
import {
  createGrant,
  createRecipient,
  createGoalTemplate,
  createReport,
  destroyReport,
} from '../testUtils';
import { CREATION_METHOD, GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';

describe('standardGoals with Data', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });
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
    let normalizedCitationOnApprovedReport;
    let normalizedCitationOnNonApprovedReport;

    beforeAll(async () => {
      const uniqueUserId = `Test Topics User ${Date.now()}-${faker.datatype.number({ min: 1000, max: 9999 })}`;
      user = await User.create({
        id: faker.datatype.number({ min: 2000000, max: 2999999 }),
        homeRegionId: 1,
        name: uniqueUserId,
        hsesUsername: uniqueUserId,
        hsesUserId: uniqueUserId,
        lastLogin: new Date(),
      });

      creatorCollabType = await CollaboratorType.findOrCreate({
        where: { name: 'Creator' },
        defaults: { name: 'Creator', validForId: 1 },
      });

      recipientForTopics = await createRecipient({});

      grant = await createGrant({
        recipientId: recipientForTopics.id,
        regionId: 1,
      });

      goalTemplate = await createGoalTemplate({
        name: `Test Topics Template ${Date.now()}`,
        creationMethod: CREATION_METHOD.CURATED,
      });

      goalForTopics = await Goal.create({
        name: 'Goal for Topics Test',
        status: GOAL_STATUS.NOT_STARTED,
        createdAt: new Date(),
        goalTemplateId: goalTemplate.id,
        grantId: grant.id,
        createdVia: 'rtr',
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

      normalizedCitationOnApprovedReport = await Citation.create({
        mfid: faker.datatype.number({ min: 100000, max: 999999 }),
        finding_uuid: `approved-finding-${Date.now()}`,
        citation: 'Citation on approved report',
        raw_finding_type: 'Type 1',
        calculated_finding_type: 'Type 1',
        source_category: 'Source 1',
      });

      normalizedCitationOnNonApprovedReport = await Citation.create({
        mfid: faker.datatype.number({ min: 1000000, max: 1999999 }),
        finding_uuid: `non-approved-finding-${Date.now()}`,
        citation: 'Citation on non-approved report',
        raw_finding_type: 'Type 2',
        calculated_finding_type: 'Type 2',
        source_category: 'Source 2',
      });

      await GrantCitation.create({
        grantId: grant.id,
        citationId: normalizedCitationOnApprovedReport.id,
      });

      await GrantCitation.create({
        grantId: grant.id,
        citationId: normalizedCitationOnNonApprovedReport.id,
      });

      // Create citations for both approved and non-approved reports' objectives.
      // Keep legacy monitoringReferences and flattened fields aligned for test readability.
      citationOnApprovedReport = await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: activityReportObjectiveForApprovedReport.id,
        citationId: normalizedCitationOnApprovedReport.id,
        citation: 'Citation on approved report',
        monitoringReferences: [{
          grantId: grant.id,
          findingId: normalizedCitationOnApprovedReport.finding_uuid,
          reviewName: 'Review 1',
          standardId: 200001,
          grantNumber: grant.number,
          findingType: 'Type 1',
          findingSource: 'Source 1',
          acro: 'AOC',
          severity: 3,
          reportDeliveryDate: '2025-02-16T05:00:00+00:00',
          monitoringFindingStatusName: 'Complete',
          name: 'Citation 1',
        }],
        findingId: normalizedCitationOnApprovedReport.finding_uuid,
        grantId: grant.id,
        grantNumber: grant.number,
        reviewName: 'Review 1',
        standardId: 200001,
        findingType: 'Type 1',
        findingSource: 'Source 1',
        acro: 'AOC',
        name: 'Citation 1',
        severity: 3,
        reportDeliveryDate: '2025-02-16T05:00:00+00:00',
        monitoringFindingStatusName: 'Complete',
      });

      citationOnNonApprovedReport = await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: activityReportObjectiveForNonApprovedReport.id,
        citationId: normalizedCitationOnNonApprovedReport.id,
        citation: 'Citation on non-approved report',
        monitoringReferences: [{
          grantId: grant.id,
          findingId: normalizedCitationOnNonApprovedReport.finding_uuid,
          reviewName: 'Review 2',
          standardId: 200002,
          grantNumber: grant.number,
          findingType: 'Type 2',
          findingSource: 'Source 2',
          acro: 'AOC',
          severity: 3,
          reportDeliveryDate: '2025-02-17T05:00:00+00:00',
          monitoringFindingStatusName: 'Complete',
          name: 'Citation 2',
        }],
        findingId: normalizedCitationOnNonApprovedReport.finding_uuid,
        grantId: grant.id,
        grantNumber: grant.number,
        reviewName: 'Review 2',
        standardId: 200002,
        findingType: 'Type 2',
        findingSource: 'Source 2',
        acro: 'AOC',
        name: 'Citation 2',
        severity: 3,
        reportDeliveryDate: '2025-02-17T05:00:00+00:00',
        monitoringFindingStatusName: 'Complete',
      });
    });

    afterAll(async () => {
      const citationIds = [
        citationOnApprovedReport?.id,
        citationOnNonApprovedReport?.id,
      ].filter(Boolean);

      const normalizedCitationIds = [
        normalizedCitationOnApprovedReport?.id,
        normalizedCitationOnNonApprovedReport?.id,
      ].filter(Boolean);

      const topicIds = [
        topicOnApprovedReport?.id,
        topicOnNonApprovedReport?.id,
      ].filter(Boolean);

      const activityReportObjectiveIds = [
        activityReportObjectiveForApprovedReport?.id,
        activityReportObjectiveForNonApprovedReport?.id,
      ].filter(Boolean);

      const objectiveIds = [
        approvedObjective?.id,
        nonApprovedObjective?.id,
      ].filter(Boolean);

      // Clean up all the resources created for this test
      // Clean up citations first
      if (citationIds.length) {
        await ActivityReportObjectiveCitation.destroy({
          where: {
            id: citationIds,
          },
          force: true,
        });
      }

      if (grant?.id && normalizedCitationIds.length) {
        await GrantCitation.destroy({
          where: {
            grantId: grant.id,
            citationId: normalizedCitationIds,
          },
          force: true,
        });
      }

      if (normalizedCitationIds.length) {
        await Citation.destroy({
          where: {
            id: normalizedCitationIds,
          },
          force: true,
        });
      }

      if (topicIds.length) {
        await ActivityReportObjectiveTopic.destroy({
          where: {
            topicId: topicIds,
          },
        });

        await Topic.destroy({
          where: {
            id: topicIds,
          },
          force: true,
        });
      }

      if (activityReportObjectiveIds.length) {
        await ActivityReportObjective.destroy({
          where: {
            id: activityReportObjectiveIds,
          },
          individualHooks: true,
          force: true,
        });
      }

      if (goalForTopics?.id) {
        await GoalCollaborator.destroy({
          where: {
            goalId: goalForTopics.id,
          },
          force: true,
        });
      }

      if (objectiveIds.length) {
        await Objective.destroy({
          where: {
            id: objectiveIds,
          },
          force: true,
        });
      }

      if (approvedReport) {
        await destroyReport(approvedReport);
      }

      if (nonApprovedReport) {
        await destroyReport(nonApprovedReport);
      }

      if (goalForTopics?.id) {
        await Goal.destroy({ where: { id: goalForTopics.id }, force: true });
      }

      if (goalTemplate?.id) {
        await GoalTemplate.destroy({ where: { id: goalTemplate.id }, force: true });
      }

      if (grant?.id) {
        await Grant.destroy({ where: { id: grant.id }, individualHooks: true, force: true });
      }

      if (recipientForTopics?.id) {
        await Recipient.destroy({ where: { id: recipientForTopics.id }, force: true });
      }

      if (creatorCollabType?.[0]?.id) {
        await CollaboratorType.destroy({
          where: { id: creatorCollabType[0].id },
          force: true,
        });
      }

      if (user?.id) {
        await User.destroy({ where: { id: user.id }, force: true });
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

      // Should include the citation from the approved report
      expect(objectiveCitations).toContain('Type 1 - Citation on approved report - Source 1');

      // Should NOT include the citation from the non-approved report
      expect(objectiveCitations).not.toContain('Type 2 - Citation on non-approved report - Source 2');
    });

    it('only uses directly included flattened citation references', async () => {
      await ActivityReportObjectiveCitation.update({
        monitoringReferences: [],
        acro: '',
        findingType: '',
        findingSource: '',
      }, {
        where: {
          id: [
            citationOnApprovedReport.id,
            citationOnNonApprovedReport.id,
          ],
        },
        individualHooks: true,
      });

      const result = await standardGoalsForRecipient(
        recipientForTopics.id,
        grant.regionId,
        {},
        true,
      );

      const objectiveCitations = result.goalRows[0].objectives.flatMap(
        (objective) => (
          objective.citations
            ? objective.citations.map((citation) => (
              typeof citation === 'string' ? citation : citation.name
            ))
            : []
        ),
      );

      expect(objectiveCitations).not.toContain('Type 1 - Citation on approved report - Source 1');
      expect(objectiveCitations).not.toContain('Type 2 - Citation on non-approved report - Source 2');
    });
  });

  describe('createObjectivesForGoal', () => {
    let user;
    let recipient;
    let grant;
    let goalTemplate;
    let goalTemplate2;
    let goal1;
    let goal2;
    let objective;
    let creatorCollabType;

    beforeAll(async () => {
      // Create test user with unique hsesUserId
      const uniqueUserId = `Test Objective User ${Date.now()}`;
      user = await User.create({
        id: faker.datatype.number({ min: 3000 }),
        homeRegionId: 1,
        name: uniqueUserId,
        hsesUsername: uniqueUserId,
        hsesUserId: uniqueUserId,
        lastLogin: new Date(),
      });

      // Create collaborator type
      creatorCollabType = await CollaboratorType.findOrCreate({
        where: { name: 'Creator' },
        defaults: { name: 'Creator', validForId: 1 },
      });

      // Create recipient and grant
      recipient = await createRecipient({});
      grant = await createGrant({
        recipientId: recipient.id,
        regionId: 1,
      });

      // Create goal templates - one for each goal to avoid unique constraint violation
      goalTemplate = await createGoalTemplate({
        name: 'Test Objectives Template 1',
        creationMethod: CREATION_METHOD.CURATED,
      });

      goalTemplate2 = await createGoalTemplate({
        name: 'Test Objectives Template 2',
        creationMethod: CREATION_METHOD.CURATED,
      });

      // Create two goals - one that will contain the objective and one we'll try to update with
      goal1 = await Goal.create({
        name: 'Goal with Original Objective',
        status: GOAL_STATUS.NOT_STARTED,
        createdAt: new Date(),
        goalTemplateId: goalTemplate.id,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      goal2 = await Goal.create({
        name: 'Goal for Update',
        status: GOAL_STATUS.NOT_STARTED,
        createdAt: new Date(),
        goalTemplateId: goalTemplate2.id,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      await GoalCollaborator.create({
        goalId: goal1.id,
        userId: user.id,
        collaboratorTypeId: creatorCollabType[0].id,
      });

      await GoalCollaborator.create({
        goalId: goal2.id,
        userId: user.id,
        collaboratorTypeId: creatorCollabType[0].id,
      });

      // Create objective in goal1
      objective = await Objective.create({
        title: 'Original Objective',
        status: OBJECTIVE_STATUS.NOT_STARTED,
        goalId: goal1.id,
        createdVia: 'rtr',
        onApprovedAR: false,
      });
    });

    afterAll(async () => {
      // Clean up all resources
      await Objective.destroy({ where: { goalId: [goal1.id, goal2.id] }, force: true });

      await GoalCollaborator.destroy({
        where: {
          goalId: [goal1.id, goal2.id],
        },
        force: true,
      });

      await Goal.destroy({
        where: {
          id: [goal1.id, goal2.id],
        },
        force: true,
      });

      await GoalTemplate.destroy({
        where: { id: [goalTemplate.id, goalTemplate2.id] },
        force: true,
      });

      await Grant.destroy({
        where: { id: grant.id },
        individualHooks: true,
        force: true,
      });

      await Recipient.destroy({
        where: { id: recipient.id },
        force: true,
      });

      await CollaboratorType.destroy({
        where: { id: creatorCollabType[0].id },
        force: true,
      });

      await User.destroy({
        where: { id: user.id },
        force: true,
      });
    });

    it('should look up objective via ids array and goal id when goal id does not match the objective.goalId', async () => {
    // Create input with IDs array that includes the existing objective ID
      const objectiveInput = {
        id: 99999, // ID that doesn't exist in the database
        ids: [99999, objective.id, 88888], // Include the real objective ID in the array
        isNew: false,
        ttaProvided: 'Updated TTA provided',
        title: 'Updated Objective Title',
        status: OBJECTIVE_STATUS.IN_PROGRESS,
        goalId: goal2.id, // Different from the objective's current goalId
      };

      // Call createObjectivesForGoal with goal2 (different from objective's current goal)
      const result = await createObjectivesForGoal(goal1, [objectiveInput]);

      // Get the updated objective from the database to verify changes
      const updatedObjective = await Objective.findAll({
        where: { goalId: goal1.id },
      });

      // Verify the objective was found and associated with goal2
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(objective.id);
      expect(updatedObjective).toHaveLength(1);
      expect(updatedObjective[0].title).toBe('Updated Objective Title');
      expect(updatedObjective[0].goalId).toBe(goal1.id);

      // Ensure no objecitves are created under goal2
      const objectivesUnderGoal2 = await Objective.findAll({
        where: { goalId: goal2.id },
      });
      expect(objectivesUnderGoal2).toHaveLength(0);
    });
  });
});
