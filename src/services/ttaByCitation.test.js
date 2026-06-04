import { v4 as uuid } from 'uuid';
import { OBJECTIVE_STATUS } from '../constants';
import db from '../models';
import updateMonitoringFactTables from '../tools/updateMonitoringFactTables';
import { mapFindingType, ttaByCitations } from './monitoring';
import {
  createAdditionalMonitoringData,
  createMonitoringData,
  createReportAndCitationData,
  destroyAdditionalMonitoringData,
  destroyMonitoringData,
  destroyReportAndCitationData,
} from './monitoring.testHelpers';

const {
  Grant,
  GrantNumberLink,
  Recipient,
  Citation,
  DeliveredReview,
  DeliveredReviewCitation,
  GrantCitation,
  GrantDeliveredReview,
} = db;

const TEST_KEY = uuid().replace(/-/g, '').slice(0, 8).toUpperCase();
const TEST_NUM = parseInt(TEST_KEY.slice(0, 6), 16);
const RECIPIENT_ID = 900000 + TEST_NUM;
const REGION_ID = 1;
const GRANT_NUMBER = `01HP${TEST_KEY}`;
const GRANT_ID = 700000 + TEST_NUM;
const EMPTY_RECIPIENT_ID = RECIPIENT_ID + 1;
const REVIEW_ID = uuid();
const GRANTEE_ID = uuid();
const REVIEW_STATUS_ID = 70601;
const FINDING_STATUS_ID = 80601;
const CONTENT_ID = uuid();
const STANDARD_ID = 90601;

const expectedCitationResponse = (findingId, status = 'Complete') => [
  {
    category: 'source',
    citationId: expect.any(Number),
    citationNumber: '1234',
    findingType: 'Deficiency',
    grantNumbers: [GRANT_NUMBER],
    lastTTADate: expect.any(String),
    reviews: [
      {
        name: 'REVIEW!!!',
        objectives: [
          {
            activityReports: [
              {
                displayId: expect.any(String),
                id: expect.any(Number),
              },
            ],
            endDate: expect.any(String),
            findingIds: [findingId],
            grantNumber: GRANT_NUMBER,
            reviewNames: ['REVIEW!!!'],
            specialists: [
              {
                name: 'Hermione Granger, NC, SS',
                roles: expect.arrayContaining(['SS', 'NC']),
              },
              {
                name: 'Hermione Granger, NC, SS',
                roles: expect.arrayContaining(['SS', 'NC']),
              },
            ],
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            title: expect.any(String),
            topics: ['Spleunking'],
          },
          {
            activityReports: [
              {
                displayId: expect.any(String),
                id: expect.any(Number),
              },
            ],
            endDate: expect.any(String),
            findingIds: [findingId],
            grantNumber: GRANT_NUMBER,
            reviewNames: ['REVIEW!!!'],
            specialists: [
              {
                name: 'Hermione Granger, NC, SS',
                roles: expect.arrayContaining(['SS']),
              },
              {
                name: 'Hermione Granger, NC, SS',
                roles: expect.arrayContaining(['SS']),
              },
            ],
            status: OBJECTIVE_STATUS.IN_PROGRESS,
            title: expect.any(String),
            topics: ['Spleunking'],
          },
        ],
        outcome: 'Complete',
        reviewReceived: '02/22/2025',
        reviewType: 'FA-1',
        specialists: [
          {
            name: 'Hermione Granger, NC, SS',
            roles: expect.arrayContaining(['SS']),
          },
        ],
      },
    ],
    status,
  },
];

describe('ttaByCitations', () => {
  let findingId;
  let reviewId;

  let goal;
  let objectives;
  let reports;
  let topic;
  let citations;

  beforeAll(async () => {
    await Recipient.findOrCreate({
      where: { id: RECIPIENT_ID },
      defaults: {
        id: RECIPIENT_ID,
        name: 'RECIPIENT',
      },
    });

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

    const {
      reviewId: createdReviewId,
      findingId: createdFindingId,
      granteeId,
    } = await createMonitoringData(
      GRANT_NUMBER,
      REVIEW_ID,
      GRANTEE_ID,
      REVIEW_STATUS_ID,
      CONTENT_ID
    );

    const result = await createAdditionalMonitoringData(
      createdFindingId,
      createdReviewId,
      granteeId,
      {
        statusId: FINDING_STATUS_ID,
        standardId: STANDARD_ID,
      }
    );
    findingId = result.findingId;
    reviewId = result.reviewId;

    const arocResult = await createReportAndCitationData(GRANT_NUMBER, findingId, reviewId);

    goal = arocResult.goal;
    objectives = arocResult.objectives;
    reports = arocResult.reports;
    topic = arocResult.topic;
    citations = arocResult.citations;
  });

  afterAll(async () => {
    if (goal && objectives && reports && topic && citations) {
      await destroyReportAndCitationData(goal, objectives, reports, topic, citations);
    }

    if (findingId) {
      const factCitations = await Citation.findAll({
        attributes: ['id'],
        where: {
          finding_uuid: findingId,
        },
      });

      const factCitationIds = factCitations.map((citation) => citation.id);

      if (factCitationIds.length > 0) {
        await DeliveredReviewCitation.destroy({
          where: { citationId: factCitationIds },
          force: true,
        });
      }

      if (factCitationIds.length > 0) {
        await GrantCitation.destroy({
          where: {
            grantId: GRANT_ID,
            citationId: factCitationIds,
          },
          force: true,
        });

        await Citation.destroy({
          where: { id: factCitationIds },
          force: true,
        });
      }
    }

    if (reviewId) {
      const deliveredReviews = await DeliveredReview.findAll({
        attributes: ['id'],
        where: { review_uuid: reviewId },
      });

      const deliveredReviewIds = deliveredReviews.map((review) => review.id);

      if (deliveredReviewIds.length > 0) {
        await GrantDeliveredReview.destroy({
          where: {
            grantId: GRANT_ID,
            deliveredReviewId: deliveredReviewIds,
          },
          force: true,
        });
      }

      await DeliveredReview.destroy({
        where: { review_uuid: reviewId },
        force: true,
      });
    }

    if (findingId && reviewId) {
      await destroyAdditionalMonitoringData(findingId, reviewId, {
        statusId: FINDING_STATUS_ID,
        standardId: STANDARD_ID,
      });
    }

    await destroyMonitoringData(GRANT_NUMBER, REVIEW_ID, REVIEW_STATUS_ID);
    await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
    await Grant.destroy({ where: { number: GRANT_NUMBER }, force: true, individualHooks: true });
    await Recipient.destroy({ where: { id: RECIPIENT_ID }, force: true, individualHooks: true });
    await db.sequelize.close();
  });

  it('fetches TTA, ordered by Citations', async () => {
    await updateMonitoringFactTables();

    const data = await ttaByCitations(RECIPIENT_ID, REGION_ID);

    expect(data).toStrictEqual(expectedCitationResponse(findingId));
  });

  it('returns no citations when the recipient has no grants in the region', async () => {
    const data = await ttaByCitations(EMPTY_RECIPIENT_ID, REGION_ID);

    expect(data).toStrictEqual([]);
  });

  it('prefers calculated status when it differs from raw status', async () => {
    await updateMonitoringFactTables();

    await Citation.update(
      {
        raw_status: 'Corrected',
        calculated_status: 'Active',
      },
      { where: { finding_uuid: findingId } }
    );

    const data = await ttaByCitations(RECIPIENT_ID, REGION_ID);

    expect(data).toStrictEqual(expectedCitationResponse(findingId, 'Active'));
  });

  describe('grant overlap enforcement', () => {
    const GRANT_ID_B = GRANT_ID + 1000;
    const GRANT_NUMBER_B = `01HP${TEST_KEY}B`;
    let mismatchCitationId;
    let mismatchDeliveredReviewId;

    beforeAll(async () => {
      await Grant.findOrCreate({
        where: { number: GRANT_NUMBER_B },
        defaults: {
          id: GRANT_ID_B,
          regionId: REGION_ID,
          number: GRANT_NUMBER_B,
          recipientId: RECIPIENT_ID,
          status: 'Active',
          startDate: '2024-02-12 14:31:55.74-08',
          endDate: '2024-02-12 14:31:55.74-08',
          cdi: false,
        },
      });

      // Citation is on GRANT_ID only
      const mismatchFindingUuid = uuid();
      const [mismatchCitation] = await Citation.findOrCreate({
        where: { finding_uuid: mismatchFindingUuid },
        defaults: {
          mfid: GRANT_ID_B,
          finding_uuid: mismatchFindingUuid,
          citation: 'MISMATCH-CITATION',
          raw_status: 'Active',
          calculated_status: 'Active',
          raw_finding_type: 'Deficiency',
          calculated_finding_type: 'Deficiency',
          source_category: 'mismatch-source',
          active: true,
          last_review_delivered: true,
        },
      });
      mismatchCitationId = mismatchCitation.id;

      await GrantCitation.findOrCreate({
        where: { grantId: GRANT_ID, citationId: mismatchCitationId },
        defaults: { grantId: GRANT_ID, citationId: mismatchCitationId },
      });

      // DeliveredReview is on GRANT_ID_B only
      const mismatchReviewUuid = uuid();
      const [mismatchReview] = await DeliveredReview.findOrCreate({
        where: { review_uuid: mismatchReviewUuid },
        defaults: {
          mrid: GRANT_ID_B + 1,
          review_uuid: mismatchReviewUuid,
          review_type: 'FA-1',
          review_name: 'MISMATCH-REVIEW',
          review_status: 'Complete',
          report_delivery_date: '2025-02-22',
          outcome: 'Complete',
          complete: true,
          corrected: false,
        },
      });
      mismatchDeliveredReviewId = mismatchReview.id;

      await GrantDeliveredReview.findOrCreate({
        where: { grantId: GRANT_ID_B, deliveredReviewId: mismatchDeliveredReviewId },
        defaults: { grantId: GRANT_ID_B, deliveredReviewId: mismatchDeliveredReviewId },
      });

      await DeliveredReviewCitation.findOrCreate({
        where: { citationId: mismatchCitationId, deliveredReviewId: mismatchDeliveredReviewId },
        defaults: { citationId: mismatchCitationId, deliveredReviewId: mismatchDeliveredReviewId },
      });
    });

    afterAll(async () => {
      await DeliveredReviewCitation.destroy({
        where: { citationId: mismatchCitationId, deliveredReviewId: mismatchDeliveredReviewId },
        force: true,
      });
      await GrantDeliveredReview.destroy({
        where: { grantId: GRANT_ID_B, deliveredReviewId: mismatchDeliveredReviewId },
        force: true,
      });
      await DeliveredReview.destroy({ where: { id: mismatchDeliveredReviewId }, force: true });
      await GrantCitation.destroy({
        where: { grantId: GRANT_ID, citationId: mismatchCitationId },
        force: true,
      });
      await Citation.destroy({ where: { id: mismatchCitationId }, force: true });
      await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER_B }, force: true });
      await Grant.destroy({
        where: { number: GRANT_NUMBER_B },
        force: true,
        individualHooks: true,
      });
    });

    it('excludes a review where the citation grants and review grants do not overlap', async () => {
      const data = await ttaByCitations(RECIPIENT_ID, REGION_ID);
      const mismatchEntry = data.find((c) => c.citationNumber === 'MISMATCH-CITATION');
      expect(mismatchEntry).toBeUndefined();
    });
  });

  describe('mapFindingType', () => {
    it('returns determination when it exists', () => {
      const result = mapFindingType('Determination Type', 'Original Type');
      expect(result).toBe('Determination Type');
    });

    it('returns original type when determination is null', () => {
      const result = mapFindingType(null, 'Original Type');
      expect(result).toBe('Original Type');
    });

    it('maps Concern to Area of Concern', () => {
      const result = mapFindingType('Concern', 'Original Type');
      expect(result).toBe('Area of Concern');
    });
  });
});
