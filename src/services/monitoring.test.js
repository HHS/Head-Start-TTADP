import sequelize from 'sequelize';
import { classScore, monitoringData } from './monitoring';

describe('monitoring services', () => {
  const RECIPIENT_ID = 1;
  const REGION_ID = 14;

  afterAll(async () => {
    await sequelize.close();
  });

  describe('classScore', () => {
    it('returns data in the correct format', async () => {
      const data = await classScore(
        RECIPIENT_ID,
        REGION_ID,
      );

      expect(data).toEqual({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        received: expect.any(String),
        ES: expect.any(Number),
        CO: expect.any(Number),
        IS: expect.any(Number),
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
        reviewDate: expect.any(Date),
        reviewType: 'FA-1',
      });
    });
  });
});
