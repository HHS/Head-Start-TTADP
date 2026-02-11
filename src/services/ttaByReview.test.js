import moment from 'moment';
import {
  createAdditionalMonitoringData,
  createMonitoringData,
  createReportAndCitationData,
  destroyAdditionalMonitoringData,
  destroyMonitoringData,
  destroyReportAndCitationData,
} from './monitoring.testHelpers';
import { ttaByReviews } from './monitoring';
import db from '../models';

const {
  Grant,
  GrantNumberLink,
  Recipient,
} = db;

const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = '01HP044446';
const GRANT_ID = 665;

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
    } = await createMonitoringData(GRANT_NUMBER);

    const result = await createAdditionalMonitoringData(
      createdFindingId,
      createdReviewId,
      granteeId,
    ); findingId = result.findingId;
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
    await destroyMonitoringData(GRANT_NUMBER);
    await destroyAdditionalMonitoringData(findingId, reviewId);

    await destroyReportAndCitationData(
      goal,
      objectives,
      reports,
      topic,
      citations,
    );

    await GrantNumberLink.destroy({ where: { grantNumber: GRANT_NUMBER }, force: true });
    await Grant.destroy({ where: { number: GRANT_NUMBER }, force: true, individualHooks: true });
    await db.sequelize.close();
  });
  it('fetches TTA, ordered by review', async () => {
    const data = await ttaByReviews(
      RECIPIENT_ID,
      REGION_ID,
    );

    expect(data).toStrictEqual([
      {
        findings: [
          {
            category: 'source',
            citation: '1234',
            correctionDeadline: expect.any(String),
            findingType: 'determination',
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
                grantNumber: '01HP044446',
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
                status: 'In Progress',
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
                grantNumber: '01HP044446',
                reviewNames: [
                  'REVIEW!!!',
                ],
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
                topics: [
                  'Spleunking',
                ],
              },
            ],
            status: 'Complete',
          },
        ],
        grants: [
          '01HP044446',
        ],
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
