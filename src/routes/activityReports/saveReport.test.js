import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../../constants';
import SCOPES from '../../middleware/scopeConstants';
import {
  ActivityReport,
  ActivityReportGoal,
  ActivityRecipient,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Goal,
  Grant,
  NextStep,
  Objective,
  Recipient,
  User,
  Permission,
  Topic,
  sequelize,
} from '../../models';
import { createReport, saveReport } from './handlers';

describe('saveReport', () => {
  const mockResponse = {
    json: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };

  let firstUser;
  let secondUser;

  const grantAndRecipientId = faker.datatype.number({ min: 999 });

  let firstGoal;
  let secondGoal;
  let thirdGoal;
  let fourthGoal;
  let firstGrant;
  let secondGrant;
  let recipient;
  let firstTopic;
  let secondTopic;

  let firstReport;
  let secondReport;
  let thirdReport;
  let fourthReport;

  beforeAll(async () => {
    firstUser = await User.create({
      homeRegionId: 1,
      hsesUsername: faker.internet.email(),
      hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
      email: faker.internet.email(),
      phoneNumber: faker.phone.phoneNumber(),
      name: faker.name.findName(),
      role: ['Grants Specialist'],
      lastLogin: new Date(),
    });

    secondUser = await User.create({
      homeRegionId: 1,
      hsesUsername: faker.internet.email(),
      hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
      email: faker.internet.email(),
      phoneNumber: faker.phone.phoneNumber(),
      name: faker.name.findName(),
      role: ['Grants Specialist'],
      lastLogin: new Date(),
    });

    await Permission.create({
      userId: firstUser.id,
      regionId: 1,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    });

    await Permission.create({
      userId: secondUser.id,
      regionId: 1,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    });

    recipient = await Recipient.create({
      name: faker.company.companyName(),
      id: grantAndRecipientId,
    });

    firstGrant = await Grant.create({
      id: grantAndRecipientId,
      recipientId: grantAndRecipientId,
      number: String(grantAndRecipientId),
      startDate: new Date(),
      endDate: new Date(),
      stateCode: 'AL',
      status: 'Active',
      regionId: 1,
    });

    const secondGrantId = faker.datatype.number({ min: 999 });

    secondGrant = await Grant.create({
      id: secondGrantId,
      recipientId: grantAndRecipientId,
      number: String(secondGrantId),
      startDate: new Date(),
      endDate: new Date(),
      stateCode: 'AL',
      status: 'Active',
      regionId: 1,
    });

    firstTopic = await Topic.create({
      name: 'New topic',
    });

    secondTopic = await Topic.create({
      name: 'New topic 2',
    });

    const firstGoalName = `GOAL ${faker.animal.dog()} ${faker.datatype.number({ min: 999 })}`;
    const secondGoalName = `GOAL ${faker.animal.dog()} ${faker.datatype.number({ min: 999 })}`;

    firstGoal = await Goal.create({
      goalTemplateId: 1,
      name: firstGoalName,
      createdVia: 'rtr',
      isRttapa: 'Yes',
      grantId: grantAndRecipientId,
      status: GOAL_STATUS.DRAFT,
    });

    secondGoal = await Goal.create({
      goalTemplateId: 1,
      name: firstGoalName,
      createdVia: 'rtr',
      isRttapa: 'Yes',
      grantId: secondGrantId,
      status: GOAL_STATUS.DRAFT,
    });

    thirdGoal = await Goal.create({
      goalTemplateId: 2, // These all have the same grant id so we change the template id.
      name: secondGoalName,
      createdVia: 'rtr',
      isRttapa: 'Yes',
      grantId: grantAndRecipientId,
      status: GOAL_STATUS.DRAFT,
    });

    fourthGoal = await Goal.create({
      goalTemplateId: 3, // These all have the same grant id so we change the template id.
      name: secondGoalName,
      createdVia: 'rtr',
      isRttapa: 'Yes',
      grantId: secondGrantId,
      status: GOAL_STATUS.DRAFT,
    });
  });

  afterAll(async () => {
    const reportIds = [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id];

    await ActivityRecipient.destroy({
      where: { activityReportId: reportIds },
      individualHooks: true,
    });
    await NextStep.destroy({
      where: { activityReportId: reportIds },
      individualHooks: true,
    });

    const goalsToDelete = await Goal.findAll({
      where: { grantId: [firstGrant.id, secondGrant.id] },
    });

    await ActivityReportGoal.destroy({
      where: { activityReportId: reportIds },
      individualHooks: true,
    });
    await ActivityReportObjective.destroy({
      where: { activityReportId: reportIds },
      individualHooks: true,
    });
    await Objective.destroy({
      where: {
        [Op.or]: [
          { goalId: goalsToDelete.map(({ id }) => id) },
          { createdViaActivityReportId: reportIds },
        ],
      },
      individualHooks: true,
      force: true,
    });
    await ActivityReport.destroy({
      where: { id: reportIds },
      individualHooks: true,
    });

    await Goal.destroy({
      where: { id: goalsToDelete.map(({ id }) => id) },
      individualHooks: true,
      force: true,
    });
    await Grant.destroy({
      where: { id: [firstGrant.id, secondGrant.id] },
      individualHooks: true,
    });
    await Recipient.destroy({
      where: { id: recipient.id },
      individualHooks: true,
    });
    await Topic.destroy({
      where: { id: [firstTopic.id, secondTopic.id] },
      individualHooks: true,
      force: true,
    });

    await Permission.destroy({
      where: {
        userId: [firstUser.id, secondUser.id],
      },
      individualHooks: true,
    });

    await User.destroy({
      where: {
        id: [firstUser.id, secondUser.id],
      },
      individualHooks: true,
    });

    await sequelize.close();
  });

  it('scenario 1: properly updates recipients, goals, and objectives', async () => {
    /**
     *
     * this tests a bug where an extra objective would be left hanging if a report changed
     * recipients mid-flight
     *
     * it was reported with a recipient that had two possible grants, so that's how this test
     * is written
     */

    // first, we create a report for the first grant
    const requestBody = {
      ECLKCResourcesUsed: [],
      activityRecipientType: 'recipient',
      activityRecipients: [{
        activityRecipientId: grantAndRecipientId,
      }],
      activityType: [],
      additionalNotes: null,
      files: [],
      collaborators: [],
      activityReportCollaborators: [],
      context: '',
      deliveryMethod: null,
      duration: null,
      goals: [],
      recipientNextSteps: [{ id: null, note: '' }],
      recipients: [],
      nonECLKCResourcesUsed: [],
      numberOfParticipants: null,
      objectivesWithoutGoals: [],
      otherResources: [],
      participantCategory: '',
      participants: [],
      reason: [],
      requester: null,
      specialistNextSteps: [{ id: null, note: '' }],
      calculatedStatus: 'draft',
      targetPopulations: [],
      topics: [],
      approvers: [],
      creatorRole: 'Grants Specialist',
      pageState: {
        1: 'In progress', 2: 'Not started', 3: 'Not started', 4: 'Not started',
      },
      userId: firstUser.id,
      regionId: 1,
      version: 2,
      savedToStorageTime: new Date(),
      createdInLocalStorage: new Date(),
      ttaType: [],
      startDate: null,
      endDate: null,
      approverUserIds: [],
    };

    await createReport({ body: requestBody, session: { userId: firstUser.id } }, mockResponse);

    let newReports = await ActivityReport.findAll({
      where: {
        userId: firstUser.id,
      },
    });

    expect(newReports.length).toBe(1);
    [firstReport] = newReports;

    // then, we add a goal to that report

    const secondRequestBody = {
      endDate: null,
      goalEndDate: '',
      goalIsRttapa: '',
      goalName: '',
      goals: [{
        goalTemplateId: 1,
        label: firstGoal.name,
        objectives: [{
          title: 'first objective for goal',
          topics: [{ id: firstTopic.id, name: firstTopic.name }],
          resources: [],
          files: [],
          ttaProvided: '<marquee>we are sliding</marquee>\n',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          label: 'Create a new objective',
        }],
        isNew: true,
        endDate: '',
        grantIds: [firstGoal.grantId],
        goalIds: [firstGoal.id],
        oldGrantIds: [],
        name: firstGoal.name,
        status: GOAL_STATUS.DRAFT,
        onApprovedAR: false,
        isRttapa: 'No',
        isActivelyBeingEditing: false,
        regionId: 1,
      }],
      pageState: {
        1: 'In progress', 2: 'Complete', 3: 'Not started', 4: 'Not started',
      },
      startDate: null,
      version: 2,
      approverUserIds: [],
    };

    await saveReport({
      body: secondRequestBody,
      session: { userId: firstUser.id },
      params: { activityReportId: firstReport.id },
    }, mockResponse);

    let allObjectivesForGoals = await Objective.findAll({
      where: {
        goalId: [firstGoal.id, secondGoal.id],
      },
    });

    expect(allObjectivesForGoals.length).toBe(1);

    const [firstObjective] = allObjectivesForGoals;

    // next, we create a second report

    const thirdRequestBody = {
      ECLKCResourcesUsed: [],
      activityRecipientType: 'recipient',
      activityRecipients: [{
        activityRecipientId: grantAndRecipientId,
      }],
      activityType: [],
      additionalNotes: null,
      files: [],
      collaborators: [],
      activityReportCollaborators: [],
      context: '',
      deliveryMethod: null,
      duration: null,
      goals: [],
      recipientNextSteps: [{ id: null, note: '' }],
      recipients: [],
      nonECLKCResourcesUsed: [],
      numberOfParticipants: null,
      objectivesWithoutGoals: [],
      otherResources: [],
      participantCategory: '',
      participants: [],
      reason: [],
      requester: null,
      specialistNextSteps: [{ id: null, note: '' }],
      calculatedStatus: 'draft',
      targetPopulations: [],
      topics: [],
      approvers: [],
      creatorRole: 'Grants Specialist',
      pageState: {
        1: 'In progress', 2: 'Not started', 3: 'Not started', 4: 'Not started',
      },
      userId: firstUser.id,
      regionId: 1,
      version: 2,
      savedToStorageTime: new Date(),
      createdInLocalStorage: new Date(),
      ttaType: [],
      startDate: null,
      endDate: null,
      approverUserIds: [],
    };

    await createReport({ body: thirdRequestBody, session: { userId: firstUser.id } }, mockResponse);

    newReports = await ActivityReport.findAll({
      where: {
        userId: firstUser.id,
      },
    });

    expect(newReports.length).toBe(2);
    const notFirstReport = newReports.filter((r) => r.id !== firstReport.id);
    expect(notFirstReport.length).toBe(1);
    [secondReport] = notFirstReport;

    // then we add a goal to that report

    const fourthRequestBody = {
      endDate: null,
      goalEndDate: '',
      goalIsRttapa: '',
      goalName: '',
      goals: [{
        goalTemplateId: 1,
        label: firstGoal.name,
        objectives: [{
          title: 'second objective for goal',
          topics: [{ id: secondTopic.id, name: secondTopic.name }],
          resources: [],
          files: [],
          ttaProvided: '<marquee>we are sliding</marquee>\n',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          label: 'Create a new objective',
        }],
        isNew: true,
        endDate: '',
        grantIds: [firstGoal.grantId],
        goalIds: [firstGoal.id],
        oldGrantIds: [],
        name: firstGoal.name,
        status: GOAL_STATUS.DRAFT,
        onApprovedAR: false,
        isRttapa: 'No',
        isActivelyBeingEditing: false,
        regionId: 1,
      }],
      pageState: {
        1: 'In progress', 2: 'Complete', 3: 'Not started', 4: 'Not started',
      },
      startDate: null,
      version: 2,
      approverUserIds: [],
    };

    await saveReport({
      body: fourthRequestBody,
      session: { userId: firstUser.id },
      params: { activityReportId: secondReport.id },
    }, mockResponse);

    newReports = await ActivityReport.findAll({
      where: {
        userId: firstUser.id,
      },
    });

    expect(newReports.length).toBe(2);

    allObjectivesForGoals = await Objective.findAll({
      where: {
        goalId: [firstGoal.id, secondGoal.id],
      },
    });

    expect(allObjectivesForGoals.length).toBe(2);
    const goalIds = allObjectivesForGoals.map((o) => o.goalId);
    expect(goalIds).toContain(firstGoal.id);
    expect(goalIds).not.toContain(secondGoal.id);

    const objectives = await Objective.findAll({
      where: {
        goalId: firstGoal.id,
      },
      include: [
        {
          model: ActivityReportObjective,
          as: 'activityReportObjectives',
          where: {
            activityReportId: secondReport.id,
          },
          required: true,
          include: [
            {
              model: ActivityReportObjectiveTopic,
              as: 'activityReportObjectiveTopics',
            },
          ],
        },
      ],
    });

    // then, finally, we change the grant of the second report

    const fifthRequestBody = {
      recipientsWhoHaveGoalsThatShouldBeRemoved: [firstGrant.id],
      goals: [{
        goalTemplateId: 1,
        id: firstGoal.id,
        name: firstGoal.name,
        status: firstGoal.status,
        timeframe: null,
        isFromSmartsheetTtaPlan: false,
        endDate: null,
        grantId: grantAndRecipientId,
        onAR: true,
        onApprovedAR: false,
        isRttapa: 'No',
        createdVia: 'rtr',
        createdAt: new Date(),
        updatedAt: new Date(),
        activityReportGoals: [
          {
            endDate: new Date(),
            activityReportId: secondReport.id,
            goalId: firstGoal.id,
          },
        ],
        grant: firstGrant,
        objectives,
        goalNumbers: [`G-${firstGoal.id}`],
        goalIds: [firstGoal.id],
        grants: [firstGrant],
        grantIds: [secondGrant.id],
        isNew: false,
        initialRttapa: 'No',
      }],
      activityRecipients: [{
        activityRecipientId: secondGrant.id,
      }],
      duration: null,
      endDate: null,
      numberOfParticipants: null,
      startDate: null,
      version: 2,
      approverUserIds: [],
      pageState: {
        1: 'In progress', 2: 'Complete', 3: 'Not started', 4: 'Not started',
      },
    };

    await saveReport({
      body: fifthRequestBody,
      session: { userId: firstUser.id },
      params: { activityReportId: secondReport.id },
    }, mockResponse);

    // now, we can confirm that the data is structured as expected

    // confirm first report data
    // 1) one goal (goal 1)
    // 2) one grant/recipient (grant 1)
    // 3) one objective (objective 1)

    const firstReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: firstReport.id,
      },
    });

    expect(firstReportGoals.length).toBe(1);
    const [firstReportGoal] = firstReportGoals;
    expect(firstReportGoal.goalId).toBe(firstGoal.id);

    const firstReportObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: firstReport.id,
      },
    });

    expect(firstReportObjectives.length).toBe(1);
    const [firstReportObjective] = firstReportObjectives;
    expect(firstReportObjective.objectiveId).toBe(firstObjective.id);

    const firstReportRecipients = await ActivityRecipient.findAll({
      where: {
        activityReportId: firstReport.id,
      },
    });

    expect(firstReportRecipients.length).toBe(1);
    const [firstReportRecipient] = firstReportRecipients;
    expect(firstReportRecipient.grantId).toBe(firstGrant.id);

    // confirm the second report data
    // 1) one goal (goal 2)
    // 2) one grant/recipient (grant 2)
    // 3) one objective

    const secondReportRecipients = await ActivityRecipient.findAll({
      where: {
        activityReportId: secondReport.id,
      },
    });

    expect(secondReportRecipients.length).toBe(1);
    const [secondReportRecipient] = secondReportRecipients;
    expect(secondReportRecipient.grantId).toBe(secondGrant.id);

    const secondReportGoals = await ActivityReportGoal.findAll({
      where: {
        activityReportId: secondReport.id,
      },
    });

    expect(secondReportGoals.length).toBe(1);

    const secondReportGoal = await Goal.findOne({
      where: {
        id: secondReportGoals[0].goalId,
      },
    });

    expect(secondReportGoal.id).not.toBe(firstGoal.id);
    expect(secondReportGoal.id).toBe(secondGoal.id);

    const secondReportARObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: secondReport.id,
      },
    });

    const secondReportObjectives = await Objective.findAll({
      where: {
        id: secondReportARObjectives.map((o) => o.objectiveId),
      },
    });

    expect(secondReportObjectives.length).toBe(1);
    const [secondReportObjective] = secondReportObjectives;
    expect(secondReportObjective.title).toBe('second objective for goal');

    // the grants should only have four goals (1 each)
    const grantGoals = await Goal.findAll({
      where: {
        grantId: [firstGrant.id, secondGrant.id],
      },
    });

    expect(grantGoals.length).toBe(4);
    const grantGoalIds = grantGoals.map((g) => g.id);

    expect(grantGoalIds).toContain(firstGoal.id);
    expect(grantGoalIds).toContain(secondGoal.id);
    expect(grantGoalIds).toContain(thirdGoal.id);
    expect(grantGoalIds).toContain(fourthGoal.id);

    // confirm the goals are correct and that the goals have correct objectives
    // we should see the same two goals, each with one objective

    const goals = await Goal.findAll({
      where: {
        id: [firstGoal.id, secondGoal.id],
      },
      include: [
        {
          model: Objective,
          as: 'objectives',
        },
      ],
      order: [['id', 'asc']],
    });

    expect(goals.length).toBe(2);
    expect(goals[0].id).toBe(firstGoal.id);
    expect(goals[0].objectives.length).toBe(1);
    expect(goals[0].objectives[0].title).toBe('first objective for goal');

    expect(goals[1].id).toBe(secondGoal.id);
    expect(goals[1].objectives.length).toBe(1);
    expect(goals[1].objectives[0].title).toBe('second objective for goal');
  });

  it('scenario 2: goals are not lost', async () => {
    // first, we create a report for the first grant
    const requestBody = {
      ECLKCResourcesUsed: [],
      activityRecipientType: 'recipient',
      activityRecipients: [{
        activityRecipientId: grantAndRecipientId,
      }],
      activityType: [],
      additionalNotes: null,
      files: [],
      collaborators: [],
      activityReportCollaborators: [],
      context: '',
      deliveryMethod: null,
      duration: null,
      goals: [],
      recipientNextSteps: [{ id: null, note: '' }],
      recipients: [],
      nonECLKCResourcesUsed: [],
      numberOfParticipants: null,
      objectivesWithoutGoals: [],
      otherResources: [],
      participantCategory: '',
      participants: [],
      reason: [],
      requester: null,
      specialistNextSteps: [{ id: null, note: '' }],
      calculatedStatus: 'draft',
      targetPopulations: [],
      topics: [],
      approvers: [],
      creatorRole: 'Grants Specialist',
      pageState: {
        1: 'In progress', 2: 'Not started', 3: 'Not started', 4: 'Not started',
      },
      userId: secondUser.id,
      regionId: 1,
      version: 2,
      savedToStorageTime: new Date(),
      createdInLocalStorage: new Date(),
      ttaType: [],
      startDate: null,
      endDate: null,
      approverUserIds: [],
    };

    await createReport({ body: requestBody, session: { userId: secondUser.id } }, mockResponse);

    let newReports = await ActivityReport.findAll({
      where: {
        userId: secondUser.id,
      },
    });

    expect(newReports.length).toBe(1);
    [thirdReport] = newReports;

    // then, we add a goal to that report

    const secondRequestBody = {
      endDate: null,
      goalEndDate: '',
      goalIsRttapa: '',
      goalName: '',
      goals: [{
        goalTemplateId: 2,
        label: thirdGoal.name,
        objectives: [{
          title: 'first objective for goal',
          topics: [{ id: firstTopic.id, name: firstTopic.name }],
          resources: [],
          files: [],
          ttaProvided: '<marquee>we are sliding</marquee>\n',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          label: 'Create a new objective',
        }],
        isNew: true,
        endDate: '',
        grantIds: [thirdGoal.grantId],
        goalIds: [thirdGoal.id],
        oldGrantIds: [],
        name: thirdGoal.name,
        status: GOAL_STATUS.DRAFT,
        onApprovedAR: false,
        isRttapa: 'No',
        isActivelyBeingEditing: false,
        regionId: 1,
      }],
      pageState: {
        1: 'In progress', 2: 'Complete', 3: 'Not started', 4: 'Not started',
      },
      startDate: null,
      version: 2,
      approverUserIds: [],
    };

    await saveReport({
      body: secondRequestBody,
      session: { userId: secondUser.id },
      params: { activityReportId: thirdReport.id },
    }, mockResponse);

    let allObjectivesForGoals = await Objective.findAll({
      where: {
        goalId: [thirdGoal.id, fourthGoal.id],
      },
    });

    expect(allObjectivesForGoals.length).toBe(1);

    // next, we create a second report
    const thirdRequestBody = {
      ECLKCResourcesUsed: [],
      activityRecipientType: 'recipient',
      activityRecipients: [{
        activityRecipientId: secondGrant.id,
      }],
      activityType: [],
      additionalNotes: null,
      files: [],
      collaborators: [],
      activityReportCollaborators: [],
      context: '',
      deliveryMethod: null,
      duration: null,
      goals: [],
      recipientNextSteps: [{ id: null, note: '' }],
      recipients: [],
      nonECLKCResourcesUsed: [],
      numberOfParticipants: null,
      objectivesWithoutGoals: [],
      otherResources: [],
      participantCategory: '',
      participants: [],
      reason: [],
      requester: null,
      specialistNextSteps: [{ id: null, note: '' }],
      calculatedStatus: 'draft',
      targetPopulations: [],
      topics: [],
      approvers: [],
      creatorRole: 'Grants Specialist',
      pageState: {
        1: 'In progress', 2: 'Not started', 3: 'Not started', 4: 'Not started',
      },
      userId: secondUser.id,
      regionId: 1,
      version: 2,
      savedToStorageTime: new Date(),
      createdInLocalStorage: new Date(),
      ttaType: [],
      startDate: null,
      endDate: null,
      approverUserIds: [],
    };

    await createReport(
      {
        body: thirdRequestBody,
        session: { userId: secondUser.id },
      },
      mockResponse,
    );

    newReports = await ActivityReport.findAll({
      where: {
        userId: secondUser.id,
      },
    });

    expect(newReports.length).toBe(2);
    const notThirdReport = newReports.filter((r) => r.id !== thirdReport.id);
    expect(notThirdReport.length).toBe(1);
    [fourthReport] = notThirdReport;

    // then we add a goal to that report
    const fourthRequestBody = {
      endDate: null,
      goalEndDate: '',
      goalIsRttapa: '',
      goalName: '',
      goals: [{
        goalTemplateId: 3,
        label: fourthGoal.name,
        objectives: [{
          title: 'second objective for goal',
          topics: [{ id: secondTopic.id, name: secondTopic.name }],
          resources: [],
          files: [],
          ttaProvided: '<marquee>we are sliding</marquee>\n',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          label: 'Create a new objective',
        }],
        isNew: true,
        endDate: '',
        grantIds: [fourthGoal.grantId],
        goalIds: [fourthGoal.id],
        oldGrantIds: [],
        name: fourthGoal.name,
        status: GOAL_STATUS.DRAFT,
        onApprovedAR: false,
        isRttapa: 'No',
        isActivelyBeingEditing: false,
        regionId: 1,
      }],
      pageState: {
        1: 'In progress', 2: 'Complete', 3: 'Not started', 4: 'Not started',
      },
      startDate: null,
      version: 2,
      approverUserIds: [],
    };

    await saveReport({
      body: fourthRequestBody,
      session: { userId: secondUser.id },
      params: { activityReportId: fourthReport.id },
    }, mockResponse);

    allObjectivesForGoals = await Objective.findAll({
      where: {
        goalId: [thirdGoal.id, fourthGoal.id],
      },
    });

    expect(allObjectivesForGoals.length).toBe(2);
    let goalIds = allObjectivesForGoals.map((o) => o.goalId);
    expect(goalIds).toContain(thirdGoal.id);
    expect(goalIds).toContain(fourthGoal.id);

    const fifthRequestBody = {
      pageState: {
        1: 'In progress', 2: 'Not started', 3: 'Not started', 4: 'Not started',
      },
      recipientsWhoHaveGoalsThatShouldBeRemoved: [secondGrant.id],
      activityRecipients: [{
        activityRecipientId: grantAndRecipientId,
      }],
    };

    await saveReport({
      body: fifthRequestBody,
      session: { userId: secondUser.id },
      params: { activityReportId: fourthReport.id },
    }, mockResponse);

    allObjectivesForGoals = await Objective.findAll({
      where: {
        goalId: [thirdGoal.id, fourthGoal.id],
      },
    });

    // confirm that the one objective is deleted
    expect(allObjectivesForGoals.length).toBe(1);
    goalIds = allObjectivesForGoals.map((o) => o.goalId);
    expect(goalIds).toContain(thirdGoal.id);
    expect(goalIds).not.toContain(fourthGoal.id);

    // but the fourth goal is not
    const allGoals = await Goal.findAll({
      where: {
        id: [thirdGoal.id, fourthGoal.id],
      },
    });

    expect(allGoals.length).toBe(2);
    expect(allGoals.map((g) => g.id)).toContain(fourthGoal.id);
    expect(allGoals.map((g) => g.id)).toContain(thirdGoal.id);
  });
});
