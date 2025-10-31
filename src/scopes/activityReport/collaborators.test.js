import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityReportCollaborator,
  draftReport,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('collaborators filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('collaborators', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    let includedActivityReportCollaborator1;
    let includedActivityReportCollaborator2;
    let excludedActivityReportCollaborator;

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create(draftReport);
      includedReport2 = await ActivityReport.create(draftReport);
      excludedReport = await ActivityReport.create(draftReport);

      includedActivityReportCollaborator1 = await ActivityReportCollaborator.create({
        activityReportId: includedReport1.id, userId: sharedTestData.includedUser1.id,
      });
      includedActivityReportCollaborator2 = await ActivityReportCollaborator.create({
        activityReportId: includedReport2.id, userId: sharedTestData.includedUser2.id,
      });
      excludedActivityReportCollaborator = await ActivityReportCollaborator.create({
        activityReportId: excludedReport.id, userId: sharedTestData.excludedUser.id,
      });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        sharedTestData.globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });
      await ActivityReportCollaborator.destroy({
        where: {
          id: [
            includedActivityReportCollaborator1.id,
            includedActivityReportCollaborator2.id,
            excludedActivityReportCollaborator.id,
          ],
        },
      });
    });

    it('includes authors with a partial match', async () => {
      const filters = { 'collaborators.ctn': ['person'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes authors that do not partial match', async () => {
      const filters = { 'collaborators.nctn': ['person'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          excludedReport.id, sharedTestData.globallyExcludedReport.id]));
    });
  });
});
