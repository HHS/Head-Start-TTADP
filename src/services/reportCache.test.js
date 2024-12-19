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
  ActivityReportObjectiveCitation,
  ActivityReportGoalFieldResponse,
  GoalTemplateFieldPrompt,
  CollaboratorRole,
  Topic,
  Course,
} from '../models';
import {
  cacheGoalMetadata,
  cacheCourses,
  cacheCitations,
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

describe('activityReportObjectiveCitation', () => {
  let activityReportObjectiveCitation1;
  let activityReportObjectiveCitation2;
  let activityReport;
  let grant;
  let recipient;
  let goal;
  let objective;
  let aro;
  const citationIds = [];

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

    goal = await Goal.create({
      name: faker.lorem.sentence(20),
      status: GOAL_STATUS.NOT_STARTED,
      endDate: null,
      isFromSmartsheetTtaPlan: false,
      onApprovedAR: false,
      grantId: grant.id,
      createdVia: 'monitoring',
    });

    objective = await Objective.create({
      goalId: goal.id,
      title: faker.datatype.string(200),
      status: 'Not Started',
    });

    aro = await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: activityReport.id,
    });
  });

  afterAll(async () => {
    await ActivityReportObjectiveCitation.destroy({
      where: {
        id: citationIds,
      },
    });

    await ActivityReportObjective.destroy({ where: { objectiveId: objective.id } });
    await Objective.destroy({ where: { id: objective.id }, force: true });
    await Goal.destroy({ where: { id: goal.id }, force: true });
    await destroyReport(activityReport);
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
  });

  it('should create, read, update, and delete', async () => {
    // Create a new ActivityReportObjectiveCitation.
    const citationsToCreate = [
      {
        citation: 'Citation 1',
        monitoringReferences: [{
          grantId: grant.id,
          findingId: 1,
          reviewName: 'Review 1',
        }],
      },
    ];

    // Save the ActivityReportObjectiveCitation.
    let result = await cacheCitations(objective.id, aro.id, citationsToCreate);

    // Assert created.
    expect(result[0]).toBeDefined();

    const createdAroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    });

    const citation1Id = createdAroCitations[0].id;
    citationIds.push(citation1Id);

    expect(createdAroCitations).toHaveLength(1);
    expect(createdAroCitations[0].citation).toEqual('Citation 1');
    expect(createdAroCitations[0].monitoringReferences).toEqual([{
      grantId: grant.id,
      findingId: 1,
      reviewName: 'Review 1',
    }]);

    // Update the ActivityReportObjectiveCitation.
    const citationsToUpdate = [
      {
        id: citation1Id,
        citation: 'Citation 1 Updated',
        monitoringReferences: [{
          grantId: grant.id,
          findingId: 1,
          reviewName: 'Review 1 Updated',
        }],
      },
    ];

    result = await cacheCitations(objective.id, aro.id, citationsToUpdate);

    // Assert updated.
    expect(result[0]).toBeDefined();

    const updatedAroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    });

    expect(updatedAroCitations).toHaveLength(1);
    expect(updatedAroCitations[0].citation).toEqual('Citation 1 Updated');
    expect(updatedAroCitations[0].monitoringReferences).toEqual([{
      grantId: grant.id,
      findingId: 1,
      reviewName: 'Review 1 Updated',
    }]);

    // Delete the ActivityReportObjectiveCitation.
    result = await cacheCitations(objective.id, aro.id, []);

    // Assert deleted.
    expect(result).toHaveLength(0);

    const deletedAroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    });

    expect(deletedAroCitations).toHaveLength(0);
  });

  it('correctly saves aro citations per grant', async () => {
    const multiGrantCitations = [
      {
        citation: 'Citation 1',
        monitoringReferences: [{
          grantId: grant.id,
          findingId: 1,
          reviewName: 'Review 1',
        }],
      },
      {
        citation: 'Citation 2',
        monitoringReferences: [{
          grantId: 2,
          findingId: 1,
          reviewName: 'Review 2',
        }],
      },
      {
        citation: 'Citation 3',
        monitoringReferences: [
          {
            grantId: 3,
            findingId: 1,
            reviewName: 'Review 3',
          },
          {
            grantId: grant.id,
            findingId: 1,
            reviewName: 'Review 4',
          }],
      },
    ];

    await cacheCitations(objective.id, aro.id, multiGrantCitations);

    // Retrieve all citations for the aro.
    const aroCitations = await ActivityReportObjectiveCitation.findAll({
      where: {
        activityReportObjectiveId: aro.id,
      },
    });

    expect(aroCitations).toHaveLength(2);
    citationIds.push(aroCitations[0].id);
    citationIds.push(aroCitations[1].id);

    // Assert citations are saved correctly.
    expect(aroCitations[0].citation).toEqual('Citation 1');
    expect(aroCitations[0].monitoringReferences.length).toEqual(1);
    expect(aroCitations[0].monitoringReferences[0].grantId).toBe(grant.id);

    expect(aroCitations[1].citation).toEqual('Citation 3');
    expect(aroCitations[1].monitoringReferences.length).toEqual(1);
    expect(aroCitations[1].monitoringReferences[0].grantId).toBe(grant.id);
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

describe('cacheObjectiveMetadata', () => {
  const mockUser = {
    name: 'Joe Green',
    phoneNumber: '555-555-554',
    hsesUserId: '65535',
    hsesUsername: 'test49@test49.com',
    hsesAuthorities: ['ROLE_FEDERAL'],
    email: 'test49@test49.com',
    homeRegionId: 1,
    lastLogin: new Date('2021-02-09T15:13:00.000Z'),
    flags: [],
  };

  const mockRoles = [
    { name: 'FES', fullName: 'Family Engagement Specialist', isSpecialist: true },
    { name: 'HS', fullName: 'Health Specialist', isSpecialist: true },
    { name: 'ECS', fullName: 'Early Childhood Specialist', isSpecialist: true },
    { name: 'SS', fullName: 'System Specialist', isSpecialist: true },
  ];

  const mockRecipient = {
    id: 6553500,
    uei: 'NNA5N2KHMGM2',
    name: 'Tooth Brushing Academy',
    recipientType: 'Community Action Agency (CAA)',
  };

  const mockGrant = {
    id: 6553500,
    number: '99RC9999',
    regionId: 2,
    status: 'Active',
    startDate: new Date('2021-02-09T15:13:00.000Z'),
    endDate: new Date('2021-02-09T15:13:00.000Z'),
    cdi: false,
    grantSpecialistName: null,
    grantSpecialistEmail: null,
    stateCode: 'NY',
    annualFundingMonth: 'October',
  };

  const mockGoal = {
    name: 'Goal 1',
    id: 20850000,
    status: 'Not Started',
    timeframe: 'None',
    source: GOAL_SOURCES[0],
  };

  const mockObjective = {
    id: 2022081300,
    title: null,
    status: 'Not Started',
  };

  const mockReport = {
    id: 900000,
    submissionStatus: REPORT_STATUSES.DRAFT,
    calculatedStatus: REPORT_STATUSES.DRAFT,
    numberOfParticipants: 1,
    deliveryMethod: 'method',
    duration: 0,
    endDate: '2020-01-01T12:00:00Z',
    startDate: '2020-01-01T12:00:00Z',
    requester: 'requester',
    regionId: 2,
    targetPopulations: [],
    version: 2,
  };

  const mockFiles = [{
    id: 140000001,
    originalFileName: 'test01.pdf',
    key: '508bdc9e-8dec-4d64-b83d-59a72a4f2353.pdf',
    status: 'APPROVED',
    fileSize: 54417,
  }, {
    id: 140000002,
    originalFileName: 'test02.pdf',
    key: '508bdc9e-8dec-4d64-b83d-59a72a4f2354.pdf',
    status: 'APPROVED',
    fileSize: 54417,
  }];

  const mockObjectiveResources = [
    'https://ttahub.ohs.acf.hhs.gov/',
    'https://hses.ohs.acf.hhs.gov/',
    'https://eclkc.ohs.acf.hhs.gov/',
  ];

  let user;
  const roles = [];
  let recipient;
  let grant;
  let report;
  let goal;
  let objective;
  let files = [];

  const objectiveResources = [];

  const topics = [];
  let courseOne;
  let courseTwo;

  beforeAll(async () => {
    [user] = await User.findOrCreate({ where: { ...mockUser } });
    roles.push((await Role.findOrCreate({ where: { ...mockRoles[0] } }))[0]);
    roles.push((await Role.findOrCreate({ where: { ...mockRoles[1] } }))[0]);
    roles.push((await Role.findOrCreate({ where: { ...mockRoles[2] } }))[0]);
    roles.push((await Role.findOrCreate({ where: { ...mockRoles[3] } }))[0]);
    [recipient] = await Recipient.findOrCreate({ where: { ...mockRecipient } });
    [grant] = await Grant.findOrCreate({
      where: {
        ...mockGrant,
        recipientId: recipient.id,
        programSpecialistName: user.name,
        programSpecialistEmail: user.email,
      },
    });
    [report] = await ActivityReport.findOrCreate({ where: { ...mockReport } });
    await ActivityRecipient.findOrCreate({
      where: {
        activityReportId: report.id,
        grantId: grant.id,
      },
    });
    [goal] = await Goal.findOrCreate({ where: { ...mockGoal, grantId: mockGrant.id } });
    [objective] = await Objective.findOrCreate({ where: { ...mockObjective, goalId: goal.id } });
    await Promise.all(mockFiles.map(
      async (mockFile) => File.findOrCreate({ where: { ...mockFile } }),
    ));
    files = await File.findAll({ where: { id: mockFiles.map((mockFile) => mockFile.id) }, order: ['id'] });

    courseOne = await Course.create({
      name: faker.datatype.string(200),
    });

    courseTwo = await Course.create({
      name: faker.datatype.string(200),
    });

    topics.push((await Topic.findOrCreate({ where: { name: 'Coaching' } })));
    topics.push((await Topic.findOrCreate({ where: { name: 'Communication' } })));
    topics.push((await Topic.findOrCreate({ where: { name: 'Community and Self-Assessment' } })));
  });

  afterAll(async () => {
    await ActivityRecipient.destroy({
      where: {
        [Op.or]: [
          { activityReportId: report.id },
          { grantId: mockGrant.id },
        ],
      },
    });
    await ActivityReportGoal.destroy({ where: { goalId: goal.id } });
    const aroFiles = await ActivityReportObjectiveFile
      .findAll({ include: { model: ActivityReportObjective, as: 'activityReportObjective', where: { objectiveId: objective.id } } });
    await ActivityReportObjectiveFile
      .destroy({ where: { id: { [Op.in]: aroFiles.map((aroFile) => aroFile.id) } } });
    const aroResources = await ActivityReportObjectiveResource
      .findAll({ include: { model: ActivityReportObjective, as: 'activityReportObjective', where: { objectiveId: objective.id } } });
    await ActivityReportObjectiveResource
      .destroy({ where: { id: { [Op.in]: aroResources.map((aroResource) => aroResource.id) } } });
    const aroTopics = await ActivityReportObjectiveTopic
      .findAll({ include: { model: ActivityReportObjective, as: 'activityReportObjective', where: { objectiveId: objective.id } } });
    await ActivityReportObjectiveTopic
      .destroy({ where: { id: { [Op.in]: aroTopics.map((aroTopic) => aroTopic.id) } } });
    const aroCourses = await ActivityReportObjectiveCourse
      .findAll({ include: { model: ActivityReportObjective, as: 'activityReportObjective', where: { objectiveId: objective.id } } });
    await ActivityReportObjectiveTopic
      .destroy({ where: { id: { [Op.in]: aroCourses.map((c) => c.id) } } });
    await ActivityReportObjective.destroy({ where: { objectiveId: objective.id } });
    await ActivityReport.destroy({ where: { id: report.id } });
    await Objective.destroy({ where: { id: objective.id }, force: true });
    await Goal.destroy({ where: { id: goal.id }, force: true });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await Course.destroy({ where: { id: [courseOne.id, courseTwo.id] } });
    await Recipient.destroy({ where: { id: recipient.id } });
    await Promise.all(roles.map(async (role) => CollaboratorRole.destroy({
      where: { roleId: role.id },
    })));
    await Promise.all(roles.map(async (role) => role.destroy()));
    await Promise.all(files.map(async (file) => file.destroy()));
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });
});
