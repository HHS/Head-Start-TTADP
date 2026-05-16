import moment from 'moment';
import { v4 as uuid } from 'uuid';
import db from '../models';
import { ttaByReviews } from './monitoring';
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
const GRANT_ID = 710000 + TEST_NUM;
const REVIEW_ID = uuid();
const GRANTEE_ID = uuid();
const REVIEW_STATUS_ID = 70602;
const FINDING_STATUS_ID = 80602;
const CONTENT_ID = uuid();
const STANDARD_ID = 90602;

describe('ttaByReviews', () => {
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

    const arocResult = await createReportAndCitationData(GRANT_NUMBER, findingId);

    goal = arocResult.goal;
    objectives = arocResult.objectives;
    reports = arocResult.reports;
    topic = arocResult.topic;
    citations = arocResult.citations;
  });

  afterAll(async () => {
    await destroyReportAndCitationData(goal, objectives, reports, topic, citations);

    await destroyAdditionalMonitoringData(findingId, reviewId, {
      statusId: FINDING_STATUS_ID,
      standardId: STANDARD_ID,
    });
    await destroyMonitoringData(GRANT_NUMBER, REVIEW_ID, REVIEW_STATUS_ID);

    await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
    await Grant.destroy({ where: { number: GRANT_NUMBER }, force: true, individualHooks: true });
    await Recipient.destroy({ where: { id: RECIPIENT_ID }, force: true, individualHooks: true });
    await db.sequelize.close();
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

      // DeliveredReview is on GRANT_ID only
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
        where: { grantId: GRANT_ID, deliveredReviewId: mismatchDeliveredReviewId },
        defaults: { grantId: GRANT_ID, deliveredReviewId: mismatchDeliveredReviewId },
      });

      // Citation is on GRANT_ID_B only — no overlap with the review's grant
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
        where: { grantId: GRANT_ID_B, citationId: mismatchCitationId },
        defaults: { grantId: GRANT_ID_B, citationId: mismatchCitationId },
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
      await GrantCitation.destroy({
        where: { grantId: GRANT_ID_B, citationId: mismatchCitationId },
        force: true,
      });
      await Citation.destroy({ where: { id: mismatchCitationId }, force: true });
      await GrantDeliveredReview.destroy({
        where: { grantId: GRANT_ID, deliveredReviewId: mismatchDeliveredReviewId },
        force: true,
      });
      await DeliveredReview.destroy({ where: { id: mismatchDeliveredReviewId }, force: true });
      // GrantNumberLink is auto-created by the Grant hook and still used by the legacy
      // monitoringData() widget; remove this line once that path is refactored.
      await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER_B }, force: true });
      await Grant.destroy({
        where: { number: GRANT_NUMBER_B },
        force: true,
        individualHooks: true,
      });
    });

    it('excludes a finding where citation grants and review grants do not overlap', async () => {
      const data = await ttaByReviews(RECIPIENT_ID, REGION_ID);
      const mismatchReview = data.find((r) => r.name === 'MISMATCH-REVIEW');
      expect(mismatchReview).toBeDefined();
      const mismatchFinding = mismatchReview.findings.find(
        (f) => f.citation === 'MISMATCH-CITATION'
      );
      expect(mismatchFinding).toBeUndefined();
    });
  });

  it('fetches TTA, ordered by review', async () => {
    const data = await ttaByReviews(RECIPIENT_ID, REGION_ID);

    expect(data).toStrictEqual([
      {
        findings: [
          {
            category: 'source',
            citation: '1234',
            correctionDeadline: expect.any(String),
            findingType: 'Deficiency',
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
                status: 'In Progress',
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
                    roles: expect.arrayContaining(['NC', 'SS']),
                  },
                  {
                    name: 'Hermione Granger, NC, SS',
                    roles: expect.arrayContaining(['SS', 'NC']),
                  },
                ],
                status: 'In Progress',
                title: expect.any(String),
                topics: ['Spleunking'],
              },
            ],
            status: 'Complete',
          },
        ],
        grants: [GRANT_NUMBER],
        id: expect.any(Number),
        lastTTADate: moment().format('MM/DD/YYYY'),
        name: 'REVIEW!!!',
        outcome: 'Complete',
        reviewReceived: '02/22/2025',
        reviewType: 'FA-1',
        specialists: [
          {
            name: 'Hermione Granger, NC, SS',
            roles: expect.arrayContaining(['SS', 'NC']),
          },
        ],
      },
    ]);
  });
});
