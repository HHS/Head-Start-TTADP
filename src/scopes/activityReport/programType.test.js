import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityRecipient,
  Program,
  createReport,
  destroyReport,
  faker,
  auditLogger,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('programType filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('programType', () => {
    let possibleIds;
    let reportOne;
    let reportTwo;
    let reportThree;
    let grantIds;

    beforeAll(async () => {
      reportOne = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });
      reportTwo = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });
      reportThree = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });

      possibleIds = [
        reportOne.id,
        reportTwo.id,
        reportThree.id,
        sharedTestData.globallyExcludedReport.id,
      ];

      const dummyProgram = {
        startYear: '2020',
        startDate: '2020-09-01',
        endDate: '2020-09-02',
        status: 'Active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const reportOneRecipients = await ActivityRecipient.findAll({
        where: {
          activityReportId: reportOne.id,
        },
      });

      const reportTwoRecipients = await ActivityRecipient.findAll({
        where: {
          activityReportId: reportTwo.id,
        },
      });

      const reportThreeRecipients = await ActivityRecipient.findAll({
        where: {
          activityReportId: reportThree.id,
        },
      });

      grantIds = [
        ...reportOneRecipients.map((r) => r.grantId),
        ...reportTwoRecipients.map((r) => r.grantId),
        ...reportThreeRecipients.map((r) => r.grantId),
      ];

      await Promise.all([
        ...reportOneRecipients.map(async (recipient) => {
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'EHS',
          }).catch((err) => auditLogger.error(err));
        }),
        ...reportTwoRecipients.map(async (recipient) => {
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'EHS',
          }).catch((err) => auditLogger.error(err));
        }),
        ...reportThreeRecipients.map(async (recipient) => {
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'AIAN HS',
          }).catch((err) => auditLogger.error(err));
          await Program.create({
            ...dummyProgram,
            id: faker.datatype.number(),
            name: faker.name.findName(),
            grantId: recipient.grantId,
            programType: 'AIAN EHS',
          }).catch((err) => auditLogger.error(err));
        }),
      ]);
    });

    afterAll(async () => {
      await Program.destroy({
        where: {
          grantId: grantIds,
        },
      });

      await destroyReport(reportOne);
      await destroyReport(reportTwo);
      await destroyReport(reportThree);
    });

    it('includes program type', async () => {
      const filters = { 'programType.in': ['EHS', 'HS'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      }).catch((err) => auditLogger.error(err));
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportOne.id, reportTwo.id, reportThree.id]));
    });

    it('excludes program type', async () => {
      const filters = { 'programType.nin': ['EHS'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining(
          [sharedTestData.globallyExcludedReport.id],
        ));
    });

    it('excludes multiple program types', async () => {
      const filters = { 'programType.nin': ['EHS', 'HS'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([sharedTestData.globallyExcludedReport.id]));
    });
  });
});
