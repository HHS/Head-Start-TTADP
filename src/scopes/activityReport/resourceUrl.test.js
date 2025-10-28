/* eslint-disable max-len */
import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityReportResource,
  Resource,
  draftReport,
  findOrCreateResources,
  processActivityReportForResourcesById,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('resourceUrl filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('resourceUrl', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;
    let possibleIds;

    let resource1;
    let resource2;
    let resource3;

    beforeAll(async () => {
      includedReport1 = await ActivityReport.create({
        ...draftReport,
      });

      includedReport2 = await ActivityReport.create({
        ...draftReport,
      });

      excludedReport = await ActivityReport.create({
        ...draftReport,
      });

      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        sharedTestData.globallyExcludedReport.id,
      ];

      // Create resources.
      const resources1 = await findOrCreateResources(['https://included-url.gov']);
      [resource1] = resources1;

      const resources2 = await findOrCreateResources(['https://included-url-2.gov']);
      [resource2] = resources2;

      const resources3 = await findOrCreateResources(['https://excluded-url.gov']);
      [resource3] = resources3;

      // Assign resources to reports.
      await processActivityReportForResourcesById(includedReport1.id, [resource1.id]);
      await processActivityReportForResourcesById(includedReport2.id, [resource2.id]);
      await processActivityReportForResourcesById(excludedReport.id, [resource3.id]);
    });

    afterAll(async () => {
      await ActivityReportResource.destroy({
        where: {
          activityReportId: [includedReport1.id, includedReport2.id, excludedReport.id],
        },
      });

      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });

      await Resource.destroy({
        where: { id: [resource1.id, resource2.id, resource3.id] },
      });
    });

    it('includes reports with matching resource URL', async () => {
      const filters = { 'resourceUrl.ctn': ['included-url'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes reports with matching resource URL', async () => {
      const filters = { 'resourceUrl.nctn': ['included-url'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, sharedTestData.globallyExcludedReport.id]));
    });

    it('includes reports with exact matching resource URL', async () => {
      const filters = { 'resourceUrl.ctn': ['https://included-url.gov'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id]));
    });
  });
});
