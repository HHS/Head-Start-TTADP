import moment from 'moment';
import { REPORT_STATUSES } from '@ttahub/common';
import faker from '@faker-js/faker';
import crypto from 'crypto';
import {
  sequelize,
  User,
  ActivityReport,
  Recipient,
  Grant,
  ActivityRecipient,
  Goal,
  GoalTemplate,
  ActivityReportObjective,
  Objective,
  Topic,
  EventReportPilot,
  SessionReportPilot,
  ActivityReportObjectiveTopic,
} from '../models';
import { getGoalsByActivityRecipient } from '../services/recipient';
import { OBJECTIVE_STATUS, CREATION_METHOD } from '../constants';

const NEEDLE = 'This objective title should not appear in recipient 3';

describe('Goals by Recipient Test', () => {
  const recipient = {
    id: 300,
    uei: 'NNA5N2KHMGN2',
    name: 'Recipient with Goals',
  };

  const recipient2 = {
    id: 301,
    uei: 'NNA5N2KHMGM2',
    name: 'Recipient 2 with Goals',
  };

  const recipient3 = {
    id: 302,
    uei: 'NNA5N2KHMGA2',
    name: 'Recipient 3 with Goals',
  };

  const recipient4 = {
    id: 303,
    uei: 'NNA5N2KHMGB2',
    name: 'Recipient 4 with Goals',
  };

  const grant1 = {
    id: 300,
    recipientId: recipient.id,
    regionId: 1,
    number: '12345',
    programSpecialistName: 'George',
    status: 'Active',
    endDate: new Date(2020, 10, 2),
    grantSpecialistName: 'Glen',
  };

  const grant2 = {
    id: 301,
    recipientId: recipient.id,
    regionId: 1,
    number: '12346',
    programSpecialistName: 'Joe',
    status: 'Active',
    endDate: new Date(2020, 10, 2),
    grantSpecialistName: 'Glen',
  };

  const grant3 = {
    id: 302,
    recipientId: recipient2.id,
    regionId: 1,
    number: '12334',
    programSpecialistName: 'Joe',
    status: 'Active',
    endDate: new Date(2020, 10, 2),
    grantSpecialistName: 'Glen',
  };

  let topic;

  const grant4 = {
    id: 304,
    recipientId: recipient3.id,
    regionId: 1,
    number: '12335',
    programSpecialistName: 'Joe',
    status: 'Active',
    endDate: new Date(2020, 10, 2),
    grantSpecialistName: 'Glen',
  };

  const grant5 = {
    id: 305,
    recipientId: recipient4.id,
    regionId: 1,
    number: '12336',
    programSpecialistName: 'Joe',
    status: 'Active',
    endDate: new Date(2020, 10, 2),
    grantSpecialistName: 'Glen',
  };

  const userKey = faker.datatype.number({ min: 7500 });
  const mockGoalUser = {
    id: userKey,
    homeRegionId: 1,
    name: `user${userKey}`,
    hsesUsername: `user${userKey}`,
    hsesUserId: `user${userKey}`,
    lastLogin: new Date(),
  };

  const goalReport1 = {
    activityRecipientType: 'recipient',
    userId: mockGoalUser.id,
    regionId: 1,
    lastUpdatedById: mockGoalUser.id,
    ECLKCResourcesUsed: ['test'],
    activityRecipients: [{ grantId: grant1.id }],
    submissionStatus: REPORT_STATUSES.APPROVED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
    oldApprovingManagerId: 1,
    numberOfParticipants: 1,
    deliveryMethod: 'method',
    duration: 0,
    endDate: '2020-09-01T12:00:00Z',
    startDate: '2020-09-01T12:00:00Z',
    requester: 'requester',
    targetPopulations: ['pop'],
    participants: ['participants'],
    reason: ['COVID-19 response', 'Complaint'],
    topics: ['Learning Environments', 'Nutrition', 'Physical Health and Screenings'],
    ttaType: ['type'],
    version: 2,
  };

  const goalReport2 = {
    activityRecipientType: 'recipient',
    userId: mockGoalUser.id,
    regionId: 1,
    lastUpdatedById: mockGoalUser.id,
    ECLKCResourcesUsed: ['test'],
    activityRecipients: [{ grantId: grant2.id }],
    submissionStatus: REPORT_STATUSES.APPROVED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
    oldApprovingManagerId: 1,
    numberOfParticipants: 1,
    deliveryMethod: 'method',
    duration: 0,
    endDate: '2020-09-01T12:00:00Z',
    startDate: '2020-09-01T12:00:00Z',
    requester: 'requester',
    targetPopulations: ['pop'],
    participants: ['participants'],
    reason: ['Monitoring | Area of Concern', 'New Director or Management', 'New Program Option'],
    topics: ['Child Screening and Assessment', 'Communication'],
    ttaType: ['type'],
    version: 2,
  };

  const goalReport3 = {
    activityRecipientType: 'recipient',
    userId: mockGoalUser.id,
    regionId: 1,
    lastUpdatedById: mockGoalUser.id,
    ECLKCResourcesUsed: ['test'],
    activityRecipients: [{ grantId: grant3.id }],
    submissionStatus: REPORT_STATUSES.APPROVED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
    oldApprovingManagerId: 1,
    numberOfParticipants: 1,
    deliveryMethod: 'method',
    duration: 0,
    endDate: '2020-10-01T12:00:00Z',
    startDate: '2020-10-01T12:00:00Z',
    requester: 'requester',
    targetPopulations: ['pop'],
    participants: ['participants'],
    reason: ['Monitoring | Area of Concern', 'New Director or Management', 'New Program Option'],
    topics: ['Child Screening and Assessment', 'Communication'],
    ttaType: ['type'],
    version: 2,
  };

  const goalReport4 = {
    ...goalReport1,
    submissionStatus: REPORT_STATUSES.DRAFT,
    calculatedStatus: REPORT_STATUSES.DRAFT,
  };

  const goalReport5 = {
    activityRecipientType: 'recipient',
    userId: mockGoalUser.id,
    regionId: 1,
    lastUpdatedById: mockGoalUser.id,
    ECLKCResourcesUsed: ['test'],
    activityRecipients: [{ grantId: grant3.id }, { grantId: grant4.id }],
    submissionStatus: REPORT_STATUSES.APPROVED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
    oldApprovingManagerId: 1,
    numberOfParticipants: 1,
    deliveryMethod: 'method',
    duration: 0,
    endDate: '2020-10-01T12:00:00Z',
    startDate: '2020-10-01T12:00:00Z',
    requester: 'requester',
    targetPopulations: ['pop'],
    participants: ['participants'],
    reason: ['Monitoring | Area of Concern', 'New Director or Management', 'New Program Option'],
    topics: ['Child Screening and Assessment', 'Communication'],
    ttaType: ['type'],
    version: 2,
  };

  const goalReport6 = {
    activityRecipientType: 'recipient',
    userId: mockGoalUser.id,
    regionId: 1,
    lastUpdatedById: mockGoalUser.id,
    ECLKCResourcesUsed: ['test'],
    activityRecipients: [{ grantId: grant4.id }],
    submissionStatus: REPORT_STATUSES.APPROVED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
    oldApprovingManagerId: 1,
    numberOfParticipants: 1,
    deliveryMethod: 'method',
    duration: 0,
    endDate: '2020-10-01T12:00:00Z',
    startDate: '2020-10-01T12:00:00Z',
    requester: 'requester',
    targetPopulations: ['pop'],
    participants: ['participants'],
    reason: ['Monitoring | Area of Concern', 'New Director or Management', 'New Program Option'],
    topics: ['Child Screening and Assessment', 'Communication'],
    ttaType: ['type'],
    version: 2,
  };

  let objectiveIds = [];
  let goalIds = [];
  let curatedGoalTemplate;
  let event;

  beforeAll(async () => {
    // Create User.
    await User.create(mockGoalUser);

    // Create Recipient.
    await Recipient.create(recipient);
    await Recipient.create(recipient2);
    await Recipient.create(recipient3);
    await Recipient.create(recipient4);

    // Create Grants.
    const savedGrant1 = await Grant.create(grant1);
    const savedGrant2 = await Grant.create(grant2);
    const savedGrant3 = await Grant.create(grant3);
    const savedGrant4 = await Grant.create(grant4);
    await Grant.create(grant5);

    // Create Reports.
    const savedGoalReport1 = await ActivityReport.create(goalReport1);
    const savedGoalReport2 = await ActivityReport.create(goalReport2);
    const savedGoalReport3 = await ActivityReport.create(goalReport3);
    const savedGoalReport4 = await ActivityReport.create(goalReport4);
    const savedGoalReport5 = await ActivityReport.create(goalReport5);
    const savedGoalReport6 = await ActivityReport.create(goalReport6);

    // Create AR Recipients.
    await ActivityRecipient.create({
      activityReportId: savedGoalReport1.id,
      grantId: savedGrant1.id,
    });

    await ActivityRecipient.create({
      activityReportId: savedGoalReport2.id,
      grantId: savedGrant2.id,
    });

    await ActivityRecipient.create({
      activityReportId: savedGoalReport3.id,
      grantId: savedGrant3.id,
    });

    await ActivityRecipient.create({
      activityReportId: savedGoalReport4.id,
      grantId: savedGrant3.id,
    });

    await ActivityRecipient.create({
      activityReportId: savedGoalReport5.id,
      grantId: savedGrant3.id,
    });

    await ActivityRecipient.create({
      activityReportId: savedGoalReport5.id,
      grantId: savedGrant4.id,
    });

    await ActivityRecipient.create({
      activityReportId: savedGoalReport6.id,
      grantId: savedGrant4.id,
    });
    const n = faker.lorem.sentence(5);

    const secret = 'secret';
    const hash = crypto
      .createHmac('md5', secret)
      .update(n)
      .digest('hex');

    curatedGoalTemplate = await GoalTemplate.create({
      hash,
      templateName: n,
      creationMethod: CREATION_METHOD.CURATED,
    });

    // Create Goals.
    const goals = await Promise.all(
      [
        // goal 1 (AR1)
        Goal.create({
          name: 'Goal 1',
          status: '',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          grantId: 300,
          createdAt: '2021-01-10T19:16:15.842Z',
          onApprovedAR: true,
        }),
        // goal 2 (AR1)
        Goal.create({
          name: 'Goal 2',
          status: 'Not Started',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          grantId: 300,
          createdAt: '2021-02-15T19:16:15.842Z',
          onApprovedAR: true,
        }),
        // goal 3 (AR1)
        Goal.create({
          name: 'Goal 3',
          status: 'In Progress',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          grantId: 300,
          createdAt: '2021-03-03T19:16:15.842Z',
          onApprovedAR: true,
        }),
        // goal 4 (AR2)
        Goal.create({
          name: 'Goal 4',
          status: 'In Progress',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          grantId: 301,
          createdAt: '2021-04-02T19:16:15.842Z',
          onApprovedAR: true,
        }),
        // goal 5 (AR3 Exclude)
        Goal.create({
          name: 'Goal 5',
          status: 'In Progress',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          grantId: 302,
          createdAt: '2021-05-02T19:16:15.842Z',
          onApprovedAR: true,
        }),
        // 6
        Goal.create({
          name: 'Goal not on report, no objective',
          status: 'Closed',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          grantId: 300,
          createdAt: '2021-01-10T19:16:15.842Z',
          onApprovedAR: true,
        }),
        // 7
        Goal.create({
          name: 'Goal not on report, with objective',
          status: 'Closed',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          grantId: 300,
          createdAt: '2021-01-10T19:16:15.842Z',
          onApprovedAR: true,
          onAR: true,
        }),
        // 8
        Goal.create({
          name: 'Goal on Draft report',
          status: '',
          timeframe: '1 month',
          isFromSmartsheetTtaPlan: false,
          grantId: 300,
          createdAt: '2021-01-10T19:16:15.842Z',
          onApprovedAR: false,
        }),

        // 9
        Goal.create({
          name: 'This is a goal for 2 recipients',
          status: '',
          timeframe: '1 month',
          isFromSmartsheetTtaPlan: false,
          grantId: grant3.id,
          createdAt: '2021-01-10T19:16:15.842Z',
          onApprovedAR: true,
        }),

        // 10
        Goal.create({
          name: 'This is a goal for 2 recipients',
          status: '',
          timeframe: '1 month',
          isFromSmartsheetTtaPlan: false,
          grantId: grant4.id,
          createdAt: '2021-01-10T19:16:15.842Z',
          onApprovedAR: true,
        }),

        // 11
        Goal.create({
          name: 'This is a goal for 1 recipient but that recipient sometimes appears on multirecipient reports',
          status: '',
          timeframe: '1 month',
          isFromSmartsheetTtaPlan: false,
          grantId: grant4.id,
          createdAt: '2021-02-10T19:16:15.842Z',
          onApprovedAR: true,
        }),

        // 12
        Goal.create({
          name: 'This is an imported goals for 1 recipient',
          status: '',
          timeframe: '1 month',
          isFromSmartsheetTtaPlan: true,
          grantId: grant4.id,
          createdAt: '2021-03-10T19:16:15.842Z',
          onApprovedAR: false,
        }),

        // 13, goal from template
        Goal.create({
          name: 'This is a goal created from a curated template',
          status: 'In Progress',
          timeframe: '1 month',
          isFromSmartsheetTtaPlan: true,
          grantId: grant5.id,
          createdAt: '2021-03-10T19:16:15.842Z',
          onApprovedAR: false,
          goalTemplateId: curatedGoalTemplate.id,
        }),
      ],
    );

    // Get Goal Ids for Delete.
    goalIds = goals.map((o) => o.id);

    // Crete Objectives.
    const objectives = await Promise.all(
      [
        // objective 1 (AR1)
        await Objective.create({
          goalId: goalIds[0],
          title: 'objective 1',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
        }),
        // objective 2 (AR1)
        await Objective.create({
          goalId: goalIds[1],
          title: 'objective 2',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
        }),
        // objective 3 (AR1)
        await Objective.create({
          goalId: goalIds[2],
          title: 'objective 3',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
        }),
        // objective 4 (AR1)
        await Objective.create({
          goalId: goalIds[2],
          title: 'objective 4',
          status: OBJECTIVE_STATUS.COMPLETE,
          onApprovedAR: true,
        }),
        // objective 5 (AR2)
        await Objective.create({
          goalId: goalIds[3],
          title: 'objective 5',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
        }),
        // objective 6 (AR3)
        await Objective.create({
          goalId: goalIds[4],
          title: 'objective 6',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
        }),
        // objective 7
        await Objective.create({
          goalId: goalIds[6],
          title: 'objective 7',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
        }),
        // objective 8
        await Objective.create({
          goalId: goalIds[7],
          title: 'objective 8',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: false,
        }),

        // 9
        await Objective.create({
          goalId: goalIds[8],
          title: 'This objective title should appear in recipient 3',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
        }),

        // 10
        await Objective.create({
          goalId: goalIds[9],
          title: 'This objective title should appear in recipient 3',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
        }),

        // 11
        await Objective.create({
          goalId: goalIds[10],
          title: NEEDLE,
          status: OBJECTIVE_STATUS.NOT_STARTED,
          onApprovedAR: true,
        }),
      ],
    );

    topic = await Topic.create({
      name: 'Arcane Mastery',
    });

    // AR 1 Obj 1.
    const aro = await ActivityReportObjective.create({
      objectiveId: objectives[0].id,
      activityReportId: savedGoalReport1.id,
      ttaProvided: 'Objective for Goal 1',
      status: objectives[0].status,
    });

    await ActivityReportObjectiveTopic.create({
      activityReportObjectiveId: aro.id,
      topicId: topic.id,
    });

    // Get Objective Ids for Delete.
    objectiveIds = objectives.map((o) => o.id);

    // AR Objectives.
    await Promise.all(
      [
        // AR 1 Obj 2.
        ActivityReportObjective.create({
          objectiveId: objectives[1].id,
          activityReportId: savedGoalReport1.id,
          ttaProvided: 'Objective for Goal 2',
          status: objectives[1].status,
        }),
        // AR 1 Obj 3.
        ActivityReportObjective.create({
          objectiveId: objectives[2].id,
          activityReportId: savedGoalReport1.id,
          ttaProvided: 'Objective for Goal 3',
          status: objectives[2].status,
        }),
        // AR 1 Obj 4.
        ActivityReportObjective.create({
          objectiveId: objectives[3].id,
          activityReportId: savedGoalReport1.id,
          ttaProvided: 'Objective for Goal 3 b',
          status: objectives[3].status,
        }),
        // AR 2 Obj 5.
        ActivityReportObjective.create({
          objectiveId: objectives[4].id,
          activityReportId: savedGoalReport2.id,
          ttaProvided: 'Objective for Goal 4',
          status: objectives[4].status,
        }),
        // AR 3 Obj 6 (Exclude).
        ActivityReportObjective.create({
          objectiveId: objectives[5].id,
          activityReportId: savedGoalReport3.id,
          ttaProvided: 'Objective for Goal 5 Exclude',
          status: objectives[5].status,
        }),
        // AR 4 Draft Obj 8 (Exclude).
        ActivityReportObjective.create({
          objectiveId: objectives[7].id,
          activityReportId: savedGoalReport4.id,
          ttaProvided: 'Objective for Goal 6 Draft report Exclude',
          status: objectives[7].status,
        }),

        ActivityReportObjective.create({
          objectiveId: objectives[8].id,
          activityReportId: savedGoalReport5.id,
          ttaProvided: 'html tags',
          status: objectives[8].status,
        }),

        ActivityReportObjective.create({
          objectiveId: objectives[9].id,
          activityReportId: savedGoalReport5.id,
          ttaProvided: 'html tags',
          status: objectives[9].status,
        }),

        ActivityReportObjective.create({
          objectiveId: objectives[10].id,
          activityReportId: savedGoalReport6.id,
          ttaProvided: 'more html tags',
          status: objectives[10].status,
        }),
      ],
    );

    event = await EventReportPilot.create({
      ownerId: 1,
      regionId: 1,
      collaboratorIds: [1],
      data: {},
      imported: {},
      pocIds: [],
    });
  });

  afterAll(async () => {
    // Get Report Ids.
    const reportsToDelete = await ActivityReport.findAll({ where: { userId: mockGoalUser.id } });
    const reportIdsToDelete = reportsToDelete.map((report) => report.id);

    await SessionReportPilot.destroy({ where: { eventId: event.id } });
    await EventReportPilot.destroy({ where: { ownerId: 1 } });

    // Delete AR Objectives.
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: reportIdsToDelete,
      },
    });

    await Topic.destroy({
      where: {
        id: topic.id,
      },
      individualHooks: true,
      force: true,
    });

    // Delete Objectives.
    await Objective.destroy({
      where: {
        id: objectiveIds,
      },
      force: true,
    });

    // Delete Goals.
    await Goal.destroy({
      where: {
        id: goalIds,
      },
      force: true,
    });

    await GoalTemplate.destroy({
      where: {
        id: curatedGoalTemplate.id,
      },
    });

    // Delete AR and AR Recipient.
    await ActivityRecipient.destroy({ where: { activityReportId: reportIdsToDelete } });
    await ActivityReport.destroy({ where: { id: reportIdsToDelete } });

    // Delete Recipient, Grant, User.
    await Grant.destroy({
      where: {
        id: [
          grant1.id,
          grant2.id,
          grant3.id,
          grant4.id,
        ],
      },
      force: true,
      individualHooks: true,
    });
    await Recipient.destroy({ where: { id: [recipient.id, recipient2.id, recipient3.id] } });
    await User.destroy({ where: { id: mockGoalUser.id } });

    // Close SQL Connection.
    await sequelize.close();
  });

  describe('Retrieves All Goals', () => {
    it('Uses default sorting', async () => {
      const { goalRows } = await getGoalsByActivityRecipient(recipient.id, 1, { sortDir: 'asc' });
      expect(goalRows[0].goalText).toBe('Goal 1');
    });

    it('honors offset', async () => {
      const { goalRows } = await getGoalsByActivityRecipient(recipient.id, 1, { offset: 1, sortDir: 'asc' });
      expect(goalRows[0].goalText).toBe('Goal 2');
    });

    it('honors limit', async () => {
      const { goalRows } = await getGoalsByActivityRecipient(recipient.id, 1, { limit: 1 });
      expect(goalRows.length).toBe(1);
    });

    it('Retrieves Goals by Recipient', async () => {
      const { count, goalRows } = await getGoalsByActivityRecipient(recipient.id, 1, {
        sortBy: 'createdOn', sortDir: 'desc', offset: 0, limit: 10,
      });
      const countx = count;
      const goalRowsx = goalRows;

      expect(countx).toBe(6);
      expect(goalRowsx.length).toBe(6);

      // Goal 4.
      expect(moment(goalRowsx[0].createdOn).format('YYYY-MM-DD')).toBe('2021-04-02');
      expect(goalRowsx[0].goalText).toBe('Goal 4');
      expect(goalRowsx[0].goalNumbers).toStrictEqual([`G-${goalRowsx[0].id}`]);
      expect(goalRowsx[0].objectiveCount).toBe(1);
      expect(goalRowsx[0].reasons).toEqual(['Monitoring | Area of Concern', 'New Director or Management', 'New Program Option']);
      expect(goalRowsx[0].goalTopics).toEqual(['Child Screening and Assessment', 'Communication']);
      expect(goalRowsx[0].objectives.length).toBe(1);

      const expectedTopics = ['Buttering', 'Breading'];
      expectedTopics.sort();

      const expectedTopics2 = ['Buttering', 'Breading'];
      expectedTopics2.sort();

      // Goal 3.
      expect(goalRowsx[2].goalText).toBe('Goal 3');
      expect(moment(goalRowsx[2].createdOn).format('YYYY-MM-DD')).toBe('2021-03-03');
      expect(goalRowsx[2].goalText).toBe('Goal 3');
      expect(goalRowsx[2].goalNumbers).toStrictEqual([`G-${goalRowsx[2].id}`]);
      expect(goalRowsx[2].objectiveCount).toBe(2);
      expect(goalRowsx[2].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRowsx[2].goalTopics).toEqual(['Learning Environments', 'Nutrition', 'Physical Health and Screenings']);
      expect(goalRowsx[2].grantNumbers.length).toBe(1);
      expect(goalRowsx[2].grantNumbers[0]).toBe('12345');

      // Get objective 4.
      expect(goalRowsx[2].objectives.length).toBe(2);
      const objective4 = goalRowsx[2].objectives.find((o) => o.title === 'objective 4');
      expect(objective4.title).toBe('objective 4');
      expect(objective4.endDate).toBe('09/01/2020');
      expect(objective4.reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(objective4.status).toEqual(OBJECTIVE_STATUS.COMPLETE);

      // Get objective 3.
      const objective3 = goalRowsx[2].objectives.find((o) => o.title === 'objective 3');
      expect(objective3.title).toBe('objective 3');
      expect(objective3.endDate).toBe('09/01/2020');
      expect(objective3.reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(objective3.status).toEqual(OBJECTIVE_STATUS.NOT_STARTED);

      // Goal 2.
      expect(moment(goalRowsx[3].createdOn).format('YYYY-MM-DD')).toBe('2021-02-15');
      expect(goalRowsx[3].goalText).toBe('Goal 2');
      expect(goalRowsx[3].goalNumbers).toStrictEqual([`G-${goalRowsx[3].id}`]);
      expect(goalRowsx[3].objectiveCount).toBe(1);
      expect(goalRowsx[3].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRowsx[3].goalTopics).toEqual(['Learning Environments', 'Nutrition', 'Physical Health and Screenings']);
      expect(goalRowsx[3].objectives.length).toBe(1);

      // Goal 1.
      expect(moment(goalRowsx[4].createdOn).format('YYYY-MM-DD')).toBe('2021-01-10');
      expect(goalRowsx[4].goalText).toBe('Goal 1');
      expect(goalRowsx[4].goalNumbers).toStrictEqual([`G-${goalRowsx[4].id}`]);
      expect(goalRowsx[4].objectiveCount).toBe(1);
      expect(goalRowsx[4].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRowsx[4].goalTopics).toEqual(['Arcane Mastery', 'Learning Environments', 'Nutrition', 'Physical Health and Screenings']);
      expect(goalRowsx[4].objectives.length).toBe(1);

      goalRowsx.forEach((g) => {
        expect(g.onAR).toBeDefined();
        expect(g.onAR).not.toBeNull();
      });
    });

    it('Retrieves All Goals by Recipient', async () => {
      const { count, goalRows } = await getGoalsByActivityRecipient(recipient3.id, 1, {
        sortBy: 'createdOn', sortDir: 'desc', offset: 0, limit: 20,
      });
      const countx = count;
      const goalRowsx = goalRows;
      expect(countx).toBe(3);
      expect(goalRowsx.length).toBe(3);
    });

    it('Retrieves and sorts for merged goals by Recipient', async () => {
      const { count, goalRows } = await getGoalsByActivityRecipient(recipient3.id, 1, {
        sortBy: 'mergedGoals', sortDir: 'desc', offset: 0, limit: 20, goalIds: [goalIds[9]],
      });
      const countx = count;
      const goalRowsx = goalRows;
      expect(countx).toBe(3);
      expect(goalRowsx.length).toBe(3);
      expect(goalRowsx[0].id).toBe(goalIds[9]);
      expect(goalRowsx[1].id).toBe(goalIds[11]);
      expect(goalRowsx[2].id).toBe(goalIds[10]);
    });

    it('Retrieves and sorts for merged goals by Recipient with garbage parameters', async () => {
      const { count, goalRows } = await getGoalsByActivityRecipient(recipient3.id, 1, {
        sortBy: 'mergedGoals', sortDir: 'desc', offset: 0, limit: 20, goalIds: [goalIds[9], false],
      });
      const countx = count;
      const goalRowsx = goalRows;
      expect(countx).toBe(3);
      expect(goalRowsx.length).toBe(3);
      expect(goalRowsx[0].id).toBe(goalIds[9]);
    });

    it('Retrieves and sorts for merged goals by Recipient with no goal ids', async () => {
      const { count, goalRows } = await getGoalsByActivityRecipient(recipient3.id, 1, {
        sortBy: 'mergedGoals', sortDir: 'desc', offset: 0, limit: 20,
      });
      const countx = count;
      const goalRowsx = goalRows;
      expect(countx).toBe(3);
      expect(goalRowsx.length).toBe(3);
    });

    it('Retrieves Specified Goals for Recipient', async () => {
      const { count, goalRows } = await getGoalsByActivityRecipient(recipient3.id, 1, {
        sortBy: 'createdOn',
        sortDir: 'desc',
        offset: 0,
        limit: 20,
        // Only goal 9 and 11 are for reciient 3.
        goalIds: [goalIds[0], goalIds[9], goalIds[11]],
      });
      const countx = count;
      const goalRowsx = goalRows.filter((g) => g.id === goalIds[9] || g.id === goalIds[11]);
      expect(countx).toBe(2);
      expect(goalRowsx.length).toBe(2);
    });

    it('associates objectives with the proper recipients', async () => {
      const { goalRows } = await getGoalsByActivityRecipient(recipient2.id, 1, {
        sortBy: 'createdOn', sortDir: 'desc', offset: 0, limit: 10,
      });

      // eslint-disable-next-line max-len
      const objectives = goalRows.reduce((previous, current) => ([...previous, ...current.objectives]), []);
      const titles = objectives.map((objective) => objective.title);

      expect(titles).not.toContain(NEEDLE);

      const { goalRows: moreGoalRows } = await getGoalsByActivityRecipient(recipient3.id, 1, {
        sortBy: 'createdOn', sortDir: 'desc', offset: 0, limit: 10,
      });

      // eslint-disable-next-line max-len
      const moreObjectives = moreGoalRows.reduce((previous, current) => ([...previous, ...current.objectives]), []);
      const moreTitles = moreObjectives.map((objective) => objective.title);

      expect(moreTitles).toContain(NEEDLE);
    });

    it('retreives goals created from curated templates', async () => {
      const { goalRows } = await getGoalsByActivityRecipient(recipient4.id, 1, {
        sortBy: 'createdOn', sortDir: 'desc', offset: 0, limit: 10,
      });

      const curatedGoal = goalRows.find((goal) => goal.goalText === 'This is a goal created from a curated template');
      expect(curatedGoal).toBeDefined();

      expect(goalRows.length).toBe(1);
    });
  });
});
