import faker from '@faker-js/faker';
import crypto from 'crypto';
import db, {
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  Goal,
  Objective,
  ObjectiveTemplate,
  Grant,
  Recipient,
} from '../models';
import {
  goalForRtr,
  newStandardGoal,
  standardGoalsForRecipient,
  updateExistingStandardGoal,
} from './standardGoals';
import { createGrant, createRecipient, createGoalTemplate } from '../testUtils';
import { CREATION_METHOD, GOAL_STATUS } from '../constants';

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

      it('throws an error if the standard goal is not found', async () => {
        await expect(newStandardGoal(grant.id, 999)).rejects.toThrow();
      });

      it('throws an error if the standard goal is already used', async () => {
        await Goal.create({
          grantId: grant.id,
          goalTemplateId: goalTemplateNoPrompt.id,
        });

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
    });
  });

  describe('standardGoalsForRecipient', () => {
    let grant;
    let secondGrant;

    let goalTemplate;
    let secondGoalTemplate;

    let firstGoalForFirstTemplate;
    let secondGoalForFirstTemplate;

    let firstGoalForSecondTemplate;
    let secondGoalForSecondTemplate;

    beforeAll(async () => {
      grant = await createGrant({ recipientId: recipient.id });
      secondGrant = await createGrant({ recipientId: recipient.id });

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
      });

      secondGoalForFirstTemplate = await Goal.create({
        grantId: grant.id,
        goalTemplateId: goalTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
        name: goalTemplate.templateName,
      });

      firstGoalForSecondTemplate = await Goal.create({
        grantId: grant.id,
        goalTemplateId: secondGoalTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
        name: secondGoalTemplate.templateName,
      });

      secondGoalForSecondTemplate = await Goal.create({
        grantId: grant.id,
        goalTemplateId: secondGoalTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
        name: secondGoalTemplate.templateName,
      });
    });

    afterAll(async () => {
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

      await Grant.destroy({
        where: {
          id: [grant.id, secondGrant.id],
        },
        individualHooks: true,
        force: true,
      });
    });

    it('retrieves standard goals for recipient', async () => {
      const goals = await standardGoalsForRecipient(
        recipient.id,
        grant.regionId,
        {},
      );

      console.log(goals);

      expect(goals).toBeDefined();

      const { allGoalIds } = goals;
      expect(allGoalIds).toContain(secondGoalForFirstTemplate.id);
      expect(allGoalIds).toContain(secondGoalForSecondTemplate.id);

    });
  });
});
