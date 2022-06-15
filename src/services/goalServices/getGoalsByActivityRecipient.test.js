import moment from 'moment';
import {
  sequelize,
  User,
  ActivityReport,
  Recipient,
  Grant,
  ActivityRecipient,
  // GrantGoal,
  // GoalTemplate,
  Goal,
  ActivityReportObjective,
  // ObjectiveTemplate,
  Objective,
} from '../../models';

import { getGoalsByActivityRecipient } from '../recipient';
import { REPORT_STATUSES } from '../../constants';
import { auditLogger } from '../../logger';

describe('Goals by Recipient Test', () => {
  const recipient = {
    id: 300,
    name: 'Recipient with Goals',
  };

  const recipient2 = {
    id: 301,
    name: 'Recipient 2 with Goals',
  };

  const grant1 = {
    id: 300,
    recipientId: 300,
    regionId: 1,
    number: '12345',
    programSpecialistName: 'George',
    status: 'Active',
    endDate: new Date(2020, 10, 2),
    grantSpecialistName: 'Glen',
  };

  const grant2 = {
    id: 301,
    recipientId: 300,
    regionId: 1,
    number: '12346',
    programSpecialistName: 'Joe',
    status: 'Active',
    endDate: new Date(2020, 10, 2),
    grantSpecialistName: 'Glen',
  };

  const grant3 = {
    id: 302,
    recipientId: 301,
    regionId: 1,
    number: '12334',
    programSpecialistName: 'Joe',
    status: 'Active',
    endDate: new Date(2020, 10, 2),
    grantSpecialistName: 'Glen',
  };

  const mockGoalUser = {
    id: 42352636,
    homeRegionId: 1,
    name: 'user42352636',
    hsesUsername: 'user42352636',
    hsesUserId: 'user42352636',
  };

  const goalReport1 = {
    activityRecipientType: 'recipient',
    userId: mockGoalUser.id,
    regionId: 1,
    lastUpdatedById: mockGoalUser.id,
    ECLKCResourcesUsed: ['test'],
    activityRecipients: [{ grantId: 300 }],
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
  };

  const goalReport2 = {
    activityRecipientType: 'recipient',
    userId: mockGoalUser.id,
    regionId: 1,
    lastUpdatedById: mockGoalUser.id,
    ECLKCResourcesUsed: ['test'],
    activityRecipients: [{ grantId: 301 }],
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
    topics: ['Child Assessment, Development, Screening', 'Communication'],
    ttaType: ['type'],
  };

  const goalReport3 = {
    activityRecipientType: 'recipient',
    userId: mockGoalUser.id,
    regionId: 1,
    lastUpdatedById: mockGoalUser.id,
    ECLKCResourcesUsed: ['test'],
    activityRecipients: [{ grantId: 302 }],
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
    topics: ['Child Assessment, Development, Screening', 'Communication'],
    ttaType: ['type'],
  };

  let objectiveIds = [];
  let goalIds = [];

  beforeAll(async () => {
    // Create User.
    await User.create(mockGoalUser);

    // Create Recipient.
    await Recipient.create(recipient);
    await Recipient.create(recipient2);

    // Create Grants.
    const savedGrant1 = await Grant.create(grant1);
    const savedGrant2 = await Grant.create(grant2);
    const savedGrant3 = await Grant.create(grant3);

    // Create Reports.
    const savedGoalReport1 = await ActivityReport.create(goalReport1);
    const savedGoalReport2 = await ActivityReport.create(goalReport2);
    const savedGoalReport3 = await ActivityReport.create(goalReport3);
    const savedGoalReport4 = await ActivityReport.create(
      {
        ...goalReport1,
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
      },
    );

    // Create AR Recipients.
    try {
      await ActivityRecipient.create({
        activityReportId: savedGoalReport1.id,
        grantId: savedGrant1.id,
      });
    } catch (error) {
      auditLogger.error(JSON.stringify(error));
      throw error;
    }
    try {
      await ActivityRecipient.create({
        activityReportId: savedGoalReport2.id,
        grantId: savedGrant2.id,
      });
    } catch (error) {
      auditLogger.error(JSON.stringify(error));
      throw error;
    }
    try {
      await ActivityRecipient.create({
        activityReportId: savedGoalReport3.id,
        grantId: savedGrant3.id,
      });
    } catch (error) {
      auditLogger.error(JSON.stringify(error));
      throw error;
    }
    try {
      await ActivityRecipient.create({
        activityReportId: savedGoalReport4.id,
        grantId: savedGrant3.id,
      });
    } catch (error) {
      auditLogger.error(JSON.stringify(error));
      throw error;
    }

    // Create Goals.
    let goals = [];
    try {
      goals = await Promise.all(
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
          Goal.create({
            name: 'Goal not on report, no objective',
            status: 'Closed',
            timeframe: '12 months',
            isFromSmartsheetTtaPlan: false,
            grantId: 300,
            createdAt: '2021-01-10T19:16:15.842Z',
            onApprovedAR: true,
          }),
          Goal.create({
            name: 'Goal not on report, with objective',
            status: 'Closed',
            timeframe: '12 months',
            isFromSmartsheetTtaPlan: false,
            grantId: 300,
            createdAt: '2021-01-10T19:16:15.842Z',
            onApprovedAR: true,
          }),
          // goal 6 (AR4)
          Goal.create({
            name: 'Goal on Draft report',
            status: '',
            timeframe: '1 month',
            isFromSmartsheetTtaPlan: false,
            grantId: 300,
            createdAt: '2021-01-10T19:16:15.842Z',
            onApprovedAR: false,

          }),
        ],
      );
    } catch (err) {
      auditLogger.error(err);
      throw (err);
    }

    // Get Goal Ids for Delete.
    goalIds = goals.map((o) => o.id);

    // Crete Objectives.
    const objectives = await Promise.all(
      [
        // objective 1 (AR1)
        Objective.create({
          goalId: goalIds[0],
          title: 'objective 1',
          status: 'Not Started',
        }),
        // objective 2 (AR1)
        Objective.create({
          goalId: goalIds[1],
          title: 'objective 2',
          status: 'Not Started',
        }),
        // objective 3 (AR1)
        Objective.create({
          goalId: goalIds[2],
          title: 'objective 3',
          status: 'In Progress',
        }),
        // objective 4 (AR1)
        Objective.create({
          goalId: goalIds[2],
          title: 'objective 4',
          status: 'Completed',
        }),
        // objective 5 (AR2)
        Objective.create({
          goalId: goalIds[3],
          title: 'objective 5',
          status: 'Not Started',
        }),
        // objective 6 (AR3)
        Objective.create({
          goalId: goalIds[4],
          title: 'objective 6',
          status: 'Not Started',
        }),
        // objective 7
        Objective.create({
          goalId: goalIds[6],
          title: 'objective 7',
          status: 'Not Started',
        }),
        // objective 8
        Objective.create({
          goalId: goalIds[7],
          title: 'objective 8',
          status: 'Not Started',
        }),
      ],
    );

    // Get Objective Ids for Delete.
    objectiveIds = objectives.map((o) => o.id);

    // AR Objectives.
    await Promise.all(
      [
        // AR 1 Obj 1.
        ActivityReportObjective.create({
          objectiveId: objectives[0].id,
          activityReportId: savedGoalReport1.id,
          ttaProvided: 'Objective for Goal 1',
        }),
        // AR 1 Obj 2.
        ActivityReportObjective.create({
          objectiveId: objectives[1].id,
          activityReportId: savedGoalReport1.id,
          ttaProvided: 'Objective for Goal 2',
        }),
        // AR 1 Obj 3.
        ActivityReportObjective.create({
          objectiveId: objectives[2].id,
          activityReportId: savedGoalReport1.id,
          ttaProvided: 'Objective for Goal 3',
        }),
        // AR 1 Obj 4.
        ActivityReportObjective.create({
          objectiveId: objectives[3].id,
          activityReportId: savedGoalReport1.id,
          ttaProvided: 'Objective for Goal 3 b',
        }),
        // AR 2 Obj 5.
        ActivityReportObjective.create({
          objectiveId: objectives[4].id,
          activityReportId: savedGoalReport2.id,
          ttaProvided: 'Objective for Goal 4',
        }),
        // AR 3 Obj 6 (Exclude).
        ActivityReportObjective.create({
          objectiveId: objectives[5].id,
          activityReportId: savedGoalReport3.id,
          ttaProvided: 'Objective for Goal 5 Exclude',
        }),
        // AR 4 Draft Obj 8 (Exclude).
        ActivityReportObjective.create({
          objectiveId: objectives[7].id,
          activityReportId: savedGoalReport4.id,
          ttaProvided: 'Objective for Goal 6 Draft report Exclude',
        }),
      ],
    );
  });

  afterAll(async () => {
    // Get Report Ids.
    const reportsToDelete = await ActivityReport.findAll({ where: { userId: mockGoalUser.id } });
    const reportIdsToDelete = reportsToDelete.map((report) => report.id);

    // Delete AR Objectives.
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: reportIdsToDelete,
      },
    });

    // Delete Objectives.
    await Objective.destroy({
      where: {
        id: objectiveIds,
      },
    });

    // Delete Goals.
    await Goal.destroy({
      where: {
        id: goalIds,
      },
    });

    // Delete AR and AR Recipient.
    await ActivityRecipient.destroy({ where: { activityReportId: reportIdsToDelete } });
    await ActivityReport.destroy({ where: { id: reportIdsToDelete } });

    // Delete Recipient, Grant, User.
    await Grant.destroy({ where: { id: [300, 301, 302] } });
    await Recipient.destroy({ where: { id: [300, 301] } });
    await User.destroy({ where: { id: mockGoalUser.id } });

    // Close SQL Connection.
    await sequelize.close();
  });

  describe('Retrieves All Goals', () => {
    it('Uses default sorting', async () => {
      const { goalRows } = await getGoalsByActivityRecipient(300, 1, { sortDir: 'asc' });
      expect(goalRows[0].goalText).toBe('Goal 1');
    });

    it('honors offset', async () => {
      const { goalRows } = await getGoalsByActivityRecipient(300, 1, { offset: 1, sortDir: 'asc' });
      expect(goalRows[0].goalText).toBe('Goal 2');
    });

    it('honors limit', async () => {
      const { goalRows } = await getGoalsByActivityRecipient(300, 1, { limit: 1 });
      expect(goalRows.length).toBe(1);
    });

    it('Retrieves Goals by Recipient', async () => {
      let countx;
      let goalRowsx;
      try {
        const { count, goalRows } = await getGoalsByActivityRecipient(300, 1, {
          sortBy: 'createdOn', sortDir: 'desc', offset: 0, limit: 10,
        });
        countx = count;
        goalRowsx = goalRows;
      } catch (err) {
        auditLogger.info(JSON.stringify(err));
        throw err;
      }

      expect(countx).toBe(6);
      expect(goalRowsx.length).toBe(6);

      // Goal 4.
      expect(moment(goalRowsx[0].createdOn).format('YYYY-MM-DD')).toBe('2021-04-02');
      expect(goalRowsx[0].goalText).toBe('Goal 4');
      expect(goalRowsx[0].goalNumber).toBe(`G-${goalRowsx[0].id}`);
      expect(goalRowsx[0].objectiveCount).toBe(1);
      expect(goalRowsx[0].reasons).toEqual(['Monitoring | Area of Concern', 'New Director or Management', 'New Program Option']);
      expect(goalRowsx[0].goalTopics).toEqual(['Child Assessment, Development, Screening', 'Communication']);
      expect(goalRowsx[0].objectives.length).toBe(1);

      // Goal 3.
      expect(moment(goalRowsx[1].createdOn).format('YYYY-MM-DD')).toBe('2021-03-03');
      expect(goalRowsx[1].goalText).toBe('Goal 3');
      expect(goalRowsx[1].goalNumber).toBe(`G-${goalRowsx[1].id}`);
      expect(goalRowsx[1].objectiveCount).toBe(2);
      expect(goalRowsx[1].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRowsx[1].goalTopics).toEqual(['Learning Environments', 'Nutrition', 'Physical Health and Screenings']);

      // Goal 3 Objectives.
      expect(goalRowsx[1].objectives.length).toBe(2);
      expect(goalRowsx[1].objectives[0].title).toBe('objective 4');
      expect(goalRowsx[1].objectives[0].activityReportObjectives[0].ttaProvided).toBe('Objective for Goal 3 b');
      expect(goalRowsx[1].objectives[0].endDate).toBe('09/01/2020');
      expect(goalRowsx[1].objectives[0].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRowsx[1].objectives[0].status).toEqual('Completed');

      expect(goalRowsx[1].objectives[1].title).toBe('objective 3');
      expect(goalRowsx[1].objectives[1].activityReportObjectives[0].ttaProvided).toBe('Objective for Goal 3');
      expect(goalRowsx[1].objectives[1].endDate).toBe('09/01/2020');
      expect(goalRowsx[1].objectives[1].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRowsx[1].objectives[1].status).toEqual('In Progress');

      // Goal 2.
      expect(moment(goalRowsx[2].createdOn).format('YYYY-MM-DD')).toBe('2021-02-15');
      expect(goalRowsx[2].goalText).toBe('Goal 2');
      expect(goalRowsx[2].goalNumber).toBe(`G-${goalRowsx[2].id}`);
      expect(goalRowsx[2].objectiveCount).toBe(1);
      expect(goalRowsx[2].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRowsx[2].goalTopics).toEqual(['Learning Environments', 'Nutrition', 'Physical Health and Screenings']);
      expect(goalRowsx[2].objectives.length).toBe(1);

      // Goal 1.
      expect(moment(goalRowsx[3].createdOn).format('YYYY-MM-DD')).toBe('2021-01-10');
      expect(goalRowsx[3].goalText).toBe('Goal 1');
      expect(goalRowsx[3].goalNumber).toBe(`G-${goalRowsx[3].id}`);
      expect(goalRowsx[3].objectiveCount).toBe(1);
      expect(goalRowsx[3].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRowsx[3].goalTopics).toEqual(['Learning Environments', 'Nutrition', 'Physical Health and Screenings']);
      expect(goalRowsx[3].objectives.length).toBe(1);
    });
  });
});
