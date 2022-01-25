import { Op } from 'sequelize';
import { createReport, destroyReport } from '../../testUtils';
import filtersToScopes from '../index';
import db, {
  Goal, Objective, ActivityReportObjective,
} from '../../models';

describe('goal filtersToScopes', () => {
  let reportIds;
  let objectiveIds = [];
  let possibleGoalIds = [];
  let emptyReport;
  let reportWithReasons;
  let reportWithTopics;

  beforeAll(async () => {
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
      activityRecipients: [],
      region: 15,
    });
    reportWithTopics = await createReport({
      calculatedStatus: 'approved',
      reason: ['Complaint'],
      topics: ['Behavioral / Mental Health / Trauma'],
      activityRecipients: [],
      region: 15,
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
        }),
        // goal for topics
        await Goal.create({
          name: 'Goal 2',
          status: 'Not Started',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
        }),
        // goal for status
        await Goal.create({
          name: 'Goal 3',
          status: 'Active',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
        }),
        // goal for startDate
        await Goal.create({
          name: 'Goal 4',
          status: null,
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-10'),
        }),
      ],
    );
    const objectives = await Promise.all(
      [
        // goal for reasons
        await Objective.create({
          goalId: goals[0].id,
          title: 'objective 1',
          ttaProvided: 'asdfadf',
          status: 'Not Started',
        }),
        // goal for topics
        await Objective.create({
          goalId: goals[1].id,
          title: 'objective 2',
          ttaProvided: 'asdfadf',
          status: 'Not Started',

        }),
        // goal for status
        await Objective.create({
          goalId: goals[2].id,
          title: 'objective 3',
          ttaProvided: 'asdfadf',
          status: 'Not Started',
        }),
        // goal for startDate
        await Objective.create({
          goalId: goals[3].id,
          title: 'objective 4',
          ttaProvided: 'asdfadf',
          status: 'Not Started',
        }),
      ],
    );

    await Promise.all(
      [
        // goal for reasons
        await ActivityReportObjective.create({
          objectiveId: objectives[0].id,
          activityReportId: reportWithReasons.id,
        }),
        // goal for topics
        await ActivityReportObjective.create({
          objectiveId: objectives[1].id,
          activityReportId: reportWithTopics.id,
        }),
        // goal for status
        await ActivityReportObjective.create({
          objectiveId: objectives[2].id,
          activityReportId: emptyReport.id,
        }),
        // goal for startDate
        await ActivityReportObjective.create({
          objectiveId: objectives[3].id,
          activityReportId: emptyReport.id,
        }),
      ],
    );

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

    await Objective.destroy({
      where: {
        id: objectiveIds,
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

    await db.sequelize.close();
  });

  describe('createDate', () => {
    it('before', async () => {
      const filters = { 'createDate.bef': '2021/01/09' };
      const scope = filtersToScopes(filters, 'goal');
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
      expect(found.map((g) => g.name)).toContain('Goal 2');
      expect(found.map((g) => g.name)).toContain('Goal 3');
    });

    it('after', async () => {
      const filters = { 'createDate.aft': '2021/01/09' };
      const scope = filtersToScopes(filters, 'goal');
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
      expect(found.map((g) => g.name)).toContain('Goal 4');
    });

    it('within', async () => {
      const filters = { 'createDate.win': '2021/01/09-2021/01/11' };
      const scope = filtersToScopes(filters, 'goal');
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
      expect(found.map((g) => g.name)).toContain('Goal 4');
    });
  });

  describe('status', () => {
    it('filters in by status', async () => {
      const filters = { 'status.in': 'Active' };
      const scope = filtersToScopes(filters, 'goal');
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
      expect(found.map((g) => g.name)).toContain('Goal 3');
    });
    it('filters out by status', async () => {
      const filters = { 'status.nin': 'Active' };
      const scope = filtersToScopes(filters, 'goal');
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
      expect(found.map((g) => g.name)).toContain('Goal 2');
      expect(found.map((g) => g.name)).toContain('Goal 4');
    });
  });

  describe('reasons', () => {
    it('filters by reason', async () => {
      const filters = { 'reason.in': 'Full Enrollment' };
      const scope = filtersToScopes(filters, 'goal');
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
      const scope = filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleGoalIds },
          ],
        },
      });

      expect(found.length).toBe(3);
      expect(found.map((g) => g.name)).not.toContain('Goal 1');
    });
  });

  describe('topics', () => {
    it('filters in by topics', async () => {
      const filters = { 'topic.in': 'Behavioral / Mental Health / Trauma' };
      const scope = filtersToScopes(filters, 'goal');
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
      const scope = filtersToScopes(filters, 'goal');
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
      expect(found.map((g) => g.name)).not.toContain('Goal 2');
    });
  });
});
