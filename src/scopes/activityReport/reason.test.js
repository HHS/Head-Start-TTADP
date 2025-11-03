import {
  Op,
  filtersToScopes,
  ActivityReport,
  approvedReport,
  setupSharedTestData,
  tearDownSharedTestData,
} from './testHelpers';

describe('reason filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('reason', () => {
    let possibleIds;
    let reportOne;
    let reportTwo;
    let reportThree;
    let reportFour;

    beforeAll(async () => {
      reportOne = await ActivityReport.create({ ...approvedReport, reason: ['School Readiness Goals', 'Child Incident'] });
      reportTwo = await ActivityReport.create({ ...approvedReport, reason: ['School Readiness Goals', 'Ongoing Quality Improvement'] });
      reportThree = await ActivityReport.create({ ...approvedReport, reason: ['COVID-19 response'] });
      reportFour = await ActivityReport.create({ ...approvedReport, reason: [] });

      possibleIds = [
        reportOne.id,
        reportTwo.id,
        reportThree.id,
        reportFour.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: {
          id: possibleIds,
        },
      });
    });

    it('returns reports with a specific reason', async () => {
      const filters = { 'reason.in': ['School Readiness Goals'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(2);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportOne.id, reportTwo.id]));
    });

    it('returns reports without a specific reason', async () => {
      const filters = { 'reason.nin': ['School Readiness Goals'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportThree.id, reportFour.id]));
    });

    it('only searches by allowed reasons', async () => {
      const filters = { 'reason.in': ['Pesky the Clown'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(4);
    });
  });
});
