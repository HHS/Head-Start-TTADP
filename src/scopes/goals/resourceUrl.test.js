import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import { createReport, destroyReport, createGoal } from '../../testUtils';
import filtersToScopes from '../index';
import {
  Goal,
  Objective,
  ActivityReportObjective,
  Resource,
  ActivityReportGoal,
  ActivityReportGoalResource,
  ActivityReportObjectiveResource,
  ActivityReportResource,
  NextStep,
  NextStepResource,
} from '../../models';

describe('goal filtersToScopes', () => {
  describe('resourceUrl', () => {
    let reportToInclude;
    let reportToExclude;

    let goalToInclude;
    let goalToExclude;

    const arResourceUrl = faker.internet.url();
    const argResourceUrl = faker.internet.url();
    const aroResourceUrl = faker.internet.url();
    const nsResourceUrl = faker.internet.url();

    let reports = [];
    let goals = [];
    let goalIds = [];
    let resources = [];

    beforeAll(async () => {
      reportToInclude = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });

      goalToInclude = await createGoal({
        status: 'Closed',
      });

      const argToInclude = await ActivityReportGoal.create({
        activityReportId: reportToInclude.id,
        goalId: goalToInclude.id,
        name: goalToInclude.name,
        status: goalToInclude.status,
      });

      const arResource = await Resource.create({
        url: arResourceUrl,
      });

      const argResource = await Resource.create({
        url: argResourceUrl,
      });

      const aroResource = await Resource.create({
        url: aroResourceUrl,
      });

      const nsResource = await Resource.create({
        url: nsResourceUrl,
      });

      await ActivityReportResource.create({
        activityReportId: reportToInclude.id,
        resourceId: arResource.id,
      });

      await ActivityReportGoalResource.create({
        activityReportGoalId: argToInclude.id,
        resourceId: argResource.id,
      });

      const objectiveToInclude = await Objective.create({
        title: faker.lorem.paragraph(),
        goalId: goalToInclude.id,
        ttaProvided: '',
      });

      const aroToInclude = await ActivityReportObjective.create({
        activityReportId: reportToInclude.id,
        objectiveId: objectiveToInclude.id,
      });

      await ActivityReportObjectiveResource.create({
        activityReportObjectiveId: aroToInclude.id,
        resourceId: aroResource.id,
      });

      const nsToInclude = await NextStep.create({
        activityReportId: reportToInclude.id,
        note: faker.lorem.sentence(),
        noteType: 'RECIPIENT',
      });

      await NextStepResource.create({
        nextStepId: nsToInclude.id,
        resourceId: nsResource.id,
      });

      reportToExclude = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });

      goalToExclude = await createGoal({
        status: 'Closed',
      });

      const argToExclude = await ActivityReportGoal.create({
        activityReportId: reportToExclude.id,
        goalId: goalToExclude.id,
        name: goalToExclude.name,
        status: goalToExclude.status,
      });

      const arResourceExcluded = await Resource.create({
        url: faker.internet.url(),
      });

      const argResourceExcluded = await Resource.create({
        url: faker.internet.url(),
      });

      const aroResourceExcluded = await Resource.create({
        url: faker.internet.url(),
      });

      const nsResourceExcluded = await Resource.create({
        url: faker.internet.url(),
      });

      await ActivityReportResource.create({
        activityReportId: reportToExclude.id,
        resourceId: arResourceExcluded.id,
      });

      await ActivityReportGoalResource.create({
        activityReportGoalId: argToExclude.id,
        resourceId: argResourceExcluded.id,
      });

      const objectiveToExclude = await Objective.create({
        title: faker.lorem.paragraph(),
        goalId: goalToExclude.id,
        ttaProvided: '',
      });

      const aroToExclude = await ActivityReportObjective.create({
        activityReportId: reportToExclude.id,
        objectiveId: objectiveToExclude.id,
      });

      await ActivityReportObjectiveResource.create({
        activityReportObjectiveId: aroToExclude.id,
        resourceId: aroResourceExcluded.id,
      });

      const nsToExclude = await NextStep.create({
        activityReportId: reportToExclude.id,
        note: faker.lorem.sentence(),
        noteType: 'RECIPIENT',
      });

      await NextStepResource.create({
        nextStepId: nsToExclude.id,
        resourceId: nsResourceExcluded.id,
      });

      reports = [
        reportToInclude,
        reportToExclude,
      ];

      goals = [
        goalToInclude,
        goalToExclude,
      ];

      goalIds = goals.map((goal) => goal.id);

      resources = [
        arResource,
        argResource,
        aroResource,
        nsResource,
        arResourceExcluded,
        argResourceExcluded,
        aroResourceExcluded,
        nsResourceExcluded,
      ];
    });

    afterAll(async () => {
      await ActivityReportResource.destroy({
        where: {
          resourceId: resources.map((r) => r.id),
        },
      });

      await ActivityReportGoalResource.destroy({
        where: {
          resourceId: resources.map((r) => r.id),
        },
      });

      await ActivityReportObjectiveResource.destroy({
        where: {
          resourceId: resources.map((r) => r.id),
        },
      });

      await NextStepResource.destroy({
        where: {
          resourceId: resources.map((r) => r.id),
        },
      });

      await Resource.destroy({
        where: {
          id: resources.map((r) => r.id),
        },
      });

      const o = await Objective.findAll({
        where: {
          goalId: goals.map((g) => g.id),
        },
      });

      await ActivityReportObjective.destroy({
        where: {
          objectiveId: o.map((ob) => ob.id),
        },
        individualHooks: true,
      });

      await Objective.destroy({
        where: {
          id: o.map((ob) => ob.id),
        },
        individualHooks: true,
        force: true,
      });

      await ActivityReportGoal.destroy({
        where: {
          goalId: goals.map((g) => g.id),
        },
        individualHooks: true,
      });

      await Goal.destroy({
        where: {
          id: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      });

      await NextStep.destroy({
        where: {
          activityReportId: reports.map((r) => r.id),
        },
        individualHooks: true,
      });

      await Promise.all(reports.map((r) => (
        destroyReport(r)
      )));
    });

    describe('ar resource', () => {
      it('in', async () => {
        const filters = { 'resourceUrl.ctn': arResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceUrl.nctn': arResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });

    describe('arg resource', () => {
      it('in', async () => {
        const filters = { 'resourceUrl.ctn': argResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceUrl.nctn': argResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });

    describe('aro resource', () => {
      it('in', async () => {
        const filters = { 'resourceUrl.ctn': aroResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceUrl.nctn': aroResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });
    describe('ns resource', () => {
      it('in', async () => {
        const filters = { 'resourceUrl.ctn': nsResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceUrl.nctn': nsResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });
  });
});
