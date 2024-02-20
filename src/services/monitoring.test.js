import sequelize from 'sequelize';
import { classScore, monitoringData } from './monitoring';
import db from '../models';

const {
  MonitoringClassSummary,
} = db;

describe('monitoring services', () => {
  const RECIPIENT_ID = 1;
  const REGION_ID = 14;
  const GRANT_NUMBER = '09CH033333';

  beforeAll(async () => {
    await MonitoringClassSummary.findOrCreate({
      where: { grantNumber: GRANT_NUMBER },
      defaults: {
        reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
        grantNumber: GRANT_NUMBER,
        emotionalSupport: 6.2303,
        classroomOrganization: 5.2303,
        instructionalSupport: 3.2303,
        reportDeliveryDate: '2023-05-22 21:00:00-07',
        hash: 'seedhashclasssum1',
        sourceCreatedAt: '2023-05-22 21:00:00-07',
        sourceUpdatedAt: '2023-05-22 21:00:00-07',
      },
    });
  });

  afterAll(async () => {
    await MonitoringClassSummary.destroy({ where: { grantNumber: GRANT_NUMBER } });
    await sequelize.close();
  });

  describe('classScore', () => {
    it('returns data in the correct format', async () => {
      const data = await classScore({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).toEqual({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
        received: expect.any(String),
        // sequelize retrieves numeric fields as strings
        ES: expect.any(String),
        CO: expect.any(String),
        IS: expect.any(String),
      });
    });
  });
  describe('monitoringData', () => {
    // we rely on the seeded data being present for this test to work

    it('returns null when nothing is found', async () => {
      const recipientId = 7;
      const regionId = 12;
      const grantNumber = '09CH033333';

      const data = await monitoringData({
        recipientId,
        regionId,
        grantNumber,
      });

      expect(data).toEqual(null);
    });

    it('returns data in the correct format', async () => {
      const recipientId = 7;
      const regionId = 9;
      const grantNumber = '09CH033333';

      const data = await monitoringData({
        recipientId,
        regionId,
        grantNumber,
      });

      expect(data).toEqual({
        recipientId,
        regionId,
        grant: grantNumber,
        reviewStatus: 'Complete',
        reviewDate: '02/22/2023',
        reviewType: 'FA-1',
      });
    });
  });
});
