import { v4 as uuid } from 'uuid';
import db from '../models';
import { classScore, monitoringData, ttaByCitations, ttaByReviews } from './monitoring';

const { Grant, GrantNumberLink, DeliveredReview, GrantDeliveredReview } = db;

const TEST_KEY = uuid().replace(/-/g, '').slice(0, 8).toUpperCase();
const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = `01HP${TEST_KEY}`;
const GRANT_ID = 720000 + parseInt(TEST_KEY.slice(0, 6), 16);
const CLASS_SCORE_MRID = 850000 + (GRANT_ID % 40000);

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
    let classScoreDeliveredReviewId;

    beforeAll(async () => {
      const [dr] = await DeliveredReview.findOrCreate({
        where: { mrid: CLASS_SCORE_MRID },
        defaults: {
          mrid: CLASS_SCORE_MRID,
          review_type: 'CLASS',
          outcome: 'Complete',
          report_delivery_date: '2025-05-22',
          review_status: 'Complete',
          review_name: 'Test CLASS Review',
          class_es: '6.2303',
          class_co: '5.2303',
          class_is: '3.2303',
        },
      });
      classScoreDeliveredReviewId = dr.id;

      await GrantDeliveredReview.findOrCreate({
        where: { grantId: GRANT_ID, deliveredReviewId: classScoreDeliveredReviewId },
        defaults: { grantId: GRANT_ID, deliveredReviewId: classScoreDeliveredReviewId },
      });
    });

    afterAll(async () => {
      await GrantDeliveredReview.destroy({
        where: { grantId: GRANT_ID, deliveredReviewId: classScoreDeliveredReviewId },
        force: true,
      });
      await DeliveredReview.destroy({
        where: { id: classScoreDeliveredReviewId },
        force: true,
      });
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
      jest.spyOn(GrantDeliveredReview, 'findOne').mockResolvedValueOnce(null);

      const data = await classScore({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).toEqual({});
    });

    it('returns an empty object when the score date is before 2020-11-09', async () => {
      jest.spyOn(GrantDeliveredReview, 'findOne').mockResolvedValueOnce({
        deliveredReview: {
          report_delivery_date: '2020-10-01',
          class_es: '6.2303',
          class_co: '5.2303',
          class_is: '3.2303',
        },
      });

      const data = await classScore({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).toEqual({});
    });

    it('returns an empty object when the grant is a CDI grant', async () => {
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
      await Grant.update(
        {
          latestMonitoringReviewDate: '2025-02-22',
          latestMonitoringReviewType: 'FA-1',
          latestMonitoringReviewOutcome: 'Complete',
        },
        { where: { id: GRANT_ID } }
      );
    });

    afterAll(async () => {
      await Grant.update(
        {
          latestMonitoringReviewDate: null,
          latestMonitoringReviewType: null,
          latestMonitoringReviewOutcome: null,
        },
        { where: { id: GRANT_ID } }
      );
    });

    it('returns null when no grant matches the recipient and region', async () => {
      const data = await monitoringData({
        recipientId: 7,
        regionId: 12,
        grantNumber: '09CH0333343',
      });

      expect(data).toEqual(null);
    });

    it('returns null when the grant has no cached monitoring review', async () => {
      jest
        .spyOn(Grant, 'findOne')
        .mockResolvedValueOnce(
          Grant.build({ number: GRANT_NUMBER, recipientId: RECIPIENT_ID, regionId: REGION_ID })
        );

      const data = await monitoringData({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      expect(data).toEqual(null);
    });

    it('returns data in the correct format', async () => {
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
