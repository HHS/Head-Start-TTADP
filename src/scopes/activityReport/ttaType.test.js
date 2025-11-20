import {
  Op,
  filtersToScopes,
  ActivityReport,
  draftReport,
  setupSharedTestData,
  tearDownSharedTestData,
} from './testHelpers';

describe('ttaType filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('ttaType', () => {
    let ttaReport;
    let trainingReport;
    let bothReport;
    let reportExcluded;
    let reportIds = [];

    beforeAll(async () => {
      ttaReport = await ActivityReport.create({ ...draftReport, ttaType: ['technical-assistance'] });
      trainingReport = await ActivityReport.create({ ...draftReport, ttaType: ['training'] });
      bothReport = await ActivityReport.create({ ...draftReport, ttaType: ['training,technical-assistance'] });
      reportExcluded = await ActivityReport.create({ ...draftReport, ttaType: ['balderdash'] });

      reportIds = [
        ttaReport.id,
        trainingReport.id,
        bothReport.id,
        reportExcluded.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.unscoped().destroy({
        where: {
          id: reportIds,
        },
        force: true,
      });
    });

    describe('tta', () => {
      it('contains', async () => {
        const filters = { 'ttaType.in': ['technical-assistance'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(1);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([ttaReport.id]));
      });

      it('does not contain', async () => {
        const filters = { 'ttaType.nin': ['technical-assistance'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(3);
        expect(found.map((f) => f.id).includes(ttaReport.id)).toBe(false);
      });
    });
    describe('training', () => {
      it('contains', async () => {
        const filters = { 'ttaType.in': ['training'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(1);
        expect(found.map((f) => f.id))
          .toEqual(expect.arrayContaining([trainingReport.id]));
      });
      it('does not contain', async () => {
        const filters = { 'ttaType.nin': ['training'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(3);
        expect(found.map((f) => f.id).includes(trainingReport.id)).toBe(false);
      });
    });

    describe('both', () => {
      it('contains', async () => {
        const filters = { 'ttaType.in': ['training,technical-assistance'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(1);
        expect(found.map((f) => f.id).includes(bothReport.id)).toBe(true);
      });
      it('does not contain', async () => {
        const filters = { 'ttaType.nin': ['training,technical-assistance'] };
        const scope = await filtersToScopes(filters);
        const found = await ActivityReport.findAll({
          where: { [Op.and]: [scope.activityReport, { id: reportIds }] },
        });

        expect(found.length).toBe(3);
        expect(found.map((f) => f.id).includes(bothReport.id)).toBe(false);
      });
    });
  });
});
