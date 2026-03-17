import { v4 as uuid } from 'uuid';
import { Op } from 'sequelize';
import { ttaByCitations, mapFindingType } from './monitoring';
import updateMonitoringFactTables from '../tools/updateMonitoringFactTables';
import {
  createAdditionalMonitoringData,
  createMonitoringData,
  createReportAndCitationData,
  destroyAdditionalMonitoringData,
  destroyMonitoringData,
  destroyReportAndCitationData,
} from './monitoring.testHelpers';
import db from '../models';
import { OBJECTIVE_STATUS } from '../constants';

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
const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = `01HP${TEST_KEY}`;
const GRANT_ID = 700000 + parseInt(TEST_KEY.slice(0, 6), 16);
const EMPTY_RECIPIENT_ID = 999999;
const UNMATCHED_REVIEW_UUID = '00000000-0000-0000-0000-000000000000';
const REVIEW_ID = uuid();
const GRANTEE_ID = uuid();
const REVIEW_STATUS_ID = 70601;
const FINDING_STATUS_ID = 80601;
const CONTENT_ID = uuid();
const STANDARD_ID = 90601;

const expectedCitationResponse = (findingId, status = 'Complete') => ([
  {
    category: 'source',
    citationNumber: '1234',
    findingType: 'determination',
    grantNumbers: [
      GRANT_NUMBER,
    ],
    lastTTADate: expect.any(String),
    reviews: [
      {
        findingStatus: 'Complete',
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
            findingIds: [
              findingId,
            ],
            grantNumber: GRANT_NUMBER,
            reviewNames: [
              'REVIEW!!!',
            ],
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
            topics: [
              'Spleunking',
            ],
          },
          {
            activityReports: [
              {
                displayId: expect.any(String),
                id: expect.any(Number),
              },
            ],
            endDate: expect.any(String),
            findingIds: [
              findingId,
            ],
            grantNumber: GRANT_NUMBER,
            reviewNames: [
              'REVIEW!!!',
            ],
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
            topics: [
              'Spleunking',
            ],
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
]);

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
      CONTENT_ID,
    );

    const result = await createAdditionalMonitoringData(
      createdFindingId,
      createdReviewId,
      granteeId,
      {
        statusId: FINDING_STATUS_ID,
        standardId: STANDARD_ID,
      },
    );
    findingId = result.findingId;
    reviewId = result.reviewId;

    const arocResult = await createReportAndCitationData(
      GRANT_NUMBER,
      findingId,
    );

    goal = arocResult.goal;
    objectives = arocResult.objectives;
    reports = arocResult.reports;
    topic = arocResult.topic;
    citations = arocResult.citations;
  });

  afterAll(async () => {
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
        where: {
          review_uuid: {
            [Op.in]: [reviewId, UNMATCHED_REVIEW_UUID],
          },
        },
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
        where: {
          review_uuid: {
            [Op.in]: [reviewId, UNMATCHED_REVIEW_UUID],
          },
        },
        force: true,
      });
    }

    if (goal && objectives && reports && topic && citations) {
      await destroyReportAndCitationData(
        goal,
        objectives,
        reports,
        topic,
        citations,
      );
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
    await db.sequelize.close();
  });

  it('fetches TTA, ordered by Citations', async () => {
    await updateMonitoringFactTables();

    const data = await ttaByCitations(
      RECIPIENT_ID,
      REGION_ID,
    );

    expect(data).toStrictEqual(expectedCitationResponse(findingId));
  });

  it('returns no citations when the recipient has no grants in the region', async () => {
    const data = await ttaByCitations(
      EMPTY_RECIPIENT_ID,
      REGION_ID,
    );

    expect(data).toStrictEqual([]);
  });

  it('prefers calculated status when it differs from raw status', async () => {
    await updateMonitoringFactTables();

    await Citation.update(
      {
        raw_status: 'Corrected',
        calculated_status: 'Active',
      },
      { where: { finding_uuid: findingId } },
    );

    const data = await ttaByCitations(
      RECIPIENT_ID,
      REGION_ID,
    );

    expect(data).toStrictEqual(expectedCitationResponse(findingId, 'Active'));
  });

  it('returns no citations when fact-table reviews cannot be matched', async () => {
    await updateMonitoringFactTables();

    await DeliveredReview.update(
      { review_uuid: UNMATCHED_REVIEW_UUID },
      { where: { review_uuid: reviewId } },
    );

    const data = await ttaByCitations(
      RECIPIENT_ID,
      REGION_ID,
    );

    expect(data).toStrictEqual([]);
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
