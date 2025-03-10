import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import crypto from 'crypto';
import moment from 'moment';
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
} from '../models';
import {
  goalForRtr,
  newStandardGoal,
  standardGoalsForRecipient,
  updateExistingStandardGoal,
} from './standardGoals';
import {
  createGrant,
  createRecipient,
  createGoalTemplate,
  createReport,
  destroyReport,
} from '../testUtils';
import { CREATION_METHOD, GOAL_STATUS } from '../constants';
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
      grant = await createGrant({ recipientId: recipient.id });
      secondGrant = await createGrant({ recipientId: recipient.id });

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
        status: GOAL_STATUS.CLOSED,
        name: secondGoalTemplate.templateName,
      });

      secondGoalForSecondTemplate = await Goal.create({
        grantId: grant.id,
        goalTemplateId: secondGoalTemplate.id,
        status: GOAL_STATUS.NOT_STARTED,
        name: secondGoalTemplate.templateName,
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
        endDate: moment().add(1, 'month').toDate(),
      });

      await ActivityReportGoal.create({
        activityReportId: activityReportThree.id,
        goalId: secondGoalForSecondTemplate.id,
      });

      activityReportFour = await createReport({
        ...reportData,
        endDate: moment().add(3, 'month').toDate(),
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

    it('retrieves standard goals for recipient', async () => {
      const goals = await standardGoalsForRecipient(
        recipient.id,
        grant.regionId,
        {},
      );

      expect(goals).toBeDefined();

      const {
        allGoalIds,
        count,
        goalRows,
        statuses,
      } = goals;

      expect(allGoalIds).toHaveLength(2);
      expect(allGoalIds).toContain(secondGoalForFirstTemplate.id);
      expect(allGoalIds).toContain(secondGoalForSecondTemplate.id);

      expect(count).toBe(2);

      expect(statuses.total).toBe(2);
      expect(statuses['Not started']).toBe(1);
      expect(statuses['In progress']).toBe(1);
      expect(statuses.Suspended).toBe(0);
      expect(statuses.Closed).toBe(0);

      expect(goalRows).toHaveLength(2);

      const [goalOne, goalTwo] = goalRows;

      // ======

      expect(goalOne.id).toBe(secondGoalForSecondTemplate.id);
      expect(goalOne.name).toBe(secondGoalTemplate.templateName);
      expect(goalOne.status).toBe(GOAL_STATUS.IN_PROGRESS);

      const { statusChanges: goalOneStatusChanges } = goalOne;

      expect(goalOneStatusChanges).toHaveLength(1);
      expect(goalOneStatusChanges[0].oldStatus).toBe(GOAL_STATUS.NOT_STARTED);
      expect(goalOneStatusChanges[0].newStatus).toBe(GOAL_STATUS.IN_PROGRESS);

      const { grant: goalOneGrant } = goalOne;
      expect(goalOneGrant.number).toBe(grant.number);

      const { objectives: goalOneObjectives } = goalOne;

      expect(goalOneObjectives).toHaveLength(2);
      const [goalOneObjectiveOne, goalOneObjectiveTwo] = goalOneObjectives;

      expect(goalOneObjectiveOne.title).toBeDefined();
      expect(goalOneObjectiveOne.status).toBeDefined();

      expect(goalOneObjectiveOne.activityReportObjectives).toHaveLength(1);

      const [aroOne] = goalOneObjectiveOne.activityReportObjectives;

      const { topics: aroOneTopics } = aroOne;
      expect(aroOneTopics).toHaveLength(1);
      expect(aroOneTopics[0].name).toBe(topicOne.name);

      const { activityReport: aroOneReport } = aroOne;
      expect(aroOneReport.id).toBe(activityReportFour.id);

      expect(aroOneReport.startDate).toBeDefined();
      expect(aroOneReport.endDate).toBeDefined();
      expect(aroOneReport.displayId).toBeDefined();

      expect(goalOneObjectiveTwo.title).toBeDefined();
      expect(goalOneObjectiveTwo.status).toBeDefined();

      expect(goalOneObjectiveTwo.activityReportObjectives).toHaveLength(1);
      const [aroTwo] = goalOneObjectiveTwo.activityReportObjectives;
      const { topics: aroTwoTopics } = aroTwo;
      expect(aroTwoTopics).toHaveLength(2);
      const aroTwoTopicNames = aroTwoTopics.map((t) => t.name);
      expect(aroTwoTopicNames).toContain(topicOne.name);
      expect(aroTwoTopicNames).toContain(topicTwo.name);
      const { activityReport: aroTwoReport } = aroTwo;
      expect(aroTwoReport.id).toBe(activityReportThree.id);
      expect(aroTwoReport.startDate).toBeDefined();
      expect(aroTwoReport.endDate).toBeDefined();
      expect(aroTwoReport.displayId).toBeDefined();

      // ======

      expect(goalTwo.id).toBe(secondGoalForFirstTemplate.id);
      expect(goalTwo.name).toBe(goalTemplate.templateName);
      expect(goalOne.status).toBe(GOAL_STATUS.IN_PROGRESS);

      const { statusChanges: goalTwoStatusChanges } = goalOne;

      expect(goalTwoStatusChanges).toHaveLength(1);
      const [goalTwoStatusChange] = goalTwoStatusChanges;
      expect(goalTwoStatusChange.oldStatus).toBe(GOAL_STATUS.NOT_STARTED);
      expect(goalTwoStatusChange.newStatus).toBe(GOAL_STATUS.IN_PROGRESS);

      const { grant: goalTwoGrant } = goalOne;
      expect(goalTwoGrant.number).toBe(grant.number);

      const { objectives: goalTwoObjectives } = goalOne;

      expect(goalTwoObjectives).toHaveLength(2);
      const [goalTwoObjectiveOne, goalTwoObjectiveTwo] = goalTwoObjectives;

      expect(goalTwoObjectiveOne.title).toBeDefined();
      expect(goalOneObjectiveOne.status).toBeDefined();

      expect(goalTwoObjectiveOne.activityReportObjectives).toHaveLength(1);

      const [goalTwoAroOne] = goalTwoObjectiveOne.activityReportObjectives;

      const { topics: goalTwoAroOneTopics } = goalTwoAroOne;
      expect(goalTwoAroOneTopics).toHaveLength(1);
      expect(goalTwoAroOneTopics[0].name).toBe(topicOne.name);

      const { activityReport: aroOneGoalTwoReport } = goalTwoAroOne;
      expect(aroOneGoalTwoReport.id).toBe(activityReportFour.id);

      expect(aroOneGoalTwoReport.startDate).toBeDefined();
      expect(aroOneGoalTwoReport.endDate).toBeDefined();
      expect(aroOneGoalTwoReport.displayId).toBeDefined();

      expect(goalTwoObjectiveTwo.title).toBeDefined();
      expect(goalTwoObjectiveTwo.status).toBeDefined();

      expect(goalTwoObjectiveTwo.activityReportObjectives).toHaveLength(1);
      const [goalTwoObjectiveTwoAro] = goalOneObjectiveTwo.activityReportObjectives;
      const { topics: goalTwoObjectiveTwoAroTopics } = goalTwoObjectiveTwoAro;
      expect(goalTwoObjectiveTwoAroTopics).toHaveLength(2);
      const goalTwoObjectiveTwoAroTopicNames = goalTwoObjectiveTwoAroTopics.map((t) => t.name);
      expect(goalTwoObjectiveTwoAroTopicNames).toContain(topicOne.name);
      expect(goalTwoObjectiveTwoAroTopicNames).toContain(topicTwo.name);
      const { activityReport: goalTwoObjectiveTwoAroReport } = aroTwo;
      expect(goalTwoObjectiveTwoAroReport.id).toBe(activityReportThree.id);
      expect(goalTwoObjectiveTwoAroReport.startDate).toBeDefined();
      expect(goalTwoObjectiveTwoAroReport.endDate).toBeDefined();
      expect(goalTwoObjectiveTwoAroReport.displayId).toBeDefined();
    });
  });
});
