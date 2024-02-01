import { classScore, monitoringData } from './monitoring';

describe('monitoring services', () => {
  /**
   * we rely on the seeded data being present for this test to work
   */
  const RECIPIENT_ID = 1;
  const REGION_ID = 14;
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
    it('returns data in the correct format', async () => {
      const data = await monitoringData(
        RECIPIENT_ID,
        REGION_ID,
      );

      expect(data).toEqual({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        reviewStatus: expect.any(String),
        reviewDate: expect.any(String),
        reviewType: expect.any(String),
      });
    });
  });
});
