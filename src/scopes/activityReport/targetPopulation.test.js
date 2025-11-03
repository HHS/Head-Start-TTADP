import {
  Op,
  filtersToScopes,
  ActivityReport,
  submittedReport,
  setupSharedTestData,
  tearDownSharedTestData,
} from './testHelpers';

describe('target population filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('target population', () => {
    let reportOne;
    let reportTwo;
    let reportThree;
    let reportFour;
    let possibleIds;

    beforeAll(async () => {
      reportOne = await ActivityReport.create(submittedReport);
      reportTwo = await ActivityReport.create({
        ...submittedReport,
        targetPopulations: ['Infants and Toddlers (ages birth to 3)'],
      });
      reportThree = await ActivityReport.create({
        ...submittedReport,
        targetPopulations: ['Dual-Language Learners'],
      });
      reportFour = await ActivityReport.create({
        ...submittedReport,
        targetPopulations: [],
      });

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

    it('filters by reports containing said population', async () => {
      const filters = { 'targetPopulations.in': ['Infants and Toddlers (ages birth to 3)'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportTwo.id]));
    });

    it('filters out the appropriate population', async () => {
      const filters = { 'targetPopulations.nin': ['Infants and Toddlers (ages birth to 3)'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportThree.id, reportFour.id]));
    });

    it('only filters by possible population values', async () => {
      const filters = { 'targetPopulations.in': ['(DROP SCHEMA public CASCADE)', 'Infants and Toddlers (ages birth to 3)'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportTwo.id]));
    });

    it('filters out bad population values', async () => {
      const filters = { 'targetPopulations.in': ['(DROP SCHEMA public CASCADE)'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(4);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining(
          [reportOne.id, reportTwo.id, reportThree.id, reportFour.id],
        ));
    });
  });
});
