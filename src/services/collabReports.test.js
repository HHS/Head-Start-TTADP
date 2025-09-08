import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  User, CollabReport,
} from '../models';
import { collabReportById } from './collabReports';

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

const submittedReport = {
  ...reportObject,
  submissionStatus: REPORT_STATUSES.SUBMITTED,
};

describe('Collab Reports Service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('collabReportById', () => {
    beforeAll(async () => {
      // Create users to test with
      await Promise.all([
        User.create(mockUser),
        User.create(mockUserTwo),
        User.create(mockUserThree),
      ]);
      // Create a report to test with
      await CollabReport.create(reportObject);
    });

    afterAll(async () => {
      const userIds = [mockUser.id, mockUserTwo.id, mockUserThree.id];
      const reports = await CollabReport.findAll({ where: { userId: userIds } });
      const reportIds = reports.map((report) => report.id);
      await CollabReport.destroy({ where: { id: reportIds } });
      await User.destroy({ where: { id: userIds } });
    });

    it('returns the correct report when given a valid ID', async () => {
      // Find the report we created to get its ID
      const createdReport = await CollabReport.findOne({ where: { userId: mockUser.id } });

      const result = await collabReportById(createdReport.id);
      expect(result.name).toEqual(reportObject.name);
    });
  });
});
