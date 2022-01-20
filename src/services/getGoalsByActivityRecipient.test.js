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
import filtersToScopes from '../scopes';
import { REPORT_STATUSES } from '../constants';

describe('Goals by Recipient Test', () => {
  const recipient = {
    id: 300,
    name: 'Recipient with Goals',
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
    reason: ['reason'],
    participants: ['participants'],
    topics: ['topics'],
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
    reason: ['reason'],
    participants: ['participants'],
    topics: ['topics'],
    ttaType: ['type'],
  };

  let objectiveIds = [];
  let goalIds = [];

  function regionToScope(regionId) {
    const query = { 'region.in': [regionId] };
    return filtersToScopes(query, 'grant');
  }

  beforeAll(async () => {
    // Create User.
    await User.create(mockGoalUser);

    // Create Recipient.
    await Recipient.create(recipient);

    // Create Grants.
    const savedGrant1 = await Grant.create(grant1);
    const savedGrant2 = await Grant.create(grant2);

    // Create Reports.
    const savedGoalReport1 = await ActivityReport.create(goalReport1);
    const savedGoalReport2 = await ActivityReport.create(goalReport2);

    // Create AR Recipients.
    await ActivityRecipient.create({
      activityReportId: savedGoalReport1.id,
      grantId: savedGrant1.id,
    });

    await ActivityRecipient.create({
      activityReportId: savedGoalReport2.id,
      grantId: savedGrant2.id,
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
          status: 'Not Started',
        }),
        // objective 4 (AR1)
        await Objective.create({
          goalId: goals[2].id,
          title: 'objective 4',
          ttaProvided: 'Objective for Goal 3 b',
          status: 'Not Started',
        }),
        // objective 5 (AR2)
        await Objective.create({
          goalId: goals[3].id,
          title: 'objective 5',
          ttaProvided: 'Objective for Goal 4',
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
      ],
    );
  });

  afterAll(async () => {
    /*
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
    const grantGoalsToDelete = await GrantGoal.findAll({ where: { recipientId: 300 } });
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
    await Grant.destroy({ where: { id: [300, 301] } });
    await Recipient.destroy({ where: { id: 300 } });
    await User.destroy({ where: { id: mockGoalUser.id } });
*/
    // Close SQL Connection.
    await sequelize.close();
  });

  describe('Retrieves All Goals', () => {
    it('Retrieves Goals by Recipient', async () => {
      const { count, rows } = await getGoalsByActivityRecipient(300, {
        sortBy: 'createdAt', sortDir: 'desc', offset: 0, limit: 2, 'region.in': ['1'],
      });

      //console.log('\n\n\n\n\nROWS', count, rows[0].grants[0].goals[0].name);
      console.log('\n\n\n\n\nROW123S', count, rows[0].grants[0].activityRecipients[0].ActivityReport.objectives);
      expect(true).toBe(false);
    });
  });
});
