import { Sequelize } from 'sequelize';
import { v4 as uuid } from 'uuid';
import { uniqueTestId } from '../../../fakerUnique';
import { nestedRawish } from '../../../lib/modelUtils';
import {
  createMonitoringData,
  destroyMonitoringData,
} from '../../../services/monitoring.testHelpers';
import db from '../..';

const {
  Grant,
  GrantNumberLink,
  MonitoringClassSummary,
  MonitoringGranteeLink,
  MonitoringReview,
  MonitoringReviewLink,
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringReviewStatusLink,
  Recipient,
} = db;

describe('MonitoringClassSummary', () => {
  // The suite creates its own monitoring data instead of reading seed rows, which other
  // suites sharing the database can change. Every key is unique to this run, so the
  // cleanup in destroyMonitoringData (which deletes by status id) only touches these rows.
  const grantNumber = `09UT${uniqueTestId()}`;
  const reviewId = uuid();
  const granteeId = uuid();
  const statusId = uniqueTestId();
  let recipient;
  let grant;
  let classSummary;

  beforeAll(async () => {
    recipient = await Recipient.create({
      id: uniqueTestId(),
      name: `Monitoring class summary recipient ${grantNumber}`,
      uei: 'NNA5N2KHMGN2',
    });
    grant = await Grant.create({
      id: uniqueTestId(),
      number: grantNumber,
      recipientId: recipient.id,
      regionId: 9,
      status: 'Active',
    });
    await createMonitoringData(grantNumber, reviewId, granteeId, statusId, uuid());
    classSummary = await MonitoringClassSummary.create({
      reviewId,
      grantNumber,
      emotionalSupport: 6.2303,
      classroomOrganization: 5.2303,
      instructionalSupport: 3.2303,
      reportDeliveryDate: new Date('2023/05/23'),
      hash: `classsummary-${reviewId}`,
      sourceCreatedAt: new Date('2023/05/23'),
      sourceUpdatedAt: new Date('2023/05/23'),
    });
  });

  afterAll(async () => {
    await MonitoringClassSummary.destroy({ where: { id: classSummary.id }, force: true });
    await destroyMonitoringData(grantNumber, reviewId, statusId);
    await MonitoringGranteeLink.destroy({ where: { granteeId }, force: true });
    await Grant.destroy({ where: { id: grant.id }, force: true, individualHooks: true });
    await GrantNumberLink.destroy({ where: { grantNumber }, force: true });
    await Recipient.destroy({ where: { id: recipient.id }, force: true });
  });

  it('findAll', async () => {
    const data = await MonitoringClassSummary.findAll({
      include: [
        {
          as: 'monitoringReviewLink',
          model: MonitoringReviewLink,
          attributes: [],
          required: false,
          include: [
            {
              as: 'monitoringReviews',
              model: MonitoringReview,
              attributes: [],
              required: false,
            },
          ],
        },
        {
          as: 'grantNumberLink',
          model: GrantNumberLink,
          attributes: [],
          required: false,
          include: [
            {
              as: 'grant',
              model: Grant,
              attributes: [],
              required: false,
            },
          ],
        },
      ],
      attributes: [
        'grantNumber',
        'emotionalSupport',
        'classroomOrganization',
        'instructionalSupport',
        // Use Sequelize.literal to reference nested attributes
        // eslint-disable-next-line @typescript-eslint/quotes
        [
          Sequelize.literal(`"monitoringReviewLink->monitoringReviews"."outcome"`),
          'monitoringReviewOutcome',
        ],
        // eslint-disable-next-line @typescript-eslint/quotes
        [
          Sequelize.literal(`"monitoringReviewLink->monitoringReviews"."reviewType"`),
          'monitoringReviewType',
        ],
        // eslint-disable-next-line @typescript-eslint/quotes
        [Sequelize.literal(`"grantNumberLink->grant"."status"`), 'grantStatus'],
      ],
      where: { grantNumber },
    });
    expect(nestedRawish(data)).toMatchObject([
      {
        classroomOrganization: '5.2303',
        emotionalSupport: '6.2303',
        grantNumber,
        grantStatus: 'Active',
        instructionalSupport: '3.2303',
        monitoringReviewOutcome: 'Complete',
        monitoringReviewType: 'FA-1',
      },
    ]);
  });
  it('use case', async () => {
    const grants = await Grant.findAll({
      attributes: ['id', 'recipientId', 'regionId', 'number'],
      where: {
        // regionId,
        // recipientId,
        number: grantNumber, // since we query by grant number, there can only be one anyways
      },
      required: true,
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [],
        },
        {
          model: GrantNumberLink,
          as: 'grantNumberLink',
          attributes: ['id'],
          required: true,
          include: [
            {
              model: MonitoringReviewGrantee,
              attributes: ['id', 'grantNumber', 'reviewId'],
              required: true,
              as: 'monitoringReviewGrantees',
              include: [
                {
                  model: MonitoringReviewLink,
                  as: 'monitoringReviewLink',
                  attributes: ['id'],
                  include: [
                    {
                      model: MonitoringReview,
                      as: 'monitoringReviews',
                      attributes: [
                        // 'reportDeliveryDate', - excluded from test because dates are hard to match
                        'id',
                        'reviewType',
                        'reviewId',
                        'statusId',
                      ],
                      required: true,
                      include: [
                        {
                          model: MonitoringReviewStatusLink,
                          as: 'statusLink',
                          required: true,
                          attributes: ['id'],
                          include: [
                            {
                              attributes: ['id', 'name', 'statusId'],
                              model: MonitoringReviewStatus,
                              as: 'monitoringReviewStatuses',
                              required: true,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const grantNumberLink = await GrantNumberLink.findOne({ where: { grantNumber } });
    const reviewGrantee = await MonitoringReviewGrantee.findOne({
      where: { grantNumber, reviewId },
    });
    const reviewLink = await MonitoringReviewLink.findOne({ where: { reviewId } });
    const review = await MonitoringReview.findOne({ where: { reviewId } });
    const statusLink = await MonitoringReviewStatusLink.findOne({ where: { statusId } });
    const status = await MonitoringReviewStatus.findOne({ where: { statusId } });

    expect(nestedRawish(grants)).toMatchObject([
      {
        id: grant.id,
        recipientId: recipient.id,
        regionId: 9,
        number: grantNumber,
        grantNumberLink: {
          id: grantNumberLink.id,
          monitoringReviewGrantees: [
            {
              id: reviewGrantee.id,
              grantNumber,
              reviewId,
              monitoringReviewLink: {
                id: reviewLink.id,
                monitoringReviews: [
                  {
                    id: review.id,
                    reviewType: 'FA-1',
                    reviewId,
                    statusId,
                    statusLink: {
                      id: statusLink.id,
                      monitoringReviewStatuses: [
                        {
                          id: status.id,
                          name: 'Complete',
                          statusId,
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
  });
});
