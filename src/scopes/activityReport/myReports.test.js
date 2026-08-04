/* eslint-disable max-len */

import { scopeToWhere } from '../utils';
import {
  ActivityReport,
  ActivityReportApprover,
  ActivityReportCollaborator,
  draftReport,
  faker,
  filtersToScopes,
  Op,
  setupSharedTestData,
  sharedTestData,
  tearDownSharedTestData,
  User,
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
        force: true,
      });

      await ActivityReport.destroy({
        where: { id: possibleIds },
      });

      await User.destroy({
        where: { id: [collaborator.id, approver.id] },
      });
    });

    it('includes reports created by the user', async () => {
      const filters = { 'myReports.in': ['Creator'] };
      const { activityReport: scope } = await filtersToScopes(filters, {
        userId: sharedTestData.includedUser1.id,
      });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportByIncludedUser.id]));
    });

    it('includes reports collaborated on by the user', async () => {
      const filters = { 'myReports.in': ['Collaborator'] };
      const { activityReport: scope } = await filtersToScopes(filters, { userId: collaborator.id });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([collaboratorReport.id]));
    });

    it('includes reports approved by the user', async () => {
      const filters = { 'myReports.in': ['Approver'] };
      const { activityReport: scope } = await filtersToScopes(filters, { userId: approver.id });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([approverReport.id]));
    });

    it('excludes reports created by the user', async () => {
      const filters = { 'myReports.nin': ['Creator'] };
      const { activityReport: scope } = await filtersToScopes(filters, {
        userId: sharedTestData.includedUser1.id,
      });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id)).toEqual(
        expect.arrayContaining([collaboratorReport.id, approverReport.id, reportByExcludedUser.id])
      );
    });

    it('excludes reports collaborated on by the user', async () => {
      const filters = { 'myReports.nin': ['Collaborator'] };
      const { activityReport: scope } = await filtersToScopes(filters, { userId: collaborator.id });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id)).toEqual(
        expect.arrayContaining([
          reportByIncludedUser.id,
          approverReport.id,
          reportByExcludedUser.id,
        ])
      );
    });

    it('excludes reports approved by the user', async () => {
      const filters = { 'myReports.nin': ['Approver'] };
      const { activityReport: scope } = await filtersToScopes(filters, { userId: approver.id });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id)).toEqual(
        expect.arrayContaining([
          reportByIncludedUser.id,
          collaboratorReport.id,
          reportByExcludedUser.id,
        ])
      );
    });

    it('includes reports created by the user using the "AR creator" label', async () => {
      const filters = { 'myReports.in': ['AR creator'] };
      const { activityReport: scope } = await filtersToScopes(filters, {
        userId: sharedTestData.includedUser1.id,
      });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([reportByIncludedUser.id]));
    });

    it('matches no reports when only Training Report roles are selected (include)', async () => {
      const filters = { 'myReports.in': ['TR POC'] };
      const { activityReport: scope } = await filtersToScopes(filters, {
        userId: sharedTestData.includedUser1.id,
      });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(0);
    });

    it('matches all reports when only Training Report roles are selected (exclude)', async () => {
      const filters = { 'myReports.nin': ['TR POC'] };
      const { activityReport: scope } = await filtersToScopes(filters, {
        userId: sharedTestData.includedUser1.id,
      });
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(4);
    });

    it('builds a valid where clause via scopeToWhere when only TR roles are selected (frequencyGraph path)', async () => {
      // The frequency graph widget embeds the AR scope's SQL via scopeToWhere.
      // A bare sequelize.literal inside an Op.and array is rejected by Sequelize
      // ("Support for literal replacements in the where object has been removed"),
      // so the match-nothing branch must use the { [Op.or]: [literal] } shape.
      const filters = { 'myReports.in': ['TR POC'] };
      const { activityReport: scope } = await filtersToScopes(filters, {
        userId: sharedTestData.includedUser1.id,
      });
      const where = await scopeToWhere(ActivityReport, 'art', scope);
      expect(typeof where).toBe('string');
      expect(where).toContain('1 = 0');
    });
  });
});
