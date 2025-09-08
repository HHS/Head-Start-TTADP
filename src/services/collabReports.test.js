import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  User, CollabReport,
} from '../models';
import { collabReportById, createOrUpdateReport } from './collabReports';

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
  conductMethod: 'in_person',
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
    // Delete the report we created
    await CollabReport.destroy({ where: { id: reportObject.id } });

    // Delete the users we created
    const userIds = [mockUser.id, mockUserTwo.id, mockUserThree.id];
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

      const result = createOrUpdateReport(reportObject, nonExistentReport);
      await expect(result).rejects.toThrow('CR Update failed');
    });
  });
});
