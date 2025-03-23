import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import crypto from 'crypto';
import moment from 'moment';
import db, {
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveCourse,
  ActivityRecipient,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportGoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalCollaborator,
  GoalFieldResponse,
  Goal,
  GoalStatusChange,
  Objective,
  ObjectiveTemplate,
  Grant,
  Recipient,
  Role,
  UserRole,
  File,
  Topic,
  Course,
  Resource,
} from '../models';
import {
  goalForRtr,
  newStandardGoal,
  standardGoalsForRecipient,
  updateExistingStandardGoal,
  createObjectivesForGoal,
  saveStandardGoalsForReport,
} from './standardGoals';
import {
  createGrant,
  createRecipient,
  createGoalTemplate,
  createReport,
  destroyReport,
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
    grantIdToClean,
    topics = [],
    courses = [],
    files = [],
    resources = [],
  ) => {
    console.log('\n\n\n--- cleanup 1');
    // Get all ARO ids.
    const activityReportObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: reportIdToClean,
      },
    });
    console.log('\n\n\n--- cleanup 2');
    const activityReportObjectiveIds = activityReportObjectives.map(
      (activityReportObjective) => activityReportObjective.id,
    );
    console.log('\n\n\n--- cleanup 3');
    // Clean up the ActivityReportObjectiveTopics.
    await ActivityReportObjectiveTopic.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIds,
      },
    });
    console.log('\n\n\n--- cleanup 4');
    // Clean up ActivityReportObjectiveCourses.
    await ActivityReportObjectiveCourse.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIds,
      },
    });
    console.log('\n\n\n--- cleanup 5');
    // Clean up ActivityReportObjectiveFiles.
    await ActivityReportObjectiveFile.destroy({
      where: {
        activityReportObjectiveId: activityReportObjectiveIds,
      },
    });
    console.log('\n\n\n--- cleanup 6');
    // Destroy the ActivityReportObjectives.
    await ActivityReportObjective.destroy({
      where: {
        id: activityReportObjectiveIds,
      },
    });
    console.log('\n\n\n--- cleanup 7');
    const activityReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: reportIdToClean,
      },
    });
    const goalIds = activityReportGoals.map((g) => g.goalId);

    // Destroy the objectives.
    await Objective.destroy({
      where: {
        goalId: goalIds,
      },
      force: true,
    });

    // Destroy any ActivityReportGoalFieldResponses.
    await ActivityReportGoalFieldResponse.destroy({
      where: {
        activityReportGoalId: activityReportGoals.map((g) => g.id),
      },
    });

    console.log('\n\n\n--- cleanup 8');
    // Destroy the ActivityReportGoals.
    await ActivityReportGoal.destroy({
      where: {
        activityReportId: reportIdToClean,
      },
    });
    console.log('\n\n\n--- cleanup 9');
    // Destroy the goals.
    await Goal.destroy({
      where: {
        id: goalIds,
      },
      force: true,
    });
    console.log('\n\n\n--- cleanup 10');
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
        id: grantIdToClean,
      },
      individualHooks: true,
      force: true,
    });

    console.log('\n\n\n--- cleanup 11');
    // Destroy the topics, courses, files.
    await Topic.destroy({ where: { id: topics.map((topic) => topic.id) } });
    await Promise.all(courses.map((course) => Course.destroy({ where: { id: course.id } })));
    await Promise.all(files.map((file) => File.destroy({ where: { id: file.id } })));
    await Promise.all(resources.map(
      (resource) => Resource.destroy({ where: { url: resource.url } }),
    ));
    console.log('\n\n\n--- cleanup 12');
    // Destroy the goal template.
    await GoalTemplate.destroy({
      where: {
        id: templateIdToClean,
      },
      individualHooks: true,
      force: true,
    });
    console.log('\n\n\n--- cleanup 13');
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
      let goalTemplate;
      let files;
      let courses;
      let topics;
      let resources;
      beforeAll(async () => {
        grant = await createGrant({
          recipientId: recipient1.id,
        });

        goalTemplate = await createGoalTemplate({
          name: 'Simple standard goal template',
          creationMethod: CREATION_METHOD.CURATED,
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
        console.log('\n\n\n--- Topics123', topics);
      });

      afterAll(async () => {
        await cleanUpGoalAndAllAssociations(
          goalTemplate.id,
          report.id,
          grant.id,
          topics,
          courses,
          files,
          resources,
        );
      });

      const assertStandardGoal = async (goalToAssert, objecitveTitle, objectiveTta) => {
        // We need to assert all goal values.
        expect(goalToAssert.name).toEqual(goalTemplate.templateName);
        expect(goalToAssert.goalTemplateId).toEqual(goalTemplate.id);

        // TODO: what happens when this saves on the same report twice?
        // expect(goalToAssert.status).toEqual('Not Started');
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
          expect(savedActivityReportGoal.status).toEqual('Not Started');
        });

        // Assert the objective was created.
        const savedObjectives = await Objective.findAll({
          where: {
            goalId: goalToAssert.id,
          },
        });
        console.log('\n\n\n--- saved objective: ', savedObjectives);
        expect(savedObjectives.length).toBe(1);

        expect(savedObjectives[0].title).toEqual(objecitveTitle);
        expect(savedObjectives[0].status).toEqual(GOAL_STATUS.NOT_STARTED);
        expect(savedObjectives[0].goalId).toEqual(goalToAssert.id);

        const activityReportObjectives = await ActivityReportObjective.findAll({
          where: {
            activityReportId: report.id,
          },
        });

        expect(activityReportObjectives.length).toBe(1);
        expect(savedObjectives[0].title).toEqual(objecitveTitle);
        expect(activityReportObjectives[0].status).toEqual(GOAL_STATUS.NOT_STARTED);
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

        console.log('\n\n\n---- goalTemplate.goalTemplateName1', goalTemplate.templateName);
        // Retrieve the goal we created from the template.
        await saveStandardGoalsForReport(goals, 1, report);

        let savedGoals = await Goal.findAll({
          where: {
            name: goalTemplate.templateName,
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
          },
        });

        // Assert the goals were created.
        expect(savedGoals.length).toBe(1);
        await assertStandardGoal(savedGoals[0], 'objective for a standard goal updated', 'tta for a standard goal objective updated');
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

      console.log('\n\n\n--- prompt', prompt);

      report = await createReport({
        activityRecipients: [{ grantId: grant.id }],
        status: REPORT_STATUSES.IN_PROGRESS,
      });
    });

    afterAll(async () => {
      await cleanUpGoalAndAllAssociations(
        goalTemplate.id,
        report.id,
        grant.id,
      );
    });

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
      try {
        await saveStandardGoalsForReport(goals, 1, report);
      } catch (e) {
        console.log('\n\n\n---- failed to create standard goal: ', e.message, e.stack);
      }
      const savedGoals = await Goal.findAll({
        where: {
          name: goalTemplate.templateName,
        },
      });

      // Assert the goals were created.
      expect(savedGoals.length).toBe(1);
      const savedGoal = savedGoals[0];
      console.log('\n\n\n\---- Goal created: ', savedGoal);
      const savedGoalFieldResponses = await GoalFieldResponse.findAll({
        where: {
          goalId: savedGoal.id,
        },
      });

      // Assert the goal field responses were created.
      expect(savedGoalFieldResponses.length).toBe(1);
      console.log("\n\n\n--- savedGoalFieldResponses[0].goalTemplateFieldPromptId", savedGoalFieldResponses[0]);
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
    });
  });

  /*
    describe('monitoring goals', () => {

    });
    */
});
