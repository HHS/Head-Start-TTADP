import { v4 as uuid } from 'uuid';
import db from '../models';
import { classScore, monitoringData, ttaByCitations, ttaByReviews } from './monitoring';
import { createMonitoringData, destroyMonitoringData } from './monitoring.testHelpers';

const { Grant, GrantNumberLink, MonitoringClassSummary, DeliveredReview, GrantDeliveredReview } =
  db;

const TEST_KEY = uuid().replace(/-/g, '').slice(0, 8).toUpperCase();
const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = `01HP${TEST_KEY}`;
const GRANT_ID = 720000 + parseInt(TEST_KEY.slice(0, 6), 16);
const CLASS_SCORE_REVIEW_ID = uuid();
const CLASS_SCORE_GRANTEE_ID = uuid();
const CLASS_SCORE_STATUS_ID = 70603;
const CLASS_SCORE_CONTENT_ID = uuid();
// Two MRIDs for monitoringData tests: most-recent (Feb 22) and older (Jun 15)
const MONITORING_DATA_MRID_1 = 900000 + (GRANT_ID % 40000);
const MONITORING_DATA_MRID_2 = MONITORING_DATA_MRID_1 + 1;

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
      await createMonitoringData(
        GRANT_NUMBER,
        CLASS_SCORE_REVIEW_ID,
        CLASS_SCORE_GRANTEE_ID,
        CLASS_SCORE_STATUS_ID,
        CLASS_SCORE_CONTENT_ID
      );
    });
    afterAll(async () => {
      await destroyMonitoringData(GRANT_NUMBER, CLASS_SCORE_REVIEW_ID, CLASS_SCORE_STATUS_ID);
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
    let deliveredReviewId1;
    let deliveredReviewId2;

    beforeAll(async () => {
      const [dr1] = await DeliveredReview.findOrCreate({
        where: { mrid: MONITORING_DATA_MRID_1 },
        defaults: {
          mrid: MONITORING_DATA_MRID_1,
          review_type: 'FA-1',
          outcome: 'Complete',
          report_delivery_date: '2025-02-22',
          review_status: 'Complete',
          review_name: 'Test FA-1 Review',
        },
      });
      deliveredReviewId1 = dr1.id;

      const [dr2] = await DeliveredReview.findOrCreate({
        where: { mrid: MONITORING_DATA_MRID_2 },
        defaults: {
          mrid: MONITORING_DATA_MRID_2,
          review_type: 'RAN',
          outcome: 'Deficiency',
          report_delivery_date: '2024-06-15',
          review_status: 'Complete',
          review_name: 'Test RAN Review',
        },
      });
      deliveredReviewId2 = dr2.id;

      await Promise.all([
        GrantDeliveredReview.findOrCreate({
          where: { grantId: GRANT_ID, deliveredReviewId: deliveredReviewId1 },
          defaults: { grantId: GRANT_ID, deliveredReviewId: deliveredReviewId1 },
        }),
        GrantDeliveredReview.findOrCreate({
          where: { grantId: GRANT_ID, deliveredReviewId: deliveredReviewId2 },
          defaults: { grantId: GRANT_ID, deliveredReviewId: deliveredReviewId2 },
        }),
      ]);
    });

    afterAll(async () => {
      await GrantDeliveredReview.destroy({
        where: { grantId: GRANT_ID, deliveredReviewId: [deliveredReviewId1, deliveredReviewId2] },
        force: true,
      });
      await DeliveredReview.destroy({
        where: { id: [deliveredReviewId1, deliveredReviewId2] },
        force: true,
      });
    });

    it('returns null when nothing is found', async () => {
      const data = await monitoringData({
        recipientId: 7,
        regionId: 12,
        grantNumber: '09CH0333343',
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

    it('returns the most recent review when multiple exist', async () => {
      const data = await monitoringData({
        recipientId: RECIPIENT_ID,
        regionId: REGION_ID,
        grantNumber: GRANT_NUMBER,
      });

      // dr2 has report_delivery_date 2024-06-15 — dr1 (2025-02-22) should win
      expect(data).not.toBeNull();
      expect(data.reviewDate).toEqual('02/22/2025');
      expect(data.reviewType).toEqual('FA-1');
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
