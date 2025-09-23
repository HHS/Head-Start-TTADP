import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  User,
  CollabReport,
  CollabReportSpecialist,
  CollabReportApprover,
  CollabReportReason,
} from '../models';
import {
  collabReportById,
  createOrUpdateReport,
  deleteReport,
  orderCollabReportsBy,
  collabReportScopes,
  getCSVReports,
} from './collabReports';

const mockUser = {
  id: 1115665161,
  homeRegionId: 1,
  name: 'user1115665161',
  hsesUsername: 'user1115665161',
  hsesUserId: 'user1115665161',
  lastLogin: new Date(),
};

const mockUserTwo = {
  id: 265157914,
  homeRegionId: 1,
  name: 'user265157914',
  hsesUserId: 'user265157914',
  hsesUsername: 'user265157914',
  lastLogin: new Date(),
};

const mockUserThree = {
  id: 39861962,
  homeRegionId: 1,
  name: 'user39861962',
  hsesUserId: 'user39861962',
  hsesUsername: 'user39861962',
  lastLogin: new Date(),
};

const reportObject = {
  name: faker.lorem.words(3),
  description: faker.lorem.words(10),
  endDate: '2020-09-01T12:00:00Z',
  startDate: '2020-09-01T12:00:00Z',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  duration: 1,
  conductMethod: ['in_person'],
};

describe('Collab Reports Service', () => {
  beforeAll(async () => {
    // Delete any reports that were previously created
    await CollabReport.destroy({ where: { userId: mockUser.id }, force: true });

    // Delete any users that were previously created
    const userIds = [mockUser.id, mockUserTwo.id, mockUserThree.id];
    await User.destroy({ where: { id: userIds } });

    // Create users to test with
    await Promise.all([
      User.create(mockUser),
      User.create(mockUserTwo),
      User.create(mockUserThree),
    ]);
  });

  afterAll(async () => {
    const userIds = [mockUser.id, mockUserTwo.id, mockUserThree.id];

    // Delete the report we created
    const reports = await CollabReport.findAll({
      where: {
        name: reportObject.name,
        description: reportObject.description,
        userId: mockUser.id,
      },
      paranoid: true,
    });

    const ids = reports.map(({ id }) => id);
    await CollabReport.destroy({
      where: {
        [Op.or]: [
          { id: ids },
          { userId: userIds },
        ],
      },
      force: true,
    });

    // Delete the users we created
    await User.destroy({ where: { id: userIds } });

    // Close the DB connection
    await db.sequelize.close();
  });

  describe('collabReportById', () => {
    it('returns the correct report when given a valid ID', async () => {
      // Create a report to test with
      await CollabReport.create(reportObject);

      // Find the report we created to get its ID
      const createdReport = await CollabReport.findOne({ where: { userId: mockUser.id } });

      const result = await collabReportById(createdReport.id);
      expect(result.name).toEqual(reportObject.name);
    });

    it('returns null when given an invalid ID', async () => {
      expect(await collabReportById(99999999)).toBeNull();
    });
  });

  describe('createOrUpdateReport', () => {
    it('creates a new report when given valid data', async () => {
      const result = await createOrUpdateReport(reportObject, null);
      expect(result.name).toEqual(reportObject.name);
    });

    it('updates an existing report when given valid data', async () => {
      // Create a report to test with
      await CollabReport.create(reportObject);

      // Find the report we created to get its ID
      const createdReport = await CollabReport.findOne({ where: { userId: mockUser.id } });

      const updatedReportObject = {
        ...reportObject,
        id: createdReport.id,
        name: 'Updated Report Name',
        lastUpdatedById: mockUserTwo.id,
      };

      const result = await createOrUpdateReport(updatedReportObject, createdReport);
      expect(result.name).toEqual('Updated Report Name');
      expect(result.lastUpdatedById).toEqual(mockUserTwo.id);
    });

    it('throws an error when trying to update a non-existent report', async () => {
      const nonExistentReport = {
        ...reportObject,
        name: 'Non-existent Report',
      };

      await expect(createOrUpdateReport(reportObject, nonExistentReport)).rejects.toThrow();
    });
  });

  describe('deleteReport', () => {
    let testReport;
    let testReportWithRelatedData;

    beforeEach(async () => {
      // Create a basic test report
      testReport = await CollabReport.create({
        ...reportObject,
        name: 'Test Report for Deletion',
      });

      // Create a report with comprehensive related data
      testReportWithRelatedData = await CollabReport.create({
        ...reportObject,
        name: 'Test Report with Related Data',
        userId: mockUserTwo.id,
        lastUpdatedById: mockUserTwo.id,
      });

      // Add related data similar to seeder structure
      await CollabReportSpecialist.create({
        collabReportId: testReportWithRelatedData.id,
        specialistId: mockUser.id,
      });

      await CollabReportApprover.create({
        collabReportId: testReportWithRelatedData.id,
        userId: mockUser.id,
        status: 'approved',
        note: 'Test approval note',
      });

      await CollabReportReason.create({
        collabReportId: testReportWithRelatedData.id,
        reasonId: 'participate_work_groups',
      });
    });

    afterEach(async () => {
      // Clean up test data
      if (testReport) {
        await testReport.destroy({ force: true });
      }
      if (testReportWithRelatedData) {
        await testReportWithRelatedData.destroy({ force: true });
      }

      // Clean up related data
      const reportIds = [testReport?.id, testReportWithRelatedData?.id].filter(Boolean);
      await CollabReportSpecialist.destroy({
        where: { collabReportId: reportIds },
        force: true,
      });
      await CollabReportApprover.destroy({
        where: { collabReportId: reportIds },
        force: true,
      });
      await CollabReportReason.destroy({
        where: { collabReportId: reportIds },
        force: true,
      });
    });

    it('successfully deletes a report with minimal data', async () => {
      expect(testReport).toBeTruthy();

      await deleteReport(testReport);

      // Verify report is soft-deleted (should not be found in normal query)
      const deletedReport = await CollabReport.findByPk(testReport.id);
      expect(deletedReport).toBeNull();

      // Verify report still exists with paranoid: false (soft delete)
      const softDeletedReport = await CollabReport.findByPk(testReport.id, { paranoid: false });
      expect(softDeletedReport).toBeTruthy();
      expect(softDeletedReport.deletedAt).toBeTruthy();
    });

    it('successfully deletes a report with comprehensive related data', async () => {
      expect(testReportWithRelatedData).toBeTruthy();

      // Verify related data exists before deletion
      const specialists = await CollabReportSpecialist.findAll({
        where: { collabReportId: testReportWithRelatedData.id },
      });
      const approvers = await CollabReportApprover.findAll({
        where: { collabReportId: testReportWithRelatedData.id },
      });
      const reasons = await CollabReportReason.findAll({
        where: { collabReportId: testReportWithRelatedData.id },
      });

      expect(specialists).toHaveLength(1);
      expect(approvers).toHaveLength(1);
      expect(reasons).toHaveLength(1);

      // Delete the report
      await expect(deleteReport(testReportWithRelatedData)).resolves.not.toThrow();

      // Verify report is soft-deleted
      const deletedReport = await CollabReport.findByPk(testReportWithRelatedData.id);
      expect(deletedReport).toBeNull();

      // Verify report still exists with paranoid: false
      const softDeleted = await CollabReport.findByPk(
        testReportWithRelatedData.id,
        { paranoid: false },
      );
      expect(softDeleted).toBeTruthy();
      expect(softDeleted.deletedAt).toBeTruthy();

      // Verify related data is preserved (not cascaded)
      const specialistsAfter = await CollabReportSpecialist.findAll({
        where: { collabReportId: testReportWithRelatedData.id },
      });
      const approversAfter = await CollabReportApprover.findAll({
        where: { collabReportId: testReportWithRelatedData.id },
      });
      const reasonsAfter = await CollabReportReason.findAll({
        where: { collabReportId: testReportWithRelatedData.id },
      });

      expect(specialistsAfter).toHaveLength(1);
      expect(approversAfter).toHaveLength(1);
      expect(reasonsAfter).toHaveLength(1);
    });

    it('handles deletion of already deleted report', async () => {
      // Delete the report first
      await deleteReport(testReport);

      // Verify it's deleted
      const deletedReport = await CollabReport.findByPk(testReport.id);
      expect(deletedReport).toBeNull();

      // Get the soft-deleted report to test deleting it again
      const softDeletedReport = await CollabReport.findByPk(testReport.id, { paranoid: false });

      // Attempting to delete already deleted report should not throw
      await expect(deleteReport(softDeletedReport)).resolves.not.toThrow();
    });

    it('throws error when trying to delete null or invalid report', async () => {
      await expect(deleteReport(null)).rejects.toThrow();
      await expect(deleteReport(undefined)).rejects.toThrow();
      await expect(deleteReport({})).rejects.toThrow();
    });
  });

  describe('orderCollabReportsBy', () => {
    it('returns correct order for Activity_name ascending', () => {
      const result = orderCollabReportsBy('Activity_name', 'asc');
      expect(result).toEqual([['name', 'asc']]);
    });

    it('returns correct order for Activity_name descending', () => {
      const result = orderCollabReportsBy('Activity_name', 'desc');
      expect(result).toEqual([['name', 'desc']]);
    });

    it('returns correct order for Report_ID', () => {
      const result = orderCollabReportsBy('Report_ID', 'asc');
      expect(result).toEqual([['id', 'asc']]);
    });

    it('returns correct order for Date_started', () => {
      const result = orderCollabReportsBy('Date_started', 'desc');
      expect(result).toEqual([['startDate', 'desc']]);
    });

    it('returns correct order for Created_date', () => {
      const result = orderCollabReportsBy('Created_date', 'asc');
      expect(result).toEqual([['createdAt', 'asc']]);
    });

    it('returns correct order for Last_saved', () => {
      const result = orderCollabReportsBy('Last_saved', 'desc');
      expect(result).toEqual([['updatedAt', 'desc']]);
    });

    it('returns literal for Creator sort', () => {
      const result = orderCollabReportsBy('Creator', 'asc');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
      expect(result[0][1]).toBe('asc');
      // Check that it's a Sequelize literal
      expect(result[0][0]).toHaveProperty('val');
    });

    it('returns literal for Collaborators sort', () => {
      const result = orderCollabReportsBy('Collaborators', 'desc');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
      expect(result[0][1]).toBe('desc');
      // Check that it's a Sequelize literal
      expect(result[0][0]).toHaveProperty('val');
    });

    it('defaults to updatedAt for unknown sort key', () => {
      const result = orderCollabReportsBy('UnknownField', 'asc');
      expect(result).toEqual([['updatedAt', 'asc']]);
    });

    it('handles null or undefined sortBy', () => {
      const result1 = orderCollabReportsBy(null, 'desc');
      expect(result1).toEqual([['updatedAt', 'desc']]);

      const result2 = orderCollabReportsBy(undefined, 'asc');
      expect(result2).toEqual([['updatedAt', 'asc']]);
    });
  });

  describe('collabReportScopes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns standard scopes with calculatedStatus', async () => {
      const result = await collabReportScopes({}, null, 'approved');

      expect(result).toEqual({
        customScopes: [],
        standardScopes: {
          calculatedStatus: 'approved',
        },
      });
    });

    it('adds userId filter when userId is provided', async () => {
      const result = await collabReportScopes({}, 123, 'draft');

      expect(result.standardScopes).toHaveProperty([Op.or]);
      expect(result.standardScopes[Op.or]).toHaveLength(3);
      expect(result.standardScopes[Op.or][0]).toEqual({ userId: 123 });
    });

    it('includes specialist subquery when userId is provided', async () => {
      const result = await collabReportScopes({}, 456, 'submitted');

      const orConditions = result.standardScopes[Op.or];
      expect(orConditions[1]).toHaveProperty('id');
      expect(orConditions[1].id).toHaveProperty([Op.in]);
      // Check that it contains the user ID in the literal
      expect(orConditions[1].id[Op.in].val).toContain('456');
    });

    it('includes approver subquery when userId is provided', async () => {
      const result = await collabReportScopes({}, 789, 'approved');

      const orConditions = result.standardScopes[Op.or];
      expect(orConditions[2]).toHaveProperty('id');
      expect(orConditions[2].id).toHaveProperty([Op.in]);
      // Check that it contains the user ID in the literal
      expect(orConditions[2].id[Op.in].val).toContain('789');
    });

    it('does not add userId filter when userId is null', async () => {
      const result = await collabReportScopes({ region: [1, 2] }, null, 'needs_action');

      expect(result).toEqual({
        customScopes: [],
        standardScopes: {
          calculatedStatus: 'needs_action',
        },
      });
      expect(result.standardScopes).not.toHaveProperty([Op.or]);
    });
  });

  describe('getCSVReports', () => {
    it('returns all reports when no filters are provided', async () => {
      const result = await getCSVReports();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('includes all required attributes for CSV export', async () => {
      const result = await getCSVReports({ limit: '1' });
      expect(result.length).toBe(1);

      const report = result[0];
      expect(report).toHaveProperty('name');
      expect(report).toHaveProperty('description');
      expect(report).toHaveProperty('startDate');
      expect(report).toHaveProperty('endDate');
      expect(report).toHaveProperty('author');
      expect(report).toHaveProperty('collaboratingSpecialists');
      expect(report).toHaveProperty('approvers');
      expect(report.get('status')).toBeTruthy();
    });

    it('includes author information with roles', async () => {
      const result = await getCSVReports({ limit: '1' });
      const report = result[0];

      expect(report.author).toHaveProperty('fullName');
      expect(report.author).toHaveProperty('name');
      expect(report.author).toHaveProperty('roles');
      expect(Array.isArray(report.author.roles)).toBe(true);
    });

    it('includes collaborating specialists with roles', async () => {
      const result = await getCSVReports({ limit: '10' });

      // Find a report with specialists
      const reportWithSpecialists = result.find((r) => r.collaboratingSpecialists
        && r.collaboratingSpecialists.length > 0);

      expect(reportWithSpecialists).toBeTruthy();
      expect(Array.isArray(reportWithSpecialists.collaboratingSpecialists)).toBe(true);
      const specialist = reportWithSpecialists.collaboratingSpecialists[0];
      expect(specialist).toHaveProperty('id');
      expect(specialist).toHaveProperty('name');
      expect(specialist).toHaveProperty('fullName');
      expect(specialist).toHaveProperty('roles');
      expect(Array.isArray(specialist.roles)).toBe(true);
    });

    it('includes approvers with user information', async () => {
      const result = await getCSVReports({ limit: '10' });

      // Find a report with approvers
      const reportWithApprovers = result.find((r) => r.approvers && r.approvers.length > 0);

      expect(reportWithApprovers).toBeTruthy();
      expect(Array.isArray(reportWithApprovers.approvers)).toBe(true);
      const approver = reportWithApprovers.approvers[0];
      expect(approver).toHaveProperty('id');
      expect(approver).toHaveProperty('status');
      expect(approver).toHaveProperty('note');
      expect(approver).toHaveProperty('user');
      expect(approver.user).toHaveProperty('id');
      expect(approver.user).toHaveProperty('name');
      expect(approver.user).toHaveProperty('fullName');
    });

    it('respects limit parameter', async () => {
      const result = await getCSVReports({ limit: '1' });
      expect(result).toHaveLength(1);
    });

    it('handles "all" limit parameter', async () => {
      const result = await getCSVReports({ limit: 'all' });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('respects sortBy and sortDir parameters', async () => {
      const resultAsc = await getCSVReports({
        sortBy: 'Activity_name',
        sortDir: 'asc',
        limit: '2',
      });
      const resultDesc = await getCSVReports({
        sortBy: 'Activity_name',
        sortDir: 'desc',
        limit: '2',
      });

      expect(resultAsc).toHaveLength(2);
      expect(resultDesc).toHaveLength(2);

      // Names should be in opposite order
      expect(resultAsc[0].name).not.toBe(resultDesc[0].name);
    });

    it('includes steps data when available', async () => {
      const result = await getCSVReports({ limit: '10' });

      result.forEach((report) => {
        expect(report).toHaveProperty('steps');
        expect(Array.isArray(report.steps)).toBe(true);
      });
    });

    it('uses default parameters when none provided', async () => {
      const result = await getCSVReports();

      expect(Array.isArray(result)).toBe(true);
      // Should respect default limit of REPORTS_PER_PAGE (10)
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });
});
