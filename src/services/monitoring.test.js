import sequelize from 'sequelize';
import { classScore, monitoringData } from './monitoring';
import db from '../models';

const {
  Grant,
  GrantNumberLink,
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringReview,
  MonitoringReviewLink,
  MonitoringReviewStatusLink,
  MonitoringClassSummary,
} = db;

const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = '01HP044446';
const GRANT_ID = 665;

async function createMonitoringData() {
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

  await MonitoringReviewGrantee.findOrCreate({
    where: { grantNumber: GRANT_NUMBER },
    defaults: {
      reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
      granteeId: '14FC5A81-8E27-4B06-A107-9C28762BC2F6',
      grantNumber: GRANT_NUMBER,
      sourceCreatedAt: '2024-02-12 14:31:55.74-08',
      sourceUpdatedAt: '2024-02-12 14:31:55.74-08',
      createTime: '2023-11-14 21:00:00-08',
      updateTime: '2024-02-12 14:31:55.74-08',
      updateBy: 'Support Team',
    },
  });

  await MonitoringReview.findOrCreate({
    where: { reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808' },
    defaults: {
      reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
      contentId: '653DABA6-DE64-4081-B5B3-9A126487E8F',
      statusId: 6006,
      startDate: '2024-02-12',
      endDate: '2024-02-12',
      reviewType: 'FA-1',
      reportDeliveryDate: '2023-02-21 21:00:00-08',
      outcome: 'Complete',
      hash: 'seedhashrev2',
      sourceCreatedAt: '2023-02-22 21:00:00-08',
      sourceUpdatedAt: '2023-02-22 21:00:00-08',
    },
  });

  await MonitoringReviewLink.findOrCreate({
    where: { reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808' },
    defaults: {
      reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808',
    },
  });

  await MonitoringReviewStatusLink.findOrCreate({
    where: { statusId: 6006 },
    defaults: {
      statusId: 6006,
    },
  });

  await MonitoringReviewStatus.findOrCreate({
    where: { statusId: 6006 },
    defaults: {
      statusId: 6006,
      name: 'Complete',
      sourceCreatedAt: '2024-02-12 14:31:55.74-08',
      sourceUpdatedAt: '2024-02-12 14:31:55.74-08',
    },
  });
}

describe('monitoring services', () => {
  beforeAll(async () => {
    await Grant.findOrCreate({
      where: { number: GRANT_NUMBER },
      defaults: {
        id: GRANT_ID,
        regionId: REGION_ID,
        number: GRANT_NUMBER,
        recipientId: RECIPIENT_ID,
        status: 'Active',
        startDate: '2024-02-12 14:31:55.74-08',
        endDate: '2024-02-12 14:31:55.74-08',
        cdi: false,
      },
    });
  });

  afterAll(async () => {
    await MonitoringReviewGrantee.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
    await MonitoringClassSummary.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
    await MonitoringReview.destroy({ where: { reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808' }, force: true });
    await MonitoringReviewLink.destroy({ where: { reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C808' }, force: true });
    await MonitoringReviewStatus.destroy({ where: { statusId: 6006 }, force: true });
    await MonitoringReviewStatusLink.destroy({ where: { statusId: 6006 }, force: true });
    await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
    await sequelize.close();
  });

  describe('classScore', () => {
    beforeAll(async () => {
      await createMonitoringData();
    });
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
    beforeAll(async () => {
      await createMonitoringData();
    });
    it('returns null when nothing is found', async () => {
      const recipientId = 7;
      const regionId = 12;
      const grantNumber = '09CH0333343';

      const data = await monitoringData({
        recipientId,
        regionId,
        grantNumber,
      });

      expect(data).toEqual(null);
    });

    it('returns data in the correct format', async () => {
      const recipientId = RECIPIENT_ID;
      const regionId = REGION_ID;
      const grantNumber = GRANT_NUMBER;

      const grant = await Grant.findOne({
        where: { id: GRANT_ID },
      });

      expect(grant).not.toBeNull();

      const grantNumberLink = await GrantNumberLink.findOne({
        where: { grantId: GRANT_ID },
      });

      expect(grantNumberLink).not.toBeNull();

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
