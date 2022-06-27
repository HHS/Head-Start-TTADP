import { Op } from 'sequelize';
import {
  createReport, destroyReport, createGoal, createGrant,
} from '../../testUtils';
import filtersToScopes from '../index';
import db, {
  Goal,
  Objective,
  ActivityReportObjective,
  Recipient,
  ObjectiveTopic,
  Topic,
  Grant,
  ActivityReportGoal,
} from '../../models';

const REGION_ID = 10;

describe('goal filtersToScopes', () => {
  let reportIds;
  let objectiveIds = [];
  let possibleGoalIds = [];
  let emptyReport;
  let reportWithReasons;
  let reportWithTopics;
  let grant;
  let topicsGrant;
  let reasonsGrant;
  let otherGrant;
  let goalGrant;
  let activityReportGoalIds;
  const ots = [];

  beforeAll(async () => {
    goalGrant = await createGrant();
    grant = await createGrant({ regionId: REGION_ID, number: 'BROC1234' });
    topicsGrant = await createGrant({ regionId: REGION_ID, number: 'DSWEC56R78' });
    reasonsGrant = await createGrant({ regionId: REGION_ID, number: 'JNDC532548' });
    otherGrant = await createGrant({ regionId: 11, number: 'CAUL4567' });

    emptyReport = await createReport({
      activityRecipients: [],
      calculatedStatus: 'approved',
      reason: [],
      topics: [],
      region: 15,
    });
    reportWithReasons = await createReport({
      calculatedStatus: 'approved',
      reason: ['Full Enrollment'],
      topics: ['CLASS: Emotional Support'],
      activityRecipients: [{ grantId: reasonsGrant.id }],
      region: 15,
    });
    reportWithTopics = await createReport({
      calculatedStatus: 'approved',
      reason: ['Complaint'],
      activityRecipients: [{ grantId: topicsGrant.id }],
      topics: ['Behavioral / Mental Health / Trauma'],
      region: REGION_ID,
    });

    const goals = await Promise.all(
      [
        // goal for reasons
        await Goal.create({
          name: 'Goal 1',
          status: null,
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
          grantId: reasonsGrant.id,
        }),
        // goal for topics
        await Goal.create({
          name: 'Goal 2',
          status: 'Not Started',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
          grantId: topicsGrant.id,
        }),
        // goal for status
        await Goal.create({
          name: 'Goal 3',
          status: 'In Progress',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
          grantId: goalGrant.id,
        }),
        // goal for status
        await Goal.create({
          name: 'Goal 4',
          status: null,
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
          grantId: goalGrant.id,
        }),
        // goal for startDate
        await Goal.create({
          name: 'Goal 5',
          status: 'Suspended',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-10'),
          grantId: goalGrant.id,
        }),
      ],
    );

    // Activity Report Goals.
    const activityReportGoals = await Promise.all(
      [
        ActivityReportGoal.create({
          activityReportId: reportWithReasons.id,
          goalId: goals[0].id,
        }),
        ActivityReportGoal.create({
          activityReportId: reportWithTopics.id,
          goalId: goals[1].id,
        }),
      ],
    );

    activityReportGoalIds = activityReportGoals.map((o) => o.id);

    const objectives = await Promise.all(
      [
        // goal for reasons
        await Objective.create({
          goalId: goals[0].id,
          title: 'objective 1',
          topics: [],
          status: 'Not Started',
        }),
        // goal for topics
        await Objective.create({
          goalId: goals[1].id,
          title: 'objective 2',
          topics: ['Behavioral / Mental Health / Trauma'],
          status: 'Not Started',
        }),
        // goal for status
        await Objective.create({
          goalId: goals[2].id,
          title: 'objective 3',
          status: 'Not Started',
        }),
        // goal for startDate
        await Objective.create({
          goalId: goals[3].id,
          title: 'objective 4',
          status: 'Not Started',
        }),
      ],
    );
    const [topicOne] = await Topic.findOrCreate({
      where: {
        name: 'CLASS: Emotional Support',
      },
    });

    const [topicTwo] = await Topic.findOrCreate({
      where: {
        name: 'Behavioral / Mental Health / Trauma',
      },
    });

    ots.push(await ObjectiveTopic.create({
      objectiveId: objectives[0].id,
      topicId: topicOne.id,
    }));

    ots.push(await ObjectiveTopic.create({
      objectiveId: objectives[1].id,
      topicId: topicTwo.id,
    }));

    await Promise.all(
      [
        // goal for reasons
        await ActivityReportObjective.create({
          objectiveId: objectives[0].id,
          activityReportId: reportWithReasons.id,
          grantId: reasonsGrant.id,
          ttaProvided: 'asdfadf',
        }),
        // goal for topics
        await ActivityReportObjective.create({
          objectiveId: objectives[1].id,
          activityReportId: reportWithTopics.id,
          grantId: topicsGrant.id,
          ttaProvided: 'asdfadf',
        }),
        // goal for status
        await ActivityReportObjective.create({
          objectiveId: objectives[2].id,
          activityReportId: emptyReport.id,
          ttaProvided: 'asdfadf',
        }),
        // goal for startDate
        await ActivityReportObjective.create({
          objectiveId: objectives[3].id,
          activityReportId: emptyReport.id,
          ttaProvided: 'asdfadf',
        }),
      ],
    );

    goals.push(await createGoal({ status: 'Suspended', name: 'Goal 6', grantId: grant.id }));
    goals.push(await createGoal({ status: 'Closed', name: 'Goal 7', grantId: otherGrant.id }));

    reportIds = [emptyReport.id, reportWithReasons.id, reportWithTopics.id];
    objectiveIds = objectives.map((o) => o.id);
    possibleGoalIds = goals.map((g) => g.id);
  });

  afterAll(async () => {
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await ObjectiveTopic.destroy({
      where: {
        id: ots.map((ot) => ot.id),
      },
    });

    await Objective.destroy({
      where: {
        id: objectiveIds,
      },
    });

    await ActivityReportGoal.destroy({
      where: {
        id: activityReportGoalIds,
      },
    });

    await Goal.destroy({
      where: {
        id: possibleGoalIds,
      },
    });

    await Promise.all(
      [emptyReport, reportWithReasons, reportWithTopics]
        .map(async (report) => destroyReport(report)),
    );

    await Grant.destroy({
      where: {
        id: [grant.id, otherGrant.id, topicsGrant.id, reasonsGrant.id],
      },
    });

    await Recipient.destroy({
      where: {
        id: [grant.recipientId, topicsGrant.recipientId, reasonsGrant.recipientId],
      },
    });

    await db.sequelize.close();
  });

  describe('createDate', () => {
    it('before', async () => {
      const filters = { 'createDate.bef': '2021/01/09' };
      const { goal: scope } = filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(4);
      expect(found.map((g) => g.name)).toContain('Goal 1');
      expect(found.map((g) => g.name)).toContain('Goal 2');
      expect(found.map((g) => g.name)).toContain('Goal 3');
      expect(found.map((g) => g.name)).toContain('Goal 4');
    });

    it('after', async () => {
      const filters = { 'createDate.aft': '2021/01/09' };
      const { goal: scope } = filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(3);
      expect(found.map((g) => g.name)).toContain('Goal 5');
    });

    it('within', async () => {
      const filters = { 'createDate.win': '2021/01/09-2021/01/11' };
      const { goal: scope } = filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 5');
    });
  });

  describe('status', () => {
    it('filters in by status', async () => {
      const filters = { 'status.in': ['In Progress', 'Needs status'] };
      const { goal: scope } = filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(3);
      expect(found.map((g) => g.name)).toContain('Goal 1');
      expect(found.map((g) => g.name)).toContain('Goal 3');
      expect(found.map((g) => g.name)).toContain('Goal 4');
    });
    it('filters out by status', async () => {
      const filters = { 'status.nin': ['Suspended'] };
      const { goal: scope } = filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(5);
      expect(found.map((g) => g.name)).toContain('Goal 1');
      expect(found.map((g) => g.name)).toContain('Goal 2');
      expect(found.map((g) => g.name)).toContain('Goal 3');
      expect(found.map((g) => g.name)).toContain('Goal 4');
    });
  });

  describe('reasons', () => {
    it('filters by reason', async () => {
      const filters = { 'reason.in': 'Full Enrollment' };
      const { goal: scope } = filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 1');
    });
    it('filters by reason with recipient', async () => {
      const filters = { 'reason.in': 'Full Enrollment' };
      const { goal: scope } = filtersToScopes(
        filters,
        {
          goal: {
            recipientId: reasonsGrant.recipientId,
          },
        },
      );
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 1');
    });
    it('filters out by reason', async () => {
      const filters = { 'reason.nin': 'Full Enrollment' };
      const { goal: scope } = filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleGoalIds },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found.map((g) => g.name)).not.toContain('Goal 1');
    });
    it('filters out by reason with recipient', async () => {
      const filters = { 'reason.nin': 'Full Enrollment' };
      const { goal: scope } = filtersToScopes(
        filters,
        {
          goal: {
            recipientId: reasonsGrant.recipientId,
          },
        },
      );
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleGoalIds },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found.map((g) => g.name)).not.toContain('Goal 1');
    });
  });

  describe('topics', () => {
    it('filters in by topics', async () => {
      const filters = { 'topic.in': 'Behavioral / Mental Health / Trauma' };
      const { goal: scope } = filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 2');
    });

    it('filters in by topics and recipient', async () => {
      const filters = { 'topic.in': 'Behavioral / Mental Health / Trauma' };
      const { goal: scope } = filtersToScopes(
        filters,
        {
          goal: {
            recipientId: topicsGrant.recipientId,
          },
        },
      );
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 2');
    });

    it('filters out by topics', async () => {
      const filters = { 'topic.nin': 'Behavioral / Mental Health / Trauma' };
      const { goal: scope } = filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found.map((g) => g.name)).not.toContain('Goal 2');
    });

    it('filters out by topics and recipient', async () => {
      const filters = { 'topic.nin': 'Behavioral / Mental Health / Trauma' };
      const { goal: scope } = filtersToScopes(filters, {
        goal: {
          recipientId: goalGrant.recipientId,
        },
      });
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found.map((g) => g.name)).not.toContain('Goal 2');
    });
  });

  describe('recipientId', () => {
    it('filters by recipientId', async () => {
      const filters = { 'recipientId.ctn': [grant.recipientId] };
      const { goal: scope } = filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found[0].name).toContain('Goal 6');
    });
  });

  describe('region', () => {
    it('filters by region', async () => {
      const filters = { 'region.in': [grant.regionId] };
      const { goal: scope } = filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found[0].name).toContain('Goal 1');
    });

    it('filters out by region', async () => {
      const filters = { 'region.nin': [grant.regionId] };
      const { goal: scope } = filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found[0].name).not.toContain('Goal 6');
    });
  });

  describe('grant number', () => {
    it('withGrantNumber', async () => {
      const filters = { 'grantNumber.in': otherGrant.number };
      const { goal: scope } = filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found[0].name).toContain('Goal 7');
    });

    it('withoutGrantNumber', async () => {
      const filters = { 'grantNumber.nin': otherGrant.number };
      const { goal: scope } = filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found[0].name).not.toContain('Goal 7');
    });
  });
});
