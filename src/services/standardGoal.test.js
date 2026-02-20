import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import crypto from 'crypto';
import { addMonths } from 'date-fns';
import db, {
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Topic,
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
  CollaboratorType,
  User,
} from '../models';
import {
  goalForRtr,
  newStandardGoal,
  standardGoalsForRecipient,
  updateExistingStandardGoal,
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
import changeGoalStatus from '../goalServices/changeGoalStatus';

describe('standardGoal service', () => {
  let recipient;
  afterAll(async () => {
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });
    await db.sequelize.close();
  });
  beforeAll(async () => {
    recipient = await createRecipient({});
  });
  describe('rtr form scenarios', () => {
    describe('goalForRtr', () => {
      let grant;
      let goal;
      let goalTemplate;
      beforeAll(async () => {
        grant = await createGrant({
          recipientId: recipient.id,
        });

        goalTemplate = await createGoalTemplate({
          name: 'Standard Goal #1',
          creationMethod: CREATION_METHOD.CURATED,
        });
        goal = await Goal.create({
          grantId: grant.id,
          goalTemplateId: goalTemplate.id,
          status: GOAL_STATUS.NOT_STARTED,
        });
      });

      afterAll(async () => {
        await Goal.destroy({
          where: {
            id: goal.id,
          },
          individualHooks: true,
          force: true,
        });

        await GoalTemplate.destroy({
          where: {
            id: goalTemplate.id,
          },
          individualHooks: true,
          force: true,
        });

        await Grant.destroy({
          where: {
            id: grant.id,
          },
          individualHooks: true,
          force: true,
        });
      });
      it('fetches open goal for the rtr', async () => {
        const g = await goalForRtr(grant.id, goalTemplate.id);
        expect(g).toBeDefined();
        expect(g.status).toBe(GOAL_STATUS.NOT_STARTED);
        expect(g.id).toBe(goal.id);
      });

      it('fetches closed goal for the rtr', async () => {
        await Goal.update(
          {
            status: GOAL_STATUS.CLOSED,
          },
          {
            where: {
              id: goal.id,
            },
          },
        );

        let g = await goalForRtr(grant.id, goalTemplate.id);
        expect(g).toBeNull();

        g = await goalForRtr(grant.id, goalTemplate.id, [GOAL_STATUS.CLOSED]);
        expect(g).toBeDefined();
        expect(g.status).toBe(GOAL_STATUS.CLOSED);
        expect(g.id).toBe(goal.id);
      });
    });

    describe('newStandardGoal', () => {
      let grant;
      let goalTemplateNoPrompt;
      let goalTemplateWithPrompt;

      beforeAll(async () => {
        grant = await createGrant({
          recipientId: recipient.id,
        });

        goalTemplateNoPrompt = await createGoalTemplate({
          name: 'Standard Goal #2, no prompt',
          creationMethod: CREATION_METHOD.CURATED,
        });

        goalTemplateWithPrompt = await createGoalTemplate({
          name: 'Standard Goal #3, with prompt',
          creationMethod: CREATION_METHOD.CURATED,
        });

        await GoalTemplateFieldPrompt.create({
          goalTemplateId: goalTemplateWithPrompt.id,
          title: 'Prompt 1',
          type: 'multiselect',
          hint: '',
          caution: '',
          options: [],
          validations: {},
          ordinal: 1,
          prompt: 'Select some options',
        });
      });

      afterAll(async () => {
        const goals = await Goal.findAll({
          where: {
            goalTemplateId: [
              goalTemplateNoPrompt.id,
              goalTemplateWithPrompt.id,
            ],
          },
          paranoid: false,
        });

        const goalIds = goals.map((g) => g.id);

        await GoalFieldResponse.destroy({
          where: {
            goalId: goalIds,
          },
          force: true,
        });

        await Objective.destroy({
          where: {
            goalId: goalIds,
          },
          individualHooks: true,
          force: true,
        });

        await Goal.destroy({
          where: {
            id: goalIds,
          },
          individualHooks: true,
          force: true,
        });

        await GoalTemplateFieldPrompt.destroy({
          where: {
            goalTemplateId: goalTemplateWithPrompt.id,
          },
        });

        await GoalTemplate.destroy({
          where: {
            id: [
              goalTemplateNoPrompt.id,
              goalTemplateWithPrompt.id,
            ],
          },
          individualHooks: true,
          force: true,
        });

        await Grant.destroy({
          where: {
            id: grant.id,
          },
          individualHooks: true,
          force: true,
        });
      });

      it('creates a new standard goal', async () => {
        const g = await newStandardGoal(grant.id, goalTemplateNoPrompt.id);
        expect(g).toBeDefined();
        expect(g.goalTemplateId).toBe(goalTemplateNoPrompt.id);
        expect(g.grantId).toBe(grant.id);
      });

      it('opens a new standard goal if the existing is closed', async () => {
        await Goal.destroy({
          where: {
            grantId: grant.id,
            goalTemplateId: goalTemplateNoPrompt.id,
          },
        });

        const g = await newStandardGoal(grant.id, goalTemplateNoPrompt.id);
        expect(g).toBeDefined();

        await Goal.update(
          {
            status: GOAL_STATUS.CLOSED,
          },
          {
            where: {
              id: g.id,
            },
          },
        );

        const g2 = await newStandardGoal(grant.id, goalTemplateNoPrompt.id);
        expect(g2).toBeDefined();
        expect(g2.status).toBe(GOAL_STATUS.NOT_STARTED);
        expect(g2.id).not.toBe(g.id);
      });

      it('sets the goal status to the provided status', async () => {
        await Goal.destroy({
          where: {
            grantId: grant.id,
            goalTemplateId: goalTemplateNoPrompt.id,
          },
        });

        const g = await newStandardGoal(grant.id, goalTemplateNoPrompt.id);
        expect(g).toBeDefined();

        await Goal.update(
          {
            status: GOAL_STATUS.CLOSED,
          },
          {
            where: {
              id: g.id,
            },
          },
        );

        const g2 = await newStandardGoal(
          grant.id,
          goalTemplateNoPrompt.id,
          [],
          [],
          GOAL_STATUS.IN_PROGRESS,
        );
        expect(g2).toBeDefined();
        expect(g2.status).toBe(GOAL_STATUS.IN_PROGRESS);
        expect(g2.id).not.toBe(g.id);
      });

      it('throws an error if the standard goal is not found', async () => {
        await expect(newStandardGoal(grant.id, 999)).rejects.toThrow();
      });

      it('throws an error if the standard goal is already used', async () => {
        // First, make sure we don't have any existing goals for this template/grant
        await Goal.destroy({
          where: {
            grantId: grant.id,
            goalTemplateId: goalTemplateNoPrompt.id,
          },
          force: true,
        });

        // Now create a goal with the specific grant and template
        await Goal.create({
          grantId: grant.id,
          goalTemplateId: goalTemplateNoPrompt.id,
          status: GOAL_STATUS.NOT_STARTED,
          createdVia: 'rtr',
        });

        // Try to create another goal with the same grant and template - should throw
        await expect(newStandardGoal(grant.id, goalTemplateNoPrompt.id)).rejects.toThrow();
      });

      it('creates objectives', async () => {
        await Goal.destroy({
          where: {
            grantId: grant.id,
            goalTemplateId: goalTemplateNoPrompt.id,
          },
        });

        const g = await newStandardGoal(
          grant.id,
          goalTemplateNoPrompt.id,
          [
            {
              title: 'Objective 1',
            },
            {
              title: 'Objective 2',
            },
          ],
        );

        expect(g).toBeDefined();
        expect(g.objectives).toBeDefined();
        expect(g.objectives.length).toBe(2);
        const objectiveTitles = g.objectives.map((o) => o.title);
        expect(objectiveTitles).toContain('Objective 1');
        expect(objectiveTitles).toContain('Objective 2');
      });

      it('throws an error if prompts are required', async () => {
        await expect(newStandardGoal(grant.id, goalTemplateWithPrompt.id)).rejects.toThrow();
      });

      it('adds prompts if prompts are required', async () => {
        const g = await newStandardGoal(
          grant.id,
          goalTemplateWithPrompt.id,
          [],
          ['Option 1'],
        );

        expect(g).toBeDefined();
        expect(g.responses).toBeDefined();
        expect(g.responses.length).toBe(1);
        expect(g.responses[0].response).toEqual(['Option 1']);
      });
    });

    describe('updateExistingStandardGoal', () => {
      let grant;
      let goal;
      let goalTemplate;
      let goalTemplateNoUtilization;
      let objectiveTemplate;
      let objectiveWithId;
      let objectiveWithoutId;
      const titleForLookup = 'Find this objective by goal id and title';

      const objectiveTitle = faker.lorem.sentence(5);

      beforeAll(async () => {
        grant = await createGrant({
          recipientId: recipient.id,
        });

        goalTemplate = await createGoalTemplate({
          name: 'Standard Goal #3, with prompt',
          creationMethod: CREATION_METHOD.CURATED,
        });

        goalTemplateNoUtilization = await createGoalTemplate({
          name: 'Standard Goal #4, no utilization',
          creationMethod: CREATION_METHOD.CURATED,
        });

        await GoalTemplateFieldPrompt.create({
          goalTemplateId: goalTemplate.id,
          title: 'Prompt 1',
          type: 'multiselect',
          hint: '',
          caution: '',
          options: [],
          validations: {},
          ordinal: 1,
          prompt: 'Select some options',
        });

        goal = await Goal.create({
          grantId: grant.id,
          goalTemplateId: goalTemplate.id,
          status: GOAL_STATUS.NOT_STARTED,
        });

        const secret = 'secret';
        const hash = crypto
          .createHmac('md5', secret)
          .update(objectiveTitle)
          .digest('hex');

        objectiveTemplate = await ObjectiveTemplate.create({
          templateTitle: objectiveTitle,
          hash,
          creationMethod: CREATION_METHOD.AUTOMATIC,
        });

        await Objective.create({
          title: objectiveTitle,
          objectiveTemplateId: objectiveTemplate.id,
          goalId: goal.id,
          status: GOAL_STATUS.NOT_STARTED,
        });
      });

      afterAll(async () => {
        const goals = await Goal.findAll({
          where: {
            goalTemplateId: [
              goalTemplate.id,
              goalTemplateNoUtilization.id,
            ],
          },
          paranoid: false,
        });

        const goalIds = goals.map((g) => g.id);

        await GoalFieldResponse.destroy({
          where: {
            goalId: goalIds,
          },
          force: true,
        });

        await Objective.destroy({
          where: {
            goalId: goalIds,
          },
          individualHooks: true,
          force: true,
        });

        await Goal.destroy({
          where: {
            id: goalIds,
          },
          individualHooks: true,
          force: true,
        });

        await GoalTemplateFieldPrompt.destroy({
          where: {
            goalTemplateId: [
              goalTemplate.id,
              goalTemplateNoUtilization.id,
            ],
          },
        });

        await ObjectiveTemplate.destroy({
          where: {
            id: objectiveTemplate.id,
          },
          individualHooks: true,
          force: true,
        });

        await GoalTemplate.destroy({
          where: {
            id: [
              goalTemplate.id,
              goalTemplateNoUtilization.id,
            ],
          },
          individualHooks: true,
          force: true,
        });

        await Grant.destroy({
          where: {
            id: grant.id,
          },
          individualHooks: true,
          force: true,
        });
      });
      it('updates an existing standard goal', async () => {
        const g = await updateExistingStandardGoal(
          grant.id,
          goalTemplate.id,
          [],
          ['Option 1'],
        );
        expect(g).toBeDefined();
        expect(g.id).toBe(goal.id);
        expect(g.status).toBe(GOAL_STATUS.NOT_STARTED);
      });
      it('throws an error if the standard goal has not been utilized', async () => {
        // eslint-disable-next-line max-len
        await expect(updateExistingStandardGoal(grant.id, goalTemplateNoUtilization.id)).rejects.toThrow();
      });

      it('updates existing and saves new objectives', async () => {
        const g = await updateExistingStandardGoal(
          grant.id,
          goalTemplate.id,
          [
            {
              title: objectiveTitle,
              objectiveTemplateId: objectiveTemplate.id,
            },
            {
              title: 'Objective 2',
            },
          ],
          ['Option 1'],
        );

        expect(g).toBeDefined();
        expect(g.objectives).toBeDefined();
        expect(g.objectives.length).toBe(2);
        const objectiveTitles = g.objectives.map((o) => o.title);
        expect(objectiveTitles).toContain(objectiveTitle);
        expect(objectiveTitles).toContain('Objective 2');
      });

      it('updates existing root causes', async () => {
        const g = await updateExistingStandardGoal(
          grant.id,
          goalTemplate.id,
          [],
          [
            'Option 1', 'Option 2',
          ],
        );

        expect(g).toBeDefined();
        expect(g.responses).toBeDefined();
        expect(g.responses[0].response).toEqual(['Option 1', 'Option 2']);
      });

      it('updates existing and reuses existing objective by id', async () => {
        // Create the test objective here so its not deleted by other tests in this block.
        objectiveWithId = await Objective.create({
          title: 'This is an existing suspended objective with the a matching ID',
          objectiveTemplateId: null,
          goalId: goal.id,
          status: OBJECTIVE_STATUS.COMPLETE,
          createdVia: 'rtr',
        });

        const g = await updateExistingStandardGoal(
          grant.id,
          goalTemplate.id,
          [
            {
              id: objectiveWithId.id,
              title: 'This is an existing suspended objective with the a matching ID Updated',
              objectiveTemplateId: null,
            },
          ],
          [],
        );

        expect(g).toBeDefined();
        expect(g.objectives).toBeDefined();
        expect(g.objectives.length).toBe(1);
        expect(g.objectives[0].id).toBe(objectiveWithId.id);
        expect(g.objectives[0].title).toBe('This is an existing suspended objective with the a matching ID Updated');
        expect(g.objectives[0].status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
      });

      it('updates existing and reuses existing objective by title and goal id', async () => {
        objectiveWithoutId = await Objective.create({
          title: titleForLookup,
          objectiveTemplateId: null,
          goalId: goal.id,
          status: GOAL_STATUS.SUSPENDED,
          onApprovedAR: true,
        });
        const g = await updateExistingStandardGoal(
          grant.id,
          goalTemplate.id,
          [
            {
              id: null, // For whatever reason there is no id.
              title: titleForLookup,
              objectiveTemplateId: null,
            },
          ],
          [],
        );

        expect(g).toBeDefined();
        expect(g.objectives).toBeDefined();
        expect(g.objectives.length).toBe(1);
        expect(g.objectives[0].id).toBe(objectiveWithoutId.id);
        expect(g.objectives[0].title).toBe(titleForLookup);
        expect(g.objectives[0].status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);
      });

      it('creates a new objective if its not found by id or title and goal id', async () => {
        // Create the test objecitve here so its not dlelete by other tests in this block.
        const g = await updateExistingStandardGoal(
          grant.id,
          goalTemplate.id,
          [
            {
              id: null, // For whatever reason there is no id.
              title: 'This does not exist',
              objectiveTemplateId: null,
            },
          ],
          [],
        );

        expect(g).toBeDefined();
        expect(g.objectives).toBeDefined();
        expect(g.objectives.length).toBe(1);
        expect(g.objectives[0].id).toBeDefined();
        expect(g.objectives[0].title).toBe('This does not exist');
        expect(g.objectives[0].status).toBe(OBJECTIVE_STATUS.NOT_STARTED);
      });
    });
  });

  describe('standardGoalsForRecipient', () => {
    let grant;
    let secondGrant;
    let topicOne;
    let topicTwo;

    let goalTemplate;
    let secondGoalTemplate;

    let firstGoalForFirstTemplate;
    let secondGoalForFirstTemplate;

    let firstGoalForSecondTemplate;
    let secondGoalForSecondTemplate;

    let activityReportOne; // associated with goalTemplate, first goalForfirstTemplate
    let activityReportTwo; // associated with goalTemplate, second goalForFirstTemplate
    let activityReportThree; // associated with secondGoalTemplate, secondGoalForSecondTemplate
    let activityReportFour; // associated with secondGoalTemplate, secondGoalForSecondTemplate

    beforeAll(async () => {
      grant = await createGrant({ recipientId: recipient.id, regionId: 1 });
      secondGrant = await createGrant({ recipientId: recipient.id, regionId: 1 });

      // Create collaborator type for 'Creator'
      const creatorType = await CollaboratorType.findOrCreate({
        where: { name: 'Creator' },
        defaults: { name: 'Creator' },
      });

      topicOne = await Topic.create({
        name: faker.finance.accountName(),
      });

      topicTwo = await Topic.create({
        name: faker.finance.accountName(),
      });

      goalTemplate = await createGoalTemplate({
        name: 'Standard Goal #5',
        creationMethod: CREATION_METHOD.CURATED,
      });

      secondGoalTemplate = await createGoalTemplate({
        name: 'Standard Goal #6',
        creationMethod: CREATION_METHOD.CURATED,
      });

      firstGoalForFirstTemplate = await Goal.create({
        grantId: grant.id,
        goalTemplateId: goalTemplate.id,
        status: GOAL_STATUS.CLOSED,
        name: goalTemplate.templateName,
        createdVia: 'rtr',
      });

      secondGoalForFirstTemplate = await Goal.create({
        grantId: grant.id,
        goalTemplateId: goalTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
        name: goalTemplate.templateName,
        createdVia: 'rtr',
      });

      firstGoalForSecondTemplate = await Goal.create({
        grantId: grant.id,
        goalTemplateId: secondGoalTemplate.id,
        status: GOAL_STATUS.CLOSED,
        name: secondGoalTemplate.templateName,
        createdVia: 'rtr',
      });

      secondGoalForSecondTemplate = await Goal.create({
        grantId: grant.id,
        goalTemplateId: secondGoalTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
        name: secondGoalTemplate.templateName,
        createdVia: 'rtr',
      });

      const reportData = {
        calculatedStatus: REPORT_STATUSES.APPROVED,
        activityRecipients: [
          {
            grantId: grant.id,
          },
        ],
      };

      activityReportOne = await createReport(reportData);

      await ActivityReportGoal.create({
        activityReportId: activityReportOne.id,
        goalId: firstGoalForFirstTemplate.id,
      });

      reportData.userId = activityReportOne.userId;

      activityReportTwo = await createReport(reportData);

      await ActivityReportGoal.create({
        activityReportId: activityReportTwo.id,
        goalId: secondGoalForFirstTemplate.id,
      });

      activityReportThree = await createReport({
        ...reportData,
        endDate: addMonths(new Date(), 1),
      });

      await ActivityReportGoal.create({
        activityReportId: activityReportThree.id,
        goalId: secondGoalForSecondTemplate.id,
      });

      activityReportFour = await createReport({
        ...reportData,
        endDate: addMonths(new Date(), 3),
      });
      await ActivityReportGoal.create({
        activityReportId: activityReportFour.id,
        goalId: secondGoalForSecondTemplate.id,
      });

      const role = await Role.findOne({
        where: {
          isSpecialist: false,
        },
      });

      await UserRole.create({
        userId: reportData.userId,
        roleId: role.id,
      });

      // Add collaborators to the goals
      await GoalCollaborator.create({
        goalId: firstGoalForFirstTemplate.id,
        userId: reportData.userId,
        collaboratorTypeId: creatorType[0].id,
      });

      await GoalCollaborator.create({
        goalId: secondGoalForFirstTemplate.id,
        userId: reportData.userId,
        collaboratorTypeId: creatorType[0].id,
      });

      await GoalCollaborator.create({
        goalId: firstGoalForSecondTemplate.id,
        userId: reportData.userId,
        collaboratorTypeId: creatorType[0].id,
      });

      await GoalCollaborator.create({
        goalId: secondGoalForSecondTemplate.id,
        userId: reportData.userId,
        collaboratorTypeId: creatorType[0].id,
      });

      await changeGoalStatus({
        goalId: secondGoalForSecondTemplate.id,
        userId: reportData.userId,
        newStatus: GOAL_STATUS.IN_PROGRESS,
        reason: '',
        context: '',
      });

      //   activityReportOne = associated with goalTemplate, first goalForfirstTemplate
      const objectiveOneFirstGoalForFirstTemplate = await Objective.create({
        title: faker.lorem.sentence(5),
        goalId: firstGoalForFirstTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
      });

      const aro1 = await ActivityReportObjective.create({
        activityReportId: activityReportOne.id,
        objectiveId: objectiveOneFirstGoalForFirstTemplate.id,
      });

      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro1.id,
        topicId: topicOne.id,
      });

      // activityReportTwo = associated with goalTemplate, second goalForFirstTemplate

      const objectiveOneSecondGoalForFirstTemplate = await Objective.create({
        title: faker.lorem.sentence(5),
        goalId: secondGoalForFirstTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
      });

      const aro2 = await ActivityReportObjective.create({
        activityReportId: activityReportTwo.id,
        objectiveId: objectiveOneSecondGoalForFirstTemplate.id,
      });

      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro2.id,
        topicId: topicTwo.id,
      });

      //   activityReportThree = associated with secondGoalTemplate, secondGoalForSecondTemplate
      const objectiveOneSecondGoalForSecondTemplate = await Objective.create({
        title: faker.lorem.sentence(5),
        goalId: secondGoalForSecondTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
      });

      const aro3 = await ActivityReportObjective.create({
        activityReportId: activityReportThree.id,
        objectiveId: objectiveOneSecondGoalForSecondTemplate.id,
      });

      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro3.id,
        topicId: topicOne.id,
      });

      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro3.id,
        topicId: topicTwo.id,
      });

      //    activityReportFour = associated with secondGoalTemplate, secondGoalForSecondTemplate
      const objectiveTwoSecondGoalForSecondTemplate = await Objective.create({
        title: faker.lorem.sentence(5),
        goalId: secondGoalForSecondTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
      });

      const aro4 = await ActivityReportObjective.create({
        activityReportId: activityReportFour.id,
        objectiveId: objectiveTwoSecondGoalForSecondTemplate.id,
      });

      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro4.id,
        topicId: topicOne.id,
      });
    });

    afterAll(async () => {
      // Clean up collaborators
      await GoalCollaborator.destroy({
        where: {
          goalId: [
            firstGoalForFirstTemplate.id,
            secondGoalForFirstTemplate.id,
            firstGoalForSecondTemplate.id,
            secondGoalForSecondTemplate.id,
          ],
        },
        force: true,
      });

      await ActivityReportGoal.destroy({
        where: {
          goalId: [
            firstGoalForFirstTemplate.id,
            secondGoalForFirstTemplate.id,
            firstGoalForSecondTemplate.id,
            secondGoalForSecondTemplate.id,
          ],
        },
      });

      await GoalStatusChange.destroy({
        where: {
          goalId: [
            firstGoalForFirstTemplate.id,
            secondGoalForFirstTemplate.id,
            firstGoalForSecondTemplate.id,
            secondGoalForSecondTemplate.id,
          ],
        },
      });

      await ActivityReportObjectiveTopic.destroy({
        where: {
          topicId: [
            topicOne.id,
            topicTwo.id,
          ],
        },
      });

      await ActivityReportObjective.destroy({
        where: {
          activityReportId: [
            activityReportOne.id,
            activityReportTwo.id,
            activityReportThree.id,
            activityReportFour.id,
          ],
        },
        individualHooks: true,
        force: true,
      });

      await Objective.destroy({
        where: {
          goalId: [
            firstGoalForFirstTemplate.id,
            secondGoalForFirstTemplate.id,
            firstGoalForSecondTemplate.id,
            secondGoalForSecondTemplate.id,
          ],
        },
        individualHooks: true,
        force: true,
      });

      await Goal.destroy({
        where: {
          id: [
            firstGoalForFirstTemplate.id,
            secondGoalForFirstTemplate.id,
            firstGoalForSecondTemplate.id,
            secondGoalForSecondTemplate.id,
          ],
        },
        individualHooks: true,
        force: true,
      });

      await GoalTemplate.destroy({
        where: {
          id: [goalTemplate.id, secondGoalTemplate.id],
        },
        individualHooks: true,
        force: true,
      });

      await UserRole.destroy({
        where: {
          userId: activityReportOne.userId,
        },
      });

      await destroyReport(activityReportOne);
      await destroyReport(activityReportTwo);
      await destroyReport(activityReportThree);
      await destroyReport(activityReportFour);

      await Grant.destroy({
        where: {
          id: [grant.id, secondGrant.id],
        },
        individualHooks: true,
        force: true,
      });

      await Topic.destroy({
        where: {
          id: [topicOne.id, topicTwo.id],
        },
        force: true,
      });
    });

    it('retrieves standard goals for a recipient with correct structure and data', async () => {
      // Call the function with the recipient and region from the grant
      const result = await standardGoalsForRecipient(
        recipient.id,
        grant.regionId,
        { sortBy: 'goalStatus', sortDir: 'desc' },
      );

      // Verify the structure of the response
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('goalRows');
      expect(result).toHaveProperty('statuses');
      expect(result).toHaveProperty('allGoalIds');

      // Verify the count matches the number of unique goal template/grant combinations
      // We expect 2 goals (the latest for each template)
      expect(result.count).toBe(2);

      // Verify the goals are correctly processed
      expect(result.goalRows.length).toBe(2);

      // Find the goal for the second template (should be IN_PROGRESS)
      const secondTemplateGoal = result.goalRows.find(
        (g) => g.goalTemplateId === secondGoalTemplate.id,
      );
      expect(secondTemplateGoal).toBeDefined();
      expect(secondTemplateGoal.status).toBe(GOAL_STATUS.IN_PROGRESS);

      // Find the goal for the first template (should be NOT_STARTED)
      const firstTemplateGoal = result.goalRows.find(
        (g) => g.goalTemplateId === goalTemplate.id,
      );
      expect(firstTemplateGoal).toBeDefined();
      expect(firstTemplateGoal.status).toBe(GOAL_STATUS.NOT_STARTED);

      // Verify objectives are processed correctly
      expect(secondTemplateGoal.objectives.length).toBe(2);

      // Verify the allGoalIds contains the IDs of the two goals
      expect(result.allGoalIds).toContain(secondGoalForFirstTemplate.id);
      expect(result.allGoalIds).toContain(secondGoalForSecondTemplate.id);

      // Verify the statuses object is returned
      expect(result.statuses).toBeDefined();
    });

    it('paginates standard goals correctly using limit and offset', async () => {
      // Get all goals for reference
      const allGoals = await standardGoalsForRecipient(
        recipient.id,
        grant.regionId,
        {
          sortBy: 'goalStatus',
          sortDir: 'desc',
        },
      );

      // There should be 2 goals total
      expect(allGoals.count).toBe(2);
      expect(allGoals.goalRows.length).toBe(2);

      // Test with limit of 1 and offset of 0 (first page)
      const firstPage = await standardGoalsForRecipient(
        recipient.id,
        grant.regionId,
        {
          sortBy: 'goalStatus',
          sortDir: 'desc',
          limit: 1,
          offset: 0,
        },
      );

      // Should return the count of all goals, but only include 1 goal in goalRows
      expect(firstPage.count).toBe(2); // Total count remains the same
      expect(firstPage.goalRows.length).toBe(1); // But only 1 goal returned
      expect(firstPage.goalRows[0].id).toBe(allGoals.goalRows[0].id); // First goal should match

      // Test with limit of 1 and offset of 1 (second page)
      const secondPage = await standardGoalsForRecipient(
        recipient.id,
        grant.regionId,
        {
          sortBy: 'goalStatus',
          sortDir: 'desc',
          limit: 1,
          offset: 1,
        },
      );

      // Should return the count of all goals, but only include 1 goal in goalRows
      expect(secondPage.count).toBe(2); // Total count remains the same
      expect(secondPage.goalRows.length).toBe(1); // But only 1 goal returned
      expect(secondPage.goalRows[0].id).toBe(allGoals.goalRows[1].id); // Second goal should match

      // Test with limit larger than available goals
      const largeLimit = await standardGoalsForRecipient(
        recipient.id,
        grant.regionId,
        {
          sortBy: 'goalStatus',
          sortDir: 'desc',
          limit: 10,
          offset: 0,
        },
      );

      // Should return all goals
      expect(largeLimit.count).toBe(2);
      expect(largeLimit.goalRows.length).toBe(2);

      // Test with offset beyond available goals
      const largeOffset = await standardGoalsForRecipient(
        recipient.id,
        grant.regionId,
        {
          sortBy: 'goalStatus',
          sortDir: 'desc',
          limit: 10,
          offset: 10,
        },
      );

      // Should return empty result set but correct count
      expect(largeOffset.count).toBe(2);
      expect(largeOffset.goalRows.length).toBe(0);
    });
  });

  describe('standardGoalsForRecipient Only Approved Objectives Param', () => {
    let user;
    let recipientForParam;
    let grant;
    let goalTemplate;
    let goalTemplateNotOnApprovedAR;
    let goal;
    let goalNotOnApprovedAR;

    let createdViaRtrObjective;
    let createdViaArButNotApprovedObjective;
    let createdViaArAndApprovedObjective;

    let creatorCollabType;

    beforeAll(async () => {
      user = await User.create({
        id: faker.datatype.number({ min: 1000 }),
        homeRegionId: 1,
        name: 'Test Param User',
        hsesUsername: 'Test Param User',
        hsesUserId: 'Test Param User',
        lastLogin: new Date(),
      });

      creatorCollabType = await CollaboratorType.findOrCreate({
        where: { name: 'Creator' },
        defaults: { name: 'Creator', validForId: 1 },
        validForId: 1,
      });

      recipientForParam = await createRecipient({});

      grant = await createGrant({
        recipientId: recipientForParam.id,
        regionId: 1,
      });

      goalTemplate = await createGoalTemplate({
        name: 'Test Param Template',
        creationMethod: CREATION_METHOD.CURATED,
      });

      goalTemplateNotOnApprovedAR = await createGoalTemplate({
        name: 'Test Param Template Not on Approved AR',
        creationMethod: CREATION_METHOD.CURATED,
      });

      goal = await Goal.create({
        name: 'Goal 1',
        status: GOAL_STATUS.NOT_STARTED,
        createdAt: new Date(),
        goalTemplateId: goalTemplate.id,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      goalNotOnApprovedAR = await Goal.create({
        name: 'Goal 2 - Not on Approved AR',
        status: GOAL_STATUS.NOT_STARTED,
        createdAt: new Date(),
        goalTemplateId: goalTemplateNotOnApprovedAR.id, // Using different template
        grantId: grant.id,
        createdVia: 'activityReport',
        onApprovedAR: false, // Should not be included in the results.
      });

      await GoalCollaborator.create({
        goalId: goal.id,
        userId: user.id,
        collaboratorTypeId: creatorCollabType[0].id,
      });

      createdViaRtrObjective = await Objective.create({
        title: 'Created via RTR Objective',
        status: OBJECTIVE_STATUS.NOT_STARTED,
        goalId: goal.id,
        createdVia: 'rtr',
        onApprovedAR: true,
      });

      createdViaArButNotApprovedObjective = await Objective.create({
        title: 'Created via AR but not approved Objective',
        status: OBJECTIVE_STATUS.NOT_STARTED,
        goalId: goal.id,
        createdVia: 'activityReport',
        onApprovedAR: false,
      });

      createdViaArAndApprovedObjective = await Objective.create({
        title: 'Created via AR and approved Objective',
        status: OBJECTIVE_STATUS.NOT_STARTED,
        goalId: goal.id,
        createdVia: 'activityReport',
        onApprovedAR: true,
      });
    });

    afterAll(async () => {
      // cleanup all the crap you created for this test.
      await GoalCollaborator.destroy({
        where: {
          goalId: goal.id,
        },
        force: true,
      });
      await Objective.destroy({
        where: {
          id: [
            createdViaRtrObjective.id,
            createdViaArButNotApprovedObjective.id,
            createdViaArAndApprovedObjective.id,
          ],
        },
        force: true,
      });
      await Goal.destroy({ where: { id: [goal.id, goalNotOnApprovedAR.id] }, force: true });
      await GoalTemplate.destroy({
        where: { id: [goalTemplate.id, goalTemplateNotOnApprovedAR.id] },
        force: true,
      });
      await Grant.destroy({ where: { id: grant.id }, individualHooks: true, force: true });
      await Recipient.destroy({ where: { id: recipientForParam.id }, force: true });
      await CollaboratorType.destroy({
        where: { id: creatorCollabType[0].id },
        force: true,
      });
      await User.destroy({ where: { id: user.id }, force: true });
    });

    it('returns goals for recipient with default params', async () => {
      const result = await standardGoalsForRecipient(
        recipientForParam.id,
        grant.regionId,
        {},
      );
      expect(result.count).toBe(1);
      expect(result.goalRows[0].objectives.length).toBe(3);

      // we expect two objectives find them by title.
      const createdViaRtrObjectiveToAssert = result.goalRows[0].objectives.find(
        (o) => o.title === 'Created via RTR Objective',
      );
      expect(createdViaRtrObjectiveToAssert).toBeDefined();

      const createdViaArButNotApprovedObjectiveToAssert = result.goalRows[0].objectives.find(
        (o) => o.title === 'Created via AR and approved Objective',
      );
      expect(createdViaArButNotApprovedObjectiveToAssert).toBeDefined();

      const createdViaArAndApprovedObjectiveToAssert = result.goalRows[0].objectives.find(
        (o) => o.title === 'Created via AR and approved Objective',
      );
      expect(createdViaArAndApprovedObjectiveToAssert).toBeDefined();
    });

    it('returns only approved objectives and rtr', async () => {
      const result = await standardGoalsForRecipient(
        recipientForParam.id,
        grant.regionId,
        {},
        true,
      );
      expect(result.count).toBe(1);
      expect(result.goalRows[0].objectives.length).toBe(2);

      const createdViaRtrObjectiveToAssert = result.goalRows[0].objectives.find(
        (o) => o.title === 'Created via RTR Objective',
      );
      expect(createdViaRtrObjectiveToAssert).toBeDefined();
      const createdViaArAndApprovedObjectiveToAssert = result.goalRows[0].objectives.find(
        (o) => o.title === 'Created via AR and approved Objective',
      );
      expect(createdViaArAndApprovedObjectiveToAssert).toBeDefined();
    });
  });

  describe('standardGoalsForRecipient includes Curated and Automatic templates', () => {
    let localRecipient;
    let localGrant;
    let curatedTemplate;
    let automaticTemplate;
    let curatedGoal;
    let automaticGoal;

    beforeAll(async () => {
      localRecipient = await createRecipient({});
      localGrant = await createGrant({ recipientId: localRecipient.id, regionId: 1 });

      curatedTemplate = await createGoalTemplate({
        name: 'CM Curated Template',
        creationMethod: CREATION_METHOD.CURATED,
      });

      automaticTemplate = await createGoalTemplate({
        name: 'CM Automatic Template',
        creationMethod: CREATION_METHOD.AUTOMATIC,
      });

      curatedGoal = await Goal.create({
        name: 'Curated Goal',
        status: GOAL_STATUS.NOT_STARTED,
        grantId: localGrant.id,
        goalTemplateId: curatedTemplate.id,
        createdVia: 'rtr',
      });

      automaticGoal = await Goal.create({
        name: 'Automatic Goal',
        status: GOAL_STATUS.NOT_STARTED,
        grantId: localGrant.id,
        goalTemplateId: automaticTemplate.id,
        createdVia: 'rtr',
      });
    });

    afterAll(async () => {
      await Goal.destroy({
        where: { id: [curatedGoal.id, automaticGoal.id] },
        individualHooks: true,
        force: true,
      });
      await GoalTemplate.destroy({
        where: { id: [curatedTemplate.id, automaticTemplate.id] },
        individualHooks: true,
        force: true,
      });
      await Grant.destroy({ where: { id: localGrant.id }, individualHooks: true, force: true });
      await Recipient.destroy({ where: { id: localRecipient.id }, force: true });
    });

    it('returns goals for both Curated and Automatic creation methods', async () => {
      const result = await standardGoalsForRecipient(
        localRecipient.id,
        localGrant.regionId,
        {},
      );
      expect(result.count).toBe(2);
      const templateIds = result.goalRows.map((g) => g.goalTemplateId);
      expect(templateIds).toEqual(expect.arrayContaining([
        curatedTemplate.id,
        automaticTemplate.id,
      ]));
    });
  });

  describe('createObjectivesForGoal', () => {
    const goal = { id: 1 };
    const objectives = [
      {
        id: 1,
        isNew: false,
        ttaProvided: 'TTA provided details',
        title: 'Objective title 1',
        status: GOAL_STATUS.IN_PROGRESS,
        topics: ['topic1'],
        resources: ['resource1'],
        files: ['file1'],
        courses: ['course1'],
        closeSuspendReason: null,
        closeSuspendContext: null,
        ActivityReportObjective: {},
        supportType: 'supportType1',
        goalId: 1,
        createdHere: false,
      },
      {
        id: 2,
        isNew: true,
        ttaProvided: 'TTA provided details',
        title: 'Objective title 2',
        status: 'NOT_STARTED',
        topics: ['topic2'],
        resources: ['resource2'],
        files: ['file2'],
        courses: ['course2'],
        closeSuspendReason: null,
        closeSuspendContext: null,
        ActivityReportObjective: {},
        supportType: 'supportType2',
        goalId: 2,
        createdHere: true,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return an empty array if no objectives are provided', async () => {
      const result = await createObjectivesForGoal(goal, null);
      expect(result).toEqual([]);
    });

    it('should create new objectives for new items', async () => {
      Objective.findByPk = jest.fn().mockResolvedValue(null);
      Objective.findOne = jest.fn().mockResolvedValue(null);
      Objective.create = jest.fn().mockResolvedValue({
        toJSON: () => ({
          id: 2,
          title: 'Objective title 2',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          goalId: goal.id,
        }),
      });

      const result = await createObjectivesForGoal(goal, objectives);

      expect(Objective.findByPk).toHaveBeenCalledTimes(1);
      expect(Objective.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Objective title 2',
        goalId: goal.id,
        status: OBJECTIVE_STATUS.NOT_STARTED,
        createdVia: 'activityReport',
      }));

      expect(result).toHaveLength(2);
      expect(result[1].title).toBe('Objective title 2');
    });

    it('should update existing objectives', async () => {
      Objective.findByPk = jest.fn().mockResolvedValue({
        id: 1,
        title: 'Objective title 1',
        onApprovedAR: false,
        update: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        toJSON: () => ({
          id: 1,
          title: 'Objective title 1',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          goalId: goal.id,
        }),
      });

      Objective.findOne = jest.fn().mockResolvedValue(null);
      Objective.create = jest.fn().mockResolvedValue({
        toJSON: () => ({
          id: 2,
          title: 'Objective title 2',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          goalId: goal.id,
        }),
      });

      const result = await createObjectivesForGoal(goal, objectives);

      expect(Objective.findByPk).toHaveBeenCalledTimes(1);
      expect(Objective.findByPk).toHaveBeenCalledWith(1);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Objective title 1');
      expect(result[1].title).toBe('Objective title 2');
    });

    it('should reuse an existing objective if conditions match', async () => {
      Objective.findByPk = jest.fn().mockResolvedValue(null);

      // Mock finding the objective by title and goal ID
      Objective.findOne = jest.fn()
        .mockImplementation(({ where }) => {
          if (where.title === 'Objective title 2') {
            return Promise.resolve({
              id: 2,
              title: 'Objective title 2',
              status: OBJECTIVE_STATUS.NOT_STARTED,
              update: jest.fn().mockResolvedValue(true),
              save: jest.fn().mockResolvedValue(true),
              toJSON: () => ({
                id: 2,
                title: 'Objective title 2',
                status: OBJECTIVE_STATUS.NOT_STARTED,
                goalId: goal.id,
              }),
            });
          }
          return Promise.resolve(null);
        });

      Objective.create = jest.fn().mockResolvedValue({
        toJSON: () => ({
          id: 1,
          title: 'Objective title 1',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          goalId: goal.id,
        }),
      });

      const result = await createObjectivesForGoal(goal, objectives);

      expect(Objective.findOne).toHaveBeenCalledWith({
        where: {
          goalId: goal.id,
          title: 'Objective title 2',
        },
      });

      expect(result).toHaveLength(2);
      expect(result[1].id).toBe(2);
      expect(result[1].title).toBe('Objective title 2');
    });

    it('should handle undefined fields without throwing an error', async () => {
      const incompleteObjectives = [
        {
          id: 1,
          isNew: false,
          supportType: 'supportType1',
          goalId: 1,
          createdHere: false,
        },
      ];

      Objective.findByPk = jest.fn().mockResolvedValue(null);
      Objective.findOne = jest.fn().mockResolvedValue(null);
      Objective.create = jest.fn().mockResolvedValue({
        toJSON: () => ({
          id: 1,
          title: 'Objective with missing fields',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          goalId: goal.id,
        }),
      });

      const result = await createObjectivesForGoal(goal, incompleteObjectives);

      expect(result).toHaveLength(0);
      expect(Objective.create).not.toHaveBeenCalled();
    });
  });
});
