/* eslint-disable max-len */
import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveCourse,
  ActivityReportObjectiveCitation,
  ActivityRecipient,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportGoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  Goal,
  Objective,
  Grant,
  Recipient,
  File,
  Topic,
  Course,
  Resource,
} from '../models';
import {
  saveStandardGoalsForReport,
} from './standardGoals';
import {
  createGrant,
  createRecipient,
  createGoalTemplate,
  createReport,
} from '../testUtils';
import { CREATION_METHOD, GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';

const mockFiles = [{
  id: 140000048,
  originalFileName: 'Test Standard Goal1.pdf',
  key: '508bdc9e-8dec-4d64-b83d-59a72a4f4335.pdf',
  status: 'APPROVED',
  fileSize: 54417,
}, {
  id: 140000049,
  originalFileName: 'Test Standard Goal 2.pdf',
  key: '508bdc9e-8dec-4d64-b83d-59a72a4f5487.pdf',
  status: 'APPROVED',
  fileSize: 54417,
}];

describe('save standard goals for report', () => {
  let recipient1;
  let recipient2;
  let recipient3;

  const cleanUpGoalAndAllAssociations = async (
    templateIdToClean,
    reportIdToClean,
    grantIdsToClean,
    topics = [],
    courses = [],
    files = [],
    resources = [],
  ) => {
    // Get all ARO ids.
    const activityReportObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: reportIdToClean,
      },
    });
    const activityReportObjectiveIds = activityReportObjectives.map(
      (activityReportObjective) => activityReportObjective.id,
    );
    // Clean up the ActivityReportObjectiveTopics.
    await ActivityReportObjectiveTopic.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIds,
      },
    });
    // Clean up ActivityReportObjectiveCourses.
    await ActivityReportObjectiveCourse.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIds,
      },
    });
    // Clean up ActivityReportObjectiveFiles.
    await ActivityReportObjectiveFile.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIds,
      },
    });
    // Clean all ActivityReportObjectiveCitations.
    await ActivityReportObjectiveCitation.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIds,
      },
    });
    // Destroy the ActivityReportObjectives.
    await ActivityReportObjective.destroy({
      where: {
        id: activityReportObjectiveIds,
      },
    });
    const activityReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: reportIdToClean,
      },
    });
    const goalIds = activityReportGoals.map((g) => g.goalId);

    // Destroy the objectives.
    await Objective.destroy({
      where: {
        [Op.or]: [
          { goalId: goalIds },
          { createdViaActivityReportId: reportIdToClean },
        ],
      },
      force: true,
    });

    // Destroy any ActivityReportGoalFieldResponses.
    await ActivityReportGoalFieldResponse.destroy({
      where: {
        activityReportGoalId: activityReportGoals.map((g) => g.id),
      },
    });

    await GoalFieldResponse.destroy({
      where: {
        goalId: goalIds,
      },
    });
    // Destroy the ActivityReportGoals.
    await ActivityReportGoal.destroy({
      where: {
        activityReportId: reportIdToClean,
      },
    });
    // Destroy the goals.
    await Goal.destroy({
      where: {
        grantId: grantIdsToClean,
      },
      force: true,
    });
    // Destroy the report and grant.
    await ActivityRecipient.destroy({
      where: {
        activityReportId: reportIdToClean,
      },
    });

    await ActivityReport.destroy({
      where: {
        id: reportIdToClean,
      },
    });

    // Destroy any GoalFieldResponses.
    await GoalFieldResponse.destroy({
      where: {
        goalId: goalIds,
      },
    });

    // Destroy any GoalTemplateFieldPrompts.
    await GoalTemplateFieldPrompt.destroy({
      where: {
        goalTemplateId: templateIdToClean,
      },
    });

    // Destroy any Grant.
    await Grant.destroy({
      where: {
        id: grantIdsToClean,
      },
      individualHooks: true,
      force: true,
    });
    // Destroy the topics, courses, files.
    await Topic.destroy({ where: { id: topics.map((topic) => topic.id) } });
    await Promise.all(courses.map((course) => Course.destroy({ where: { id: course.id } })));
    await Promise.all(files.map((file) => File.destroy({ where: { id: file.id } })));
    await Promise.all(resources.map(
      (resource) => Resource.destroy({ where: { url: resource.url } }),
    ));
    // Destroy the goal template.
    await GoalTemplate.destroy({
      where: {
        id: templateIdToClean,
      },
      individualHooks: true,
      force: true,
    });
  };

  afterAll(async () => {
    await Recipient.destroy({
      where: {
        id: [recipient1.id, recipient2.id, recipient3.id],
      },
    });
    await db.sequelize.close();
  });
  beforeAll(async () => {
    recipient1 = await createRecipient({});
    recipient2 = await createRecipient({});
    recipient3 = await createRecipient({});
  });

  describe('save standard ar goals', () => {
    describe('creates standard goal for ar', () => {
      let report;
      let grant;
      let grantWithSuspendedGoal;
      let goalTemplate;
      let files;
      let courses;
      let topics;
      let resources;

      beforeAll(async () => {
        grant = await createGrant({
          recipientId: recipient1.id,
        });

        grantWithSuspendedGoal = await createGrant({
          recipientId: recipient2.id,
        });

        goalTemplate = await createGoalTemplate({
          name: 'Simple standard goal template',
          creationMethod: CREATION_METHOD.CURATED,
        });

        // We expect this to be un-suspended.
        await Goal.create({
          name: goalTemplate.templateName,
          goalTemplateId: goalTemplate.id,
          status: GOAL_STATUS.SUSPENDED,
          grantId: grantWithSuspendedGoal.id,
        });

        report = await createReport({
          activityRecipients: [{ grantId: grant.id }],
          status: REPORT_STATUSES.IN_PROGRESS,
        });

        await Promise.all(mockFiles.map(
          async (mockFile) => File.findOrCreate({ where: { ...mockFile } }),
        ));
        files = await File.findAll({ where: { id: mockFiles.map((mockFile) => mockFile.id) }, order: ['id'] });

        const courseOne = await Course.create({
          name: faker.datatype.string(200),
        });

        const courseTwo = await Course.create({
          name: faker.datatype.string(200),
        });

        courses = [courseOne, courseTwo];

        const [topic1] = await Topic.findOrCreate({ where: { name: 'Coaching' } });
        const [topic2] = await Topic.findOrCreate({ where: { name: 'Communication' } });
        const [topics2] = await Topic.findOrCreate({ where: { name: 'Community and Self-Assessment' } });

        topics = [
          { id: topic1.id, name: topic1.name },
          { id: topic2.id, name: topic2.name },
          { id: topics2.id, name: topics2.name },
        ];

        resources = [
          { url: 'http://standard.goals.resource1.com' },
          { url: 'http://standard.goals.resource2.com' },
          { url: 'http://standard.goals.resource3.com' },
        ];
        await Resource.create({
          url: resources[0].url,
        });
        await Resource.create({
          url: resources[1].url,
        });
        await Resource.create({
          url: resources[2].url,
        });
      });

      afterAll(async () => {
        await cleanUpGoalAndAllAssociations(
          goalTemplate.id,
          report.id,
          [grant.id, grantWithSuspendedGoal.id],
          topics,
          courses,
          files,
          resources,
        );
      });

      const assertStandardGoal = async (goalToAssert, objecitveTitle, objectiveTta, goalStatus = 'Not Started') => {
        // We need to assert all goal values.
        expect(goalToAssert.name).toEqual(goalTemplate.templateName);
        expect(goalToAssert.goalTemplateId).toEqual(goalTemplate.id);
        expect(goalToAssert.timeframe).toBeNull();
        expect(goalToAssert.source).toBeNull();

        // Assert ActivityReportGoals are created with the values from the report and goal.
        const savedActivityReportGoals = await ActivityReportGoal.findAll({
          where: {
            activityReportId: report.id,
            goalId: goalToAssert.id,
          },
        });

        expect(savedActivityReportGoals.length).toBe(1);
        savedActivityReportGoals.forEach((savedActivityReportGoal) => {
          expect(savedActivityReportGoal.status).toEqual(goalStatus);
        });

        // Assert the objective was created.
        const savedObjectives = await Objective.findAll({
          where: {
            goalId: goalToAssert.id,
          },
        });
        expect(savedObjectives.length).toBe(1);

        expect(savedObjectives[0].title).toEqual(objecitveTitle);
        expect(savedObjectives[0].status).toEqual(OBJECTIVE_STATUS.NOT_STARTED);
        expect(savedObjectives[0].goalId).toEqual(goalToAssert.id);

        const activityReportObjectives = await ActivityReportObjective.findAll({
          where: {
            activityReportId: report.id,
          },
        });

        expect(activityReportObjectives.length).toBe(1);
        expect(savedObjectives[0].title).toEqual(objecitveTitle);
        expect(activityReportObjectives[0].status).toEqual(OBJECTIVE_STATUS.NOT_STARTED);
        expect(activityReportObjectives[0].objectiveId).toEqual(savedObjectives[0].id);
        expect(activityReportObjectives[0].ttaProvided).toEqual(objectiveTta);

        // Assert the activity report objective topics were created.
        const savedTopics = await ActivityReportObjectiveTopic.findAll({
          where: {
            activityReportObjectiveId: activityReportObjectives[0].id,
          },
        });

        expect(savedTopics.length).toBe(3);
        const topic1 = savedTopics.filter((t) => t.topicId === topics[0].id);
        expect(topic1).toBeDefined();
        const topic2 = savedTopics.filter((t) => t.topicId === topics[1].id);
        expect(topic2).toBeDefined();
        const topic3 = savedTopics.filter((t) => t.topicId === topics[2].id);
        expect(topic3).toBeDefined();

        // Assert the activity report objective files were created.
        const savedFiles = await ActivityReportObjectiveFile.findAll({
          where: {
            activityReportObjectiveId: activityReportObjectives[0].id,
          },
        });

        expect(savedFiles.length).toBe(2);
        const file1 = savedFiles.filter((f) => f.fileId === files[0].id);
        expect(file1).toBeDefined();

        const file2 = savedFiles.filter((f) => f.fileId === files[1].id);
        expect(file2).toBeDefined();

        // Assert the resources are saved in the ActivityReportObjectiveResources table.
        const savedResources = await ActivityReportObjectiveResource.findAll({
          where: {
            activityReportObjectiveId: activityReportObjectives[0].id,
          },
        });

        expect(savedResources.length).toBe(3);
        const resource1 = savedResources.filter((r) => r.url === resources[0]);
        expect(resource1).toBeDefined();
        const resource2 = savedResources.filter((r) => r.url === resources[1]);
        expect(resource2).toBeDefined();
        const resource3 = savedResources.filter((r) => r.url === resources[2]);
        expect(resource3).toBeDefined();
      };

      /*
      Test ensures the initial creation and updating of a standard goal.
      */
      it('creates a standard goal from scratch', async () => {
        const goals = [
          {
            goalIds: [],
            grantIds: [grant.id],
            goalTemplateId: goalTemplate.id,
            name: goalTemplate.templateName,
            status: GOAL_STATUS.NOT_STARTED,
            timeframe: null,
            source: [],
            objectives: [
              {
                id: null,
                isNew: true,
                ttaProvided: 'tta for a standard goal objective',
                title: 'objective for a standard goal',
                status: OBJECTIVE_STATUS.NOT_STARTED,
                topics,
                resources,
                files,
                courses,
                closeSuspendReason: null,
                closeSuspendContext: null,
                ActivityReportObjective: {},
                supportType: 'Maintaining',
                goalId: null,
                createdHere: false,
              },
            ],
          },
        ];
        // Retrieve the goal we created from the template.
        await saveStandardGoalsForReport(goals, 1, report);

        let savedGoals = await Goal.findAll({
          where: {
            name: goalTemplate.templateName,
            grantId: grant.id,
          },
        });

        // Assert the goals were created.
        expect(savedGoals.length).toBe(1);

        await assertStandardGoal(savedGoals[0], 'objective for a standard goal', 'tta for a standard goal objective');
        const savedGoal = savedGoals[0];

        const savedObjective = await Objective.findOne({
          where: {
            title: 'objective for a standard goal',
          },
        });

        const updatedGoal = [
          {
            goalIds: [savedGoal.id],
            grantIds: [grant.id],
            goalTemplateId: goalTemplate.id,
            name: goalTemplate.templateName,
            status: GOAL_STATUS.NOT_STARTED,
            timeframe: null,
            source: [],
            objectives: [
              {
                id: savedObjective.id,
                isNew: false,
                ttaProvided: 'tta for a standard goal objective updated',
                title: 'objective for a standard goal updated',
                status: OBJECTIVE_STATUS.NOT_STARTED,
                topics,
                resources,
                files,
                courses,
                closeSuspendReason: null,
                closeSuspendContext: null,
                ActivityReportObjective: {},
                supportType: 'Maintaining',
                goalId: null,
                createdHere: false,
              },
            ],
          },
        ];

        // Save again with some updates ensure we don't create duplicates.
        await saveStandardGoalsForReport(updatedGoal, 1, report);

        savedGoals = await Goal.findAll({
          where: {
            name: goalTemplate.templateName,
            grantId: grant.id,
          },
        });

        // Assert the goals were created.
        expect(savedGoals.length).toBe(1);
        await assertStandardGoal(savedGoals[0], 'objective for a standard goal updated', 'tta for a standard goal objective updated');
      });

      /*
      Tests that if we have a suspended standard goal for this grant we unsuspend and uses it.
      */
      it('does not un-suspend a suspended goal when using it', async () => {
        const goals = [
          {
            goalIds: [],
            grantIds: [grantWithSuspendedGoal.id],
            goalTemplateId: goalTemplate.id,
            name: goalTemplate.templateName,
            status: GOAL_STATUS.NOT_STARTED,
            timeframe: null,
            source: [],
            objectives: [
              {
                id: null,
                isNew: true,
                ttaProvided: 'tta for a suspended goal objective',
                title: 'objective for a suspended goal',
                status: OBJECTIVE_STATUS.NOT_STARTED,
                topics,
                resources,
                files,
                courses,
                closeSuspendReason: null,
                closeSuspendContext: null,
                ActivityReportObjective: {},
                supportType: 'Maintaining',
                goalId: null,
                createdHere: false,
              },
            ],
          },
        ];

        // Retrieve the goal we created from the template.
        await saveStandardGoalsForReport(goals, 1, report);

        const savedGoals = await Goal.findAll({
          where: {
            name: goalTemplate.templateName,
            grantId: grantWithSuspendedGoal.id,
            status: GOAL_STATUS.SUSPENDED,
          },
        });

        // Assert the goals were created.
        expect(savedGoals.length).toBe(1);

        await assertStandardGoal(savedGoals[0], 'objective for a suspended goal', 'tta for a suspended goal objective', GOAL_STATUS.SUSPENDED);
      });
    });
  });

  describe('goal field responses', () => {
    let grant;
    let goalTemplate;
    let prompt;
    let report;
    beforeAll(async () => {
      grant = await createGrant({
        recipientId: recipient1.id,
      });

      goalTemplate = await createGoalTemplate({
        name: 'Goal Template with Prompts',
        creationMethod: CREATION_METHOD.CURATED,
      });

      prompt = await GoalTemplateFieldPrompt.create({
        goalTemplateId: goalTemplate.id,
        ordinal: 1,
        title: faker.lorem.sentence(),
        prompt: faker.lorem.sentence(),
        type: 'text',
        hint: faker.lorem.sentence(),
        caution: faker.lorem.sentence(),
        options: ['option 1', 'option 2', 'option 3'],
      });

      report = await createReport({
        activityRecipients: [{ grantId: grant.id }],
        status: REPORT_STATUSES.IN_PROGRESS,
      });
    });

    afterAll(async () => {
      await cleanUpGoalAndAllAssociations(
        goalTemplate.id,
        report.id,
        [grant.id],
      );
    });

    /*
    This test ensures we correctly create and update goal field responses for FEI goals.
    */
    it('creates a standard goal with field responses', async () => {
      // Create goal with field responses.
      const goals = [
        {
          goalIds: [],
          grantIds: [grant.id],
          goalTemplateId: goalTemplate.id,
          name: goalTemplate.templateName,
          status: GOAL_STATUS.NOT_STARTED,
          timeframe: null,
          source: [],
          prompts: [
            {
              promptId: prompt.id,
              grantId: grant.id,
              response: ['option 2', 'option 3'],
            },
          ],
          objectives: [
            {
              id: null,
              isNew: true,
              ttaProvided: 'tta for a standard goal objective',
              title: 'objective for a standard goal',
              status: OBJECTIVE_STATUS.NOT_STARTED,
              topics: [],
              resources: [],
              files: [],
              courses: [],
              closeSuspendReason: null,
              closeSuspendContext: null,
              ActivityReportObjective: {},
              supportType: 'Maintaining',
              goalId: null,
              createdHere: false,
            },
          ],
        },
      ];

      await saveStandardGoalsForReport(goals, 1, report);
      const savedGoals = await Goal.findAll({
        where: {
          name: goalTemplate.templateName,
        },
      });

      // Assert the goals were created.
      expect(savedGoals.length).toBe(1);
      const savedGoal = savedGoals[0];
      const savedGoalFieldResponses = await GoalFieldResponse.findAll({
        where: {
          goalId: savedGoal.id,
        },
      });

      // Assert the goal field responses were created.
      expect(savedGoalFieldResponses.length).toBe(1);
      expect(savedGoalFieldResponses[0].goalTemplateFieldPromptId).toEqual(prompt.id);
      expect(savedGoalFieldResponses[0].response).toEqual(['option 2', 'option 3']);

      // Get the ActivityReportGoals.
      const savedActivityReportGoals = await ActivityReportGoal.findAll({
        where: {
          activityReportId: report.id,
        },
      });

      // Assert the ActivityReportGoalFieldResponses was created.
      const savedActivityReportGoalFieldResponses = await ActivityReportGoalFieldResponse.findAll({
        where: {
          activityReportGoalId: savedActivityReportGoals.map((g) => g.id),
        },
      });

      expect(savedActivityReportGoalFieldResponses.length).toBe(1);
      expect(savedActivityReportGoalFieldResponses[0].goalTemplateFieldPromptId).toEqual(prompt.id);
      expect(savedActivityReportGoalFieldResponses[0].response).toEqual(['option 2', 'option 3']);

      // Update the goal with new field responses.
      const updatedGoals = [
        {
          goalIds: [savedGoal.id],
          grantIds: [grant.id],
          goalTemplateId: goalTemplate.id,
          name: goalTemplate.templateName,
          status: GOAL_STATUS.NOT_STARTED,
          timeframe: null,
          source: [],
          prompts: [
            {
              grantId: grant.id,
              promptId: prompt.id,
              response: ['option 1'],
            },
          ],
          objectives: [
            {
              id: null,
              isNew: true,
              ttaProvided: 'tta for a standard goal objective',
              title: 'objective for a standard goal',
              status: OBJECTIVE_STATUS.NOT_STARTED,
              topics: [],
              resources: [],
              files: [],
              courses: [],
              closeSuspendReason: null,
              closeSuspendContext: null,
              ActivityReportObjective: {},
              supportType: 'Maintaining',
              goalId: null,
              createdHere: false,
            },
          ],
        },
      ];

      await saveStandardGoalsForReport(updatedGoals, 1, report);

      // Get the updated goal.
      const updatedGoal = await Goal.findOne({
        where: {
          id: savedGoal.id,
        },
      });

      // Assert the goal field responses were updated.
      const updatedGoalFieldResponses = await GoalFieldResponse.findAll({
        where: {
          goalId: updatedGoal.id,
        },
      });

      expect(updatedGoalFieldResponses.length).toBe(1);
      expect(updatedGoalFieldResponses[0].goalTemplateFieldPromptId).toEqual(prompt.id);
      expect(updatedGoalFieldResponses[0].response).toEqual(['option 1']);

      // Get the updated ActivityReportGoals.
      const updatedActivityReportGoals = await ActivityReportGoal.findAll({
        where: {
          activityReportId: report.id,
        },
      });

      // Assert the ActivityReportGoalFieldResponses was updated.
      const updatedActivityReportGoalFieldResponses = await ActivityReportGoalFieldResponse.findAll({
        where: {
          activityReportGoalId: updatedActivityReportGoals.map((g) => g.id),
        },
      });

      expect(updatedActivityReportGoalFieldResponses.length).toBe(1);
      expect(updatedActivityReportGoalFieldResponses[0].goalTemplateFieldPromptId).toEqual(prompt.id);
      expect(updatedActivityReportGoalFieldResponses[0].response).toEqual(['option 1']);
    });
  });

  describe('monitoring goals', () => {
    let grantWithMonitoringGoal;
    let grantWithoutMonitoringGoal;
    let grantWithClosedMonitoringGoal;
    let monitoringTemplate;
    let regularGoalTemplate;
    let report;
    let monitoringGoal;

    beforeAll(async () => {
      grantWithMonitoringGoal = await createGrant({
        recipientId: recipient1.id,
      });

      grantWithoutMonitoringGoal = await createGrant({
        recipientId: recipient2.id,
      });

      grantWithClosedMonitoringGoal = await createGrant({
        recipientId: recipient3.id,
      });

      monitoringTemplate = await GoalTemplate.findOne({
        where: {
          standard: 'Monitoring',
        },
      });

      // Create a regular goal template.
      regularGoalTemplate = await createGoalTemplate({
        name: 'Regular old standard template',
        creationMethod: CREATION_METHOD.CURATED,
      });

      report = await createReport({
        activityRecipients: [{
          grantId: grantWithMonitoringGoal.id,
        },
        {
          grantId: grantWithoutMonitoringGoal.id,
        },
        {
          grantId: grantWithClosedMonitoringGoal.id,
        }],
        status: REPORT_STATUSES.IN_PROGRESS,
      });

      monitoringGoal = await Goal.create({
        name: monitoringTemplate.templateName,
        goalTemplateId: monitoringTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
        grantId: grantWithMonitoringGoal.id,
        createdVia: 'monitoring',
      });

      await Goal.create({
        name: monitoringTemplate.templateName,
        goalTemplateId: monitoringTemplate.id,
        status: GOAL_STATUS.CLOSED,
        grantId: grantWithClosedMonitoringGoal.id,
      });
    });

    afterAll(async () => {
      await cleanUpGoalAndAllAssociations(
        regularGoalTemplate.id,
        report.id,
        [
          grantWithMonitoringGoal.id,
          grantWithoutMonitoringGoal.id,
          grantWithClosedMonitoringGoal.id,
        ],
      );
    });

    /*
      This tests the correct creation of monitoring goals for a report.
      It ensures we don't create ARG's for grants without monitoring goals.
      It ensures we don't create ARG's for closed monitoring goals.
      It also tests that a normal standard goal is created for all grants.
    */
    it('creates activity report goals for a grant with a monitoring goal and not for ones without', async () => {
      const goals = [
        {
          goalIds: [],
          grantIds: [
            grantWithMonitoringGoal.id,
            grantWithoutMonitoringGoal.id,
            grantWithClosedMonitoringGoal.id,
          ],
          goalTemplateId: monitoringTemplate.id,
          name: monitoringTemplate.templateName,
          status: GOAL_STATUS.NOT_STARTED,
          timeframe: null,
          source: [],
          objectives: [
            {
              id: null,
              isNew: true,
              ttaProvided: 'tta for a monitoring goal objective',
              title: 'objective for a monitoring goal',
              status: OBJECTIVE_STATUS.NOT_STARTED,
              topics: [],
              resources: [],
              files: [],
              courses: [],
              citations: [
                {
                  citation: 'Citation 1',
                  monitoringReferences: [{
                    grantId: grantWithMonitoringGoal.id,
                    findingId: 1,
                    reviewName: 'Review 1',
                  }],
                },
              ],
              closeSuspendReason: null,
              closeSuspendContext: null,
              ActivityReportObjective: {},
              supportType: 'Maintaining',
              goalId: null,
              createdHere: false,
            },
          ],
        },
        {
          goalIds: [],
          grantIds: [
            grantWithMonitoringGoal.id,
            grantWithoutMonitoringGoal.id,
            grantWithClosedMonitoringGoal.id,
          ],
          goalTemplateId: regularGoalTemplate.id,
          name: regularGoalTemplate.templateName,
          status: GOAL_STATUS.NOT_STARTED,
          timeframe: null,
          source: [],
          objectives: [
            {
              id: null,
              isNew: true,
              ttaProvided: 'tta for a regular standard goal objective',
              title: 'title for a regular standard goal objective',
              status: OBJECTIVE_STATUS.NOT_STARTED,
              topics: [],
              resources: [],
              files: [],
              courses: [],
              citations: [],
              closeSuspendReason: null,
              closeSuspendContext: null,
              ActivityReportObjective: {},
              supportType: 'Maintaining',
              goalId: null,
              createdHere: false,
            },
          ],
        },
      ];

      await saveStandardGoalsForReport(goals, 1, report);

      const savedGoals = await Goal.findAll({
        where: {
          name: monitoringTemplate.templateName,
          // status not equal to closed.
          status: {
            [Op.not]: GOAL_STATUS.CLOSED,
          },
          grantId: [
            grantWithMonitoringGoal.id,
            grantWithoutMonitoringGoal.id,
            grantWithClosedMonitoringGoal.id,
          ],
        },
      });

      // Assert the goals were created.
      expect(savedGoals.length).toBe(1);
      const savedGoal = savedGoals[0];
      expect(savedGoal.grantId).toEqual(grantWithMonitoringGoal.id);

      // Assert the ActivityReportGoals were created for the grant with the monitoring goal.
      const savedActivityReportGoals = await ActivityReportGoal.findAll({
        where: {
          activityReportId: report.id,
          goalId: savedGoal.id,
        },
      });

      expect(savedActivityReportGoals.length).toBe(1);
      expect(savedActivityReportGoals[0].goalId).toBe(savedGoal.id);

      // Assert we created the objective, activity report objective, and citations.
      const savedObjectives = await Objective.findAll({
        where: {
          goalId: savedGoal.id,
        },
      });

      expect(savedObjectives.length).toBe(1);
      expect(savedObjectives[0].title).toEqual('objective for a monitoring goal');

      const savedActivityReportObjectives = await ActivityReportObjective.findAll({
        where: {
          activityReportId: report.id,
          objectiveId: savedObjectives[0].id,
        },
      });

      expect(savedActivityReportObjectives.length).toBe(1);

      expect(savedActivityReportObjectives[0].objectiveId).toBe(savedObjectives[0].id);
      expect(savedActivityReportObjectives[0].ttaProvided).toEqual('tta for a monitoring goal objective');

      const savedCitations = await ActivityReportObjectiveCitation.findAll({
        where: {
          activityReportObjectiveId: savedActivityReportObjectives[0].id,
        },
      });

      expect(savedCitations.length).toBe(1);
      expect(savedCitations[0].citation).toEqual('Citation 1');

      // Assert all grants had the regular standard goals created.
      const savedRegularGoals = await Goal.findAll({
        where: {
          name: regularGoalTemplate.templateName,
          grantId: [
            grantWithMonitoringGoal.id,
            grantWithoutMonitoringGoal.id,
            grantWithClosedMonitoringGoal.id,
          ],
        },
      });

      expect(savedRegularGoals.length).toBe(3);

      // Assert the ActivityReportGoals were created for the grant with the regular goal.
      const savedRegularActivityReportGoals = await ActivityReportGoal.findAll({
        where: {
          activityReportId: report.id,
          goalId: savedRegularGoals.map((g) => g.id),
        },
      });

      expect(savedRegularActivityReportGoals.length).toBe(3);

      // Get all the objectives.
      const savedRegularObjectives = await Objective.findAll({
        where: {
          goalId: savedRegularGoals.map((g) => g.id),
        },
      });

      expect(savedRegularObjectives.length).toBe(3);

      // Assert the title on each objective.
      savedRegularObjectives.forEach((o) => {
        expect(o.title).toEqual('title for a regular standard goal objective');
      });

      // Assert the ActivityReportObjective was created for the regular goal.

      const savedRegularActivityReportObjectives = await ActivityReportObjective.findAll({
        where: {
          activityReportId: report.id,
          objectiveId: savedRegularObjectives.map((o) => o.id),
        },
      });

      expect(savedRegularActivityReportObjectives.length).toBe(3);

      // Assert the tta provided on each objective.
      savedRegularActivityReportObjectives.forEach((aro) => {
        expect(aro.ttaProvided).toEqual('tta for a regular standard goal objective');
      });
    });
  });
});
