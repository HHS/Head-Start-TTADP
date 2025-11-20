import { createMonitoringData, destroyMonitoringData } from './monitoring.testHelpers';
import {
  classScore,
  monitoringData,
  ttaByReviews,
  ttaByCitations,
} from './monitoring';
import db from '../models';

const {
  Grant,
  GrantNumberLink,
  MonitoringClassSummary,
  MonitoringReview,
} = db;

const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = '01HP044446';
const GRANT_ID = 665;

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
    await Grant.destroy({ where: { number: GRANT_NUMBER }, force: true, individualHooks: true });
    await db.sequelize.close();
  });

  describe('classScore', () => {
    beforeAll(async () => {
      await createMonitoringData(GRANT_NUMBER);
    });
    afterAll(async () => {
      await destroyMonitoringData(GRANT_NUMBER);
      await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
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
        ES: expect.any(String),
        CO: expect.any(String),
        IS: expect.any(String),
      });
    });
    it('returns an empty object when no score is found', async () => {
      jest.spyOn(MonitoringClassSummary, 'findOne').mockResolvedValueOnce(null);

      const data = await classScore({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).toEqual({});
    });
    it('returns an empty object when the score date is before 2020-11-09', async () => {
      jest.spyOn(MonitoringClassSummary, 'findOne').mockResolvedValueOnce({
        emotionalSupport: 6.2303,
        classroomOrganization: 5.2303,
        instructionalSupport: 3.2303,
        reportDeliveryDate: '2020-10-01 21:00:00-07',
      });

      const data = await classScore({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).toEqual({});
    });
    it('returns an empty object when the grant is a CDI grant', async () => {
      jest.spyOn(MonitoringClassSummary, 'findOne').mockResolvedValueOnce({
        emotionalSupport: 6.2303,
        classroomOrganization: 5.2303,
        instructionalSupport: 3.2303,
        reportDeliveryDate: '2025-05-22 21:00:00-07',
      });

      jest.spyOn(Grant, 'findOne').mockResolvedValueOnce({
        number: GRANT_NUMBER,
        cdi: true,
      });

      const data = await classScore({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).toEqual({});
    });
  });
  describe('monitoringData', () => {
    beforeAll(async () => {
      await createMonitoringData(GRANT_NUMBER);
    });
    afterAll(async () => {
      await destroyMonitoringData(GRANT_NUMBER);
      await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
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
      const grant = await Grant.findOne({
        where: { id: GRANT_ID },
      });

      expect(grant).not.toBeNull();

      const grantNumberLink = await GrantNumberLink.findOne({
        where: { grantId: GRANT_ID },
      });

      expect(grantNumberLink).not.toBeNull();

      const data = await monitoringData({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).toEqual({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grant: GRANT_NUMBER,
        reviewStatus: 'Complete',
        reviewDate: '02/22/2025',
        reviewType: 'FA-1',
      });
    });

    it('returns the most recent review', async () => {
      const data = await monitoringData({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).not.toBeNull();
      expect(data.reviewDate).toEqual('02/22/2025');

      await MonitoringReview.destroy({ where: { reviewId: 'C48EAA67-90B9-4125-9DB5-0011D6D7C809' }, force: true });
      await MonitoringReview.destroy({ where: { reviewId: 'D58FBB78-91CA-4236-8DB6-0022E7E8D909' }, force: true });
    });
  });
  describe('Grant afterCreate', () => {
    beforeAll(async () => {
      await Grant.findOrCreate({
        where: { number: '14CH123' },
        defaults: {
          id: GRANT_ID + 2,
          regionId: REGION_ID,
          number: '14CH123',
          recipientId: RECIPIENT_ID,
          status: 'Active',
          startDate: '2024-02-12 14:31:55.74-08',
          endDate: '2024-02-12 14:31:55.74-08',
          cdi: false,
        },
      });
    });

    afterAll(async () => {
      await GrantNumberLink.destroy({ where: { grantNumber: '14CH123' }, force: true });
      await Grant.destroy({ where: { number: '14CH123' }, force: true, individualHooks: true });
    });

    it('adds a record in GrantNumberLink table', async () => {
      const createdGrant = await Grant.findOne({
        where: { id: GRANT_ID + 2 },
      });
      expect(createdGrant).not.toBeNull();

      const createdGrantNumberLink = await GrantNumberLink.findOne({
        where: { grantNumber: '14CH123' },
      });

      expect(createdGrantNumberLink).not.toBeNull();
      expect(createdGrantNumberLink.grantNumber).toEqual('14CH123');
      expect(createdGrantNumberLink.grantId).toEqual(GRANT_ID + 2);
    });
  });
  describe('ttaByReviews', () => {
    // ttaByReviews is a stub function that returns some sample data currently,
    // so this test just ensures it returns an array for coverage purposes.
    it('returns an array', async () => {
      const data = await ttaByReviews(RECIPIENT_ID, REGION_ID);
      expect(Array.isArray(data)).toBe(true);
    });
  });
  describe('ttaByCitations', () => {
    // ttaByCitations is a stub function that returns some sample data currently,
    // so this test just ensures it returns an array for coverage purposes.
    it('returns an array', async () => {
      const data = await ttaByCitations(RECIPIENT_ID, REGION_ID);
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
