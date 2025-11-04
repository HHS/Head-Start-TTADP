import {
  Op,
  filtersToScopes,
  ActivityReport,
  draftReport,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('createDate filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('createDate', () => {
    let firstReport;
    let secondReport;
    let thirdReport;
    let fourthReport;
    let possibleIds;

    beforeAll(async () => {
      firstReport = await ActivityReport.create({ ...draftReport, id: 95825, createdAt: '2019-01-01T21:00:57.149Z' });
      secondReport = await ActivityReport.create({ ...draftReport, id: 95852, createdAt: '2020-02-01T21:11:57.149Z' });
      thirdReport = await ActivityReport.create({ ...draftReport, id: 95857, createdAt: '2021-01-01T21:14:57.149Z' });
      fourthReport = await ActivityReport.create({ ...draftReport, id: 95827, createdAt: '2023-01-01T21:15:57.149Z' });
      possibleIds = [
        firstReport.id,
        secondReport.id,
        thirdReport.id,
        fourthReport.id,
        sharedTestData.globallyExcludedReport.id,
      ];
    });

    afterAll(async () => {
      await ActivityReport.destroy({
        where: { id: [firstReport.id, secondReport.id, thirdReport.id, fourthReport.id] },
      });
    });

    it('before returns reports with create dates before the given date', async () => {
      const filters = { 'createDate.bef': '2020/12/31' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([firstReport.id, secondReport.id]));
    });

    it('after returns reports with create dates after the given date', async () => {
      const filters = { 'createDate.aft': '2021/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([fourthReport.id]));
    });

    it('within returns reports with create dates between the two dates', async () => {
      const filters = { 'createDate.win': '2020/01/01-2021/06/06' };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([secondReport.id, thirdReport.id]));
    });
  });
});
