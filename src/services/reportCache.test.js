import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import { REPORT_STATUSES, GOAL_SOURCES } from '@ttahub/common';
import db, {
  User,
  Recipient,
  Grant,
  Goal,
  GoalFieldResponse,
  File,
  Role,
  Objective,
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveFile,
  ActivityReportObjectiveResource,
  ActivityReportObjectiveTopic,
  ActivityReportObjectiveCourse,
  ActivityReportGoalFieldResponse,
  GoalTemplateFieldPrompt,
  CollaboratorRole,
  Topic,
  Course,
} from '../models';
import {
  cacheGoalMetadata,
  cacheCourses,
} from './reportCache';
import {
  createReport,
  destroyReport,
  createGrant,
  createRecipient,
  createGoal,
} from '../testUtils';
import { GOAL_STATUS } from '../constants';

describe('cacheCourses', () => {
  let courseOne;
  let courseTwo;
  let activityReport;
  let grant;
  let recipient;
  let goal;
  let objective;
  let aro;

  beforeAll(async () => {
    recipient = await createRecipient({});
    grant = await createGrant({ recipientId: recipient.id });

    activityReport = await createReport({
      activityRecipients: [
        {
          grantId: grant.id,
        },
      ],
    });

    goal = await createGoal({ grantId: grant.id, status: GOAL_STATUS.IN_PROGRESS });

    objective = await Objective.create({
      goalId: goal.id,
      title: faker.datatype.string(200),
      status: 'Not Started',
    });

    courseOne = await Course.create({
      name: faker.datatype.string(200),
    });

    courseTwo = await Course.create({
      name: faker.datatype.string(200),
    });

    aro = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: activityReport.id,
    });

    await ActivityReportObjectiveCourse.create({
      activityReportObjectiveId: aro.id,
      courseId: courseOne.id,
    });
  });

  afterAll(async () => {
    await ActivityReportObjectiveCourse.destroy({
      where: {
        courseId: [courseOne.id, courseTwo.id],
      },
    });

    await Course.destroy({ where: { id: [courseOne.id, courseTwo.id] } });
    await ActivityReportObjective.destroy({ where: { objectiveId: objective.id } });
    await Objective.destroy({ where: { id: objective.id }, force: true });
    await Goal.destroy({ where: { id: goal.id }, force: true });
    await destroyReport(activityReport);
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
  });

  it('should cache courses', async () => {
    await cacheCourses(objective.id, aro.id, [{ id: courseTwo.id }]);

    const aroCourses = await ActivityReportObjectiveCourse.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    });

    expect(aroCourses).toHaveLength(1);
    expect(aroCourses[0].courseId).toEqual(courseTwo.id);
  });
});

describe('cacheGoalMetadata', () => {
  let activityReport;
  let goal;

  let multiRecipientActivityReport;
  let multiRecipientGoal;

  const mockUser = {
    id: faker.datatype.number(),
    homeRegionId: 1,
    name: 'user13706689',
    hsesUsername: 'user13706689',
    hsesUserId: 'user13706689',
    lastLogin: new Date(),
  };

  beforeAll(async () => {
    await User.create(mockUser);
    const grantId = faker.datatype.number();

    activityReport = await createReport({
      activityRecipients: [
        {
          grantId,
        },
      ],
      userId: mockUser.id,
    });

    multiRecipientActivityReport = await createReport({
      activityRecipients: [
        {
          grantId,
        },
      ],
      userId: mockUser.id,
    });

    goal = await Goal.create({
      grantId,
      name: faker.lorem.sentence(20),
      status: GOAL_STATUS.DRAFT,
      timeframe: 'Short Term',
      endDate: null,
      isRttapa: null,
      isActivelyEdited: false,
      source: GOAL_SOURCES[0],
    });

    multiRecipientGoal = await Goal.create({
      grantId,
      name: faker.lorem.sentence(20),
      status: GOAL_STATUS.DRAFT,
      timeframe: 'Short Term',
      closeSuspendReason: null,
      closeSuspendContext: null,
      endDate: null,
      isRttapa: null,
      isActivelyEdited: false,
      source: GOAL_SOURCES[0],
    });

    // Get GoalTemplateFieldPrompts where title = 'FEI root cause'.
    const fieldPrompt = await GoalTemplateFieldPrompt.findOne({
      where: {
        title: 'FEI root cause',
      },
    });

    // Create a GoalFieldResponse for the goal.
    await GoalFieldResponse.create({
      goalId: multiRecipientGoal.id,
      goalTemplateFieldPromptId: fieldPrompt.id,
      response: ['Family Circumstance', 'Facilities', 'Other ECE Care Options'],
      onAr: true,
      onApprovedAR: false,
    });
  });

  afterAll(async () => {
    // Get all ActivityReportGoals ids for our goals.
    const activityReportGoalIds = await ActivityReportGoal.findAll({
      where: {
        goalId: [goal.id, multiRecipientGoal.id],
      },
    });

    // Destroy all ActivityReportGoalFieldResponses for the activityReportGoalIds.
    await ActivityReportGoalFieldResponse.destroy({
      where: {
        activityReportGoalId: activityReportGoalIds.map((arg) => arg.id),
      },
    });

    await ActivityReportGoal.destroy({
      where: {
        activityReportId:
      [
        activityReport.id,
        multiRecipientActivityReport.id,
      ],
      },
    });
    await destroyReport(activityReport);
    await destroyReport(multiRecipientActivityReport);
    await GoalFieldResponse.destroy({
      where: {
        goalId: [goal.id, multiRecipientGoal.id],
      },
    });
    await Goal.destroy({ where: { id: [goal.id, multiRecipientGoal.id] }, force: true });
    await User.destroy({ where: { id: mockUser.id } });
  });

  it('should cache goal metadata', async () => {
    let arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReport.id,
        goalId: goal.id,
      },
    });

    expect(arg).toHaveLength(0);

    await cacheGoalMetadata(goal, activityReport.id, false);

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReport.id,
        goalId: goal.id,
      },
    });

    expect(arg).toHaveLength(1);

    const data = {
      name: goal.name,
      status: GOAL_STATUS.DRAFT,
      timeframe: 'Short Term',
      endDate: null,
      isRttapa: null,
      isActivelyEdited: false,
      source: GOAL_SOURCES[0],
    };

    expect(arg[0].dataValues).toMatchObject(data);

    await cacheGoalMetadata(goal, activityReport.id, true, [], true);

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: activityReport.id,
        goalId: goal.id,
      },
    });

    const updatedData = {
      ...data,
      isActivelyEdited: true,
    };
    expect(arg).toHaveLength(1);
    expect(arg[0].dataValues).toMatchObject(updatedData);
  });

  it('correctly handles multi recipient prompts', async () => {
    let arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
        goalId: multiRecipientActivityReport.id,
      },
    });

    expect(arg).toHaveLength(0);

    await cacheGoalMetadata(
      multiRecipientGoal,
      multiRecipientActivityReport.id,
      false,
      [], // Don't pass prompts should come from goal.
      true,
    );

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
        goalId: multiRecipientGoal.id,
      },
    });

    expect(arg).toHaveLength(1);

    // Get the ActivityReportGoalFieldResponses for the arg.id.
    const fieldResponses = await ActivityReportGoalFieldResponse.findAll({
      where: {
        activityReportGoalId: arg[0].id,
      },
    });

    expect(fieldResponses).toHaveLength(1);
    expect(fieldResponses[0].dataValues.response).toEqual(['Family Circumstance', 'Facilities', 'Other ECE Care Options']);

    // Update goal field reposone for the goal..
    await GoalFieldResponse.update({
      response: ['Family Circumstance UPDATED', 'New Response'],
    }, {
      where: {
        goalId: multiRecipientGoal.id,
      },
    });

    await cacheGoalMetadata(
      multiRecipientGoal,
      multiRecipientActivityReport.id,
      false,
      [], // Don't pass prompts should come from goal.
      true,
    );

    arg = await ActivityReportGoal.findAll({
      where: {
        activityReportId: multiRecipientActivityReport.id,
        goalId: multiRecipientGoal.id,
      },
    });
    expect(arg).toHaveLength(1);

    const updatedFieldResponses = await ActivityReportGoalFieldResponse.findAll({
      where: {
        activityReportGoalId: arg[0].id,
      },
    });

    expect(updatedFieldResponses).toHaveLength(1);
    expect(updatedFieldResponses[0].dataValues.response).toEqual(['Family Circumstance UPDATED', 'New Response']);
  });
});
