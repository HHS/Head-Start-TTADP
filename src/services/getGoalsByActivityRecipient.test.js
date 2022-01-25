import {
  sequelize,
  User,
  ActivityReport,
  Recipient,
  Grant,
  ActivityRecipient,
  GrantGoal,
  Goal,
  ActivityReportObjective,
  Objective,
} from '../models';

import { getGoalsByActivityRecipient } from './recipient';
// import filtersToScopes from '../scopes';
import { REPORT_STATUSES } from '../constants';

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
    submissionStatus: REPORT_STATUSES.SUBMITTED,
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
    submissionStatus: REPORT_STATUSES.SUBMITTED,
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
    submissionStatus: REPORT_STATUSES.SUBMITTED,
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

  /*
  function regionToScope(regionId) {
    const query = { 'region.in': [regionId] };
    return filtersToScopes(query, 'grant');
  }
  */

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

    // Create Goals.
    const goals = await Promise.all(
      [
        // goal 1 (AR1)
        await Goal.create({
          name: 'Goal 1',
          status: null,
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-10'),
        }),
        // goal 2 (AR1)
        await Goal.create({
          name: 'Goal 2',
          status: 'Not Started',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-03-15'),
        }),
        // goal 3 (AR1)
        await Goal.create({
          name: 'Goal 3',
          status: 'Active',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-07-03'),
        }),
        // goal 4 (AR2)
        await Goal.create({
          name: 'Goal 4',
          status: 'Active',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
        }),
        // goal 5 (AR3 Exclude)
        await Goal.create({
          name: 'Goal 5',
          status: 'Active',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
        }),
      ],
    );

    // Get Goal Ids for Delete.
    goalIds = goals.map((o) => o.id);

    // Grant Goals.
    await Promise.all(
      [
        // grant goal 1 (AR1)
        await GrantGoal.create({
          recipientId: 300,
          grantId: 300,
          goalId: goals[0].id,
        }),
        // grant goal 2 (AR1)
        await GrantGoal.create({
          recipientId: 300,
          grantId: 300,
          goalId: goals[1].id,
        }),
        // grant goal 3 (AR1)
        await GrantGoal.create({
          recipientId: 300,
          grantId: 300,
          goalId: goals[2].id,
        }),
        // grant goal 4 (AR2)
        await GrantGoal.create({
          recipientId: 300,
          grantId: 301,
          goalId: goals[3].id,
        }),
        // grant goal 5 (AR3 Exclude)
        await GrantGoal.create({
          recipientId: 301,
          grantId: 302,
          goalId: goals[4].id,
        }),
      ],
    );

    // Crete Objectives.
    const objectives = await Promise.all(
      [
        // objective 1 (AR1)
        await Objective.create({
          goalId: goals[0].id,
          title: 'objective 1',
          ttaProvided: 'Objective for Goal 1',
          status: 'Not Started',
        }),
        // objective 2 (AR1)
        await Objective.create({
          goalId: goals[1].id,
          title: 'objective 2',
          ttaProvided: 'Objective for Goal 2',
          status: 'Not Started',
        }),
        // objective 3 (AR1)
        await Objective.create({
          goalId: goals[2].id,
          title: 'objective 3',
          ttaProvided: 'Objective for Goal 3',
          status: 'In Progress',
        }),
        // objective 4 (AR1)
        await Objective.create({
          goalId: goals[2].id,
          title: 'objective 4',
          ttaProvided: 'Objective for Goal 3 b',
          status: 'Completed',
        }),
        // objective 5 (AR2)
        await Objective.create({
          goalId: goals[3].id,
          title: 'objective 5',
          ttaProvided: 'Objective for Goal 4',
          status: 'Not Started',
        }),
        // objective 6 (AR3)
        await Objective.create({
          goalId: goals[4].id,
          title: 'objective 6',
          ttaProvided: 'Objective for Goal 5 Exclude',
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
        await ActivityReportObjective.create({
          objectiveId: objectives[0].id,
          activityReportId: savedGoalReport1.id,
        }),
        // AR 1 Obj 2.
        await ActivityReportObjective.create({
          objectiveId: objectives[1].id,
          activityReportId: savedGoalReport1.id,
        }),
        // AR 1 Obj 3.
        await ActivityReportObjective.create({
          objectiveId: objectives[2].id,
          activityReportId: savedGoalReport1.id,
        }),
        // AR 1 Obj 4.
        await ActivityReportObjective.create({
          objectiveId: objectives[3].id,
          activityReportId: savedGoalReport1.id,
        }),
        // AR 2 Obj 5.
        await ActivityReportObjective.create({
          objectiveId: objectives[4].id,
          activityReportId: savedGoalReport2.id,
        }),
        // AR 3 Obj 6 (Exclude).
        await ActivityReportObjective.create({
          objectiveId: objectives[5].id,
          activityReportId: savedGoalReport3.id,
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

    // Delete Grant Goals.
    const grantGoalsToDelete = await GrantGoal.findAll({ where: { recipientId: [300, 301] } });
    const grantGoalIdsToDelete = grantGoalsToDelete.map((grantGoal) => grantGoal.id);
    await GrantGoal.destroy({ where: { id: grantGoalIdsToDelete } });

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
    it('Retrieves Goals by Recipient', async () => {
      const { count, goalRows } = await getGoalsByActivityRecipient(300, {
        sortBy: 'createdOn', sortDir: 'desc', offset: 0, limit: 10, 'region.in': ['1'],
      });

      expect(count).toBe(4);
      expect(goalRows.length).toBe(4);

      // Goal 3.
      expect(goalRows[0].goalText).toBe('Goal 3');
      expect(goalRows[0].goalNumber).toBe(`R1-G-${goalRows[0].id}`);
      expect(goalRows[0].objectiveCount).toBe(2);
      expect(goalRows[0].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRows[0].goalTopics).toEqual(['Learning Environments', 'Nutrition', 'Physical Health and Screenings']);

      // Goal 3 Objectives.
      expect(goalRows[0].objectives.length).toBe(2);
      expect(goalRows[0].objectives[0].title).toBe('objective 3');
      expect(goalRows[0].objectives[0].ttaProvided).toBe('Objective for Goal 3');
      expect(goalRows[0].objectives[0].endDate).toBe('09/01/2020');
      expect(goalRows[0].objectives[0].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRows[0].objectives[0].status).toEqual('In Progress');

      expect(goalRows[0].objectives.length).toBe(2);
      expect(goalRows[0].objectives[1].title).toBe('objective 4');
      expect(goalRows[0].objectives[1].ttaProvided).toBe('Objective for Goal 3 b');
      expect(goalRows[0].objectives[1].endDate).toBe('09/01/2020');
      expect(goalRows[0].objectives[1].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRows[0].objectives[1].status).toEqual('Completed');

      // Goal 2.
      expect(goalRows[1].goalText).toBe('Goal 2');
      expect(goalRows[1].goalNumber).toBe(`R1-G-${goalRows[1].id}`);
      expect(goalRows[1].objectiveCount).toBe(1);
      expect(goalRows[1].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRows[1].goalTopics).toEqual(['Learning Environments', 'Nutrition', 'Physical Health and Screenings']);
      expect(goalRows[1].objectives.length).toBe(1);

      // Goal 1.
      expect(goalRows[2].goalText).toBe('Goal 1');
      expect(goalRows[2].goalNumber).toBe(`R1-G-${goalRows[2].id}`);
      expect(goalRows[2].objectiveCount).toBe(1);
      expect(goalRows[2].reasons).toEqual(['COVID-19 response', 'Complaint']);
      expect(goalRows[2].goalTopics).toEqual(['Learning Environments', 'Nutrition', 'Physical Health and Screenings']);
      expect(goalRows[2].objectives.length).toBe(1);

      // Goal 4.
      expect(goalRows[3].goalText).toBe('Goal 4');
      expect(goalRows[3].goalNumber).toBe(`R1-G-${goalRows[3].id}`);
      expect(goalRows[3].objectiveCount).toBe(1);
      expect(goalRows[3].reasons).toEqual(['Monitoring | Area of Concern', 'New Director or Management', 'New Program Option']);
      expect(goalRows[3].goalTopics).toEqual(['Child Assessment, Development, Screening', 'Communication']);
      expect(goalRows[3].objectives.length).toBe(1);
    });
  });
});
