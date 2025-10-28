import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityReportCollaborator,
  ActivityReportApprover,
  User,
  draftReport,
  faker,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('myReports filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('myReports', () => {
    let reportByIncludedUser;
    let collaboratorReport;
    let approverReport;
    let reportByExcludedUser;

    let collaborator;
    let approver;

    let possibleIds;

    beforeAll(async () => {
      collaborator = await User.create({
        id: faker.datatype.number({ min: 1000000, max: 9999999 }),
        homeRegionId: 1,
        name: 'collaboratoruser',
        hsesUsername: 'collaboratoruser',
        hsesUserId: 'collaboratoruser',
        lastLogin: new Date(),
      });

      approver = await User.create({
        id: faker.datatype.number({ min: 1000000, max: 9999999 }),
        homeRegionId: 1,
        name: 'approveruser',
        hsesUsername: 'approveruser',
        hsesUserId: 'approveruser',
        lastLogin: new Date(),
      });

      reportByIncludedUser = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.includedUser1.id,
      });

      collaboratorReport = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.excludedUser.id,
      });

      await ActivityReportCollaborator.create({
        activityReportId: collaboratorReport.id,
        userId: collaborator.id,
      });

      approverReport = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.excludedUser.id,
        calculatedStatus: 'submitted',
      });

      await ActivityReportApprover.create({
        activityReportId: approverReport.id,
        userId: approver.id,
      });

      reportByExcludedUser = await ActivityReport.create({
        ...draftReport,
        userId: sharedTestData.excludedUser.id,
      });

      possibleIds = [
        reportByIncludedUser.id,
        collaboratorReport.id,
        approverReport.id,
        reportByExcludedUser.id,
      ];
    });

    afterAll(async () => {
      await ActivityReportCollaborator.destroy({
        where: { activityReportId: collaboratorReport.id },
      });

      await ActivityReportApprover.destroy({
        where: { activityReportId: approverReport.id },
      });

      await ActivityReport.destroy({
        where: { id: possibleIds },
      });

      await User.destroy({
        where: { id: [collaborator.id, approver.id] },
      });
    });

    it('includes reports created by the user', async () => {
      const filters = { 'myReports.in': [sharedTestData.includedUser1.id.toString(), 'Creator'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([reportByIncludedUser.id]));
    });

    it('includes reports collaborated on by the user', async () => {
      const filters = { 'myReports.in': [collaborator.id.toString(), 'Collaborator'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([collaboratorReport.id]));
    });

    it('includes reports approved by the user', async () => {
      const filters = { 'myReports.in': [approver.id.toString(), 'Approver'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([approverReport.id]));
    });

    it('excludes reports created by the user', async () => {
      const filters = { 'myReports.nin': [sharedTestData.includedUser1.id.toString(), 'Creator'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          collaboratorReport.id,
          approverReport.id,
          reportByExcludedUser.id,
        ]));
    });

    it('excludes reports collaborated on by the user', async () => {
      const filters = { 'myReports.nin': [collaborator.id.toString(), 'Collaborator'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          reportByIncludedUser.id,
          approverReport.id,
          reportByExcludedUser.id,
        ]));
    });

    it('excludes reports approved by the user', async () => {
      const filters = { 'myReports.nin': [approver.id.toString(), 'Approver'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          reportByIncludedUser.id,
          collaboratorReport.id,
          reportByExcludedUser.id,
        ]));
    });

    it('handles invalid role', async () => {
      const filters = { 'myReports.in': [sharedTestData.includedUser1.id.toString(), 'InvalidRole'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(0);
    });

    it('handles missing role', async () => {
      const filters = { 'myReports.in': [sharedTestData.includedUser1.id.toString()] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(0);
    });

    it('handles invalid user ID', async () => {
      const filters = { 'myReports.in': ['not-a-number', 'Creator'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(0);
    });

    it('handles empty filter value', async () => {
      const filters = { 'myReports.in': [] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(0);
    });
  });
});
