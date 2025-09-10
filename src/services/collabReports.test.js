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
import { collabReportById, createOrUpdateReport, deleteReport } from './collabReports';

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
});
