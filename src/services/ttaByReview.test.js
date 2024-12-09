import {
  createAdditionalMonitoringData,
  createMonitoringData,
  destroyAdditionalMonitoringData,
  destroyMonitoringData,
} from './monitoring.testHelpers';
import { ttaByReviews } from './monitoring';
import db from '../models';

const {
  Grant,
  GrantNumberLink,
} = db;

const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = '01HP044446';
const GRANT_ID = 665;

describe('ttaByReviews', () => {
  let findingId;
  let reviewId;
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

    const {
      reviewId: createdReviewId,
      findingId: createdFindingId,
    } = await createMonitoringData(GRANT_NUMBER);

    const result = await createAdditionalMonitoringData(createdFindingId, createdReviewId);
    findingId = result.findingId;
    reviewId = result.reviewId;
  });

  afterAll(async () => {
    await destroyMonitoringData(GRANT_NUMBER);
    await destroyAdditionalMonitoringData(findingId, reviewId);
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
            correctionDeadline: 'Invalid date',
            findingType: 'Finding Type',
            objectives: [],
            status: 'Complete',
          },
        ],
        grants: [
          '01HP044446',
        ],
        id: expect.any(Number),
        lastTTADate: null,
        name: 'REVIEW!!!',
        outcome: 'Complete',
        reviewReceived: '02/22/2023',
        reviewType: 'FA-1',
        specialists: [],
      },
    ]);
  });
});
