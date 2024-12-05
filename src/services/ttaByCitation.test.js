import { ttaByCitations } from './monitoring';
import {
  createAdditionalMonitoringData,
  createMonitoringData,
  destroyAdditionalMonitoringData,
  destroyMonitoringData,
} from './monitoring.testHelpers';
import db from '../models';

const {
  Grant,
  GrantNumberLink,
} = db;

const RECIPIENT_ID = 9;
const REGION_ID = 1;
const GRANT_NUMBER = '01HP044446';
const GRANT_ID = 665;

describe('ttaByCitations', () => {
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

  it('fetches TTA, ordered by Citations', async () => {
    const data = await ttaByCitations(
      RECIPIENT_ID,
      REGION_ID,
    );

    expect(data).toStrictEqual([
      {
        category: 'source',
        citationNumber: '1234',
        findingType: 'Finding Type',
        grantNumbers: [
          '01HP044446',
        ],
        lastTTADate: null,
        reviews: [
          {
            findingStatus: 'Complete',
            name: 'REVIEW!!!',
            objectives: [],
            outcome: 'Complete',
            reviewReceived: '02/22/2023',
            reviewType: 'FA-1',
            specialists: [],
          },
        ],
        status: 'Complete',
      },
    ]);
  });
});
