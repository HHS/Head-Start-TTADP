import { Op } from 'sequelize';
import { createReport, destroyReport } from '../../testUtils';
import filtersToScopes from '../index';
import {
  Goal, Objective, ActivityReportObjectives,
} from '../../models';

let emptyReport;
let reportWithReasons;
let reportWithTopics;
let goals;
let objectives;
let possibleIds;

describe('recipientFiltersToScopes', () => {
  beforeAll(async () => {
    emptyReport = await createReport({
      calculatedStatus: 'approved',
      reasons: [],
      topics: [],
    });

    reportWithReasons = await createReport({
      calculatedStatus: 'approved',
      reasons: ['Full Enrollment'],
      topics: ['CLASS: Emotional Support'],
    });
    reportWithTopics = await createReport({
      calculatedStatus: 'approved',
      reasons: ['Complaint'],
      topics: ['Behavioral / Mental Health / Trauma'],
    });
    goals = await Promise.all(
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
    objectives = await Promise.all(
      [
        // goal for reasons
        await Objective.create({
          goalId: goals[0],
          title: 'objective 1',
          ttaProvided: 'asdfadf',
          status: 'Not Started',
        }),
        // goal for topics
        await Objective.create({
          goalId: goals[1],
          title: 'objective 2',
          ttaProvided: 'asdfadf',
          status: 'Not Started',

        }),
        // goal for status
        await Objective.create({
          goalId: goals[2],
          title: 'objective 3',
          ttaProvided: 'asdfadf',
          status: 'Not Started',
        }),
        // goal for startDate
        await Objective.create({
          goalId: goals[3],
          title: 'objective 4',
          ttaProvided: 'asdfadf',
          status: 'Not Started',
        }),
      ],
    );

    await Promise.all(
      [
        // goal for reasons
        await ActivityReportObjectives.create({
          objectiveId: objectives[0],
          reportId: reportWithReasons.id,
        }),
        // goal for topics
        await ActivityReportObjectives.create({
          objectiveId: objectives[1],
          reportId: reportWithTopics.id,
        }),
        // goal for status
        await ActivityReportObjectives.create({
          objectiveId: objectives[2],
          reportId: emptyReport.id,
        }),
        // goal for startDate
        await ActivityReportObjectives.create({
          objectiveId: objectives[3],
          reportId: emptyReport.id,
        }),
      ],
    );

    possibleIds = goals.map((g) => g.id);
  });

  afterAll(async () => {
    await ActivityReportObjectives.destroy({
      where: {
        reportId: [
          emptyReport.id,
          reportWithTopics.id,
          reportWithReasons.id,
        ],
      },
    });

    await Objective.destroy({
      where: {
        id: objectives.map((o) => o.id),
      },
    });

    await Goal.destroy({
      where: {
        id: possibleIds,
      },
    });

    await destroyReport(emptyReport);
    await destroyReport(reportWithReasons);
    await destroyReport(reportWithTopics);
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
              id: possibleIds,
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
              id: possibleIds,
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
              id: possibleIds,
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
              id: possibleIds,
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
              id: possibleIds,
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
              id: possibleIds,
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
            {
              id: possibleIds,
            },
          ],
        },
      });

      expect(found.length).toBe(3);
      expect(found.map((g) => g.name)).not.toContain('Goal 1');
    });
  });

  describe('topics', () => {
    it('filters in by topics', async () => {
      const filters = { 'topic.in': 'CLASS: Emotional Support' };
      const scope = filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 2');
    });
    it('filters out by topics', async () => {
      const filters = { 'topic.nin': 'CLASS: Emotional Support' };
      const scope = filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleIds,
            },
          ],
        },
      });

      expect(found.length).toBe(3);
      expect(found.map((g) => g.name)).not.toContain('Goal 2');
    });
  });
});
