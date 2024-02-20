import sequelize from 'sequelize';
import { classScore, monitoringData } from './monitoring';

describe('monitoring services', () => {
  const RECIPIENT_ID = 1;
  const REGION_ID = 14;
  const GRANT_NUMBER = '09HP044444';

  afterAll(async () => {
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
