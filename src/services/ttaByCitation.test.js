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

const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = '01HP044446';
const GRANT_ID = 665;
const UNMATCHED_REVIEW_UUID = '00000000-0000-0000-0000-000000000000';

const expectedCitationResponse = (findingId) => ([
  {
    category: 'source',
    citationNumber: '1234',
    findingType: 'determination',
    grantNumbers: [
      '01HP044446',
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
    status: 'Complete',
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
    } = await createMonitoringData(GRANT_NUMBER);

    const result = await createAdditionalMonitoringData(
      createdFindingId,
      createdReviewId,
      granteeId,
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
    try {
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

        await GrantCitation.destroy({
          where: { grantId: GRANT_ID },
          force: true,
        });

        await GrantDeliveredReview.destroy({
          where: { grantId: GRANT_ID },
          force: true,
        });

        if (factCitationIds.length > 0) {
          await Citation.destroy({
            where: { id: factCitationIds },
            force: true,
          });
        }
      }

      if (reviewId) {
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
        await destroyAdditionalMonitoringData(findingId, reviewId);
      }

      await destroyMonitoringData(GRANT_NUMBER);
      await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
      await Grant.destroy({ where: { number: GRANT_NUMBER }, force: true, individualHooks: true });
    } finally {
      await db.sequelize.close();
    }
  });

  it('fetches TTA, ordered by Citations', async () => {
    await updateMonitoringFactTables();

    const data = await ttaByCitations(
      RECIPIENT_ID,
      REGION_ID,
    );

    expect(data).toStrictEqual(expectedCitationResponse(findingId));
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
