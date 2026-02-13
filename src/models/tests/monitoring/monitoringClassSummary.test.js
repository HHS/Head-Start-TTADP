import { Sequelize } from 'sequelize'
import db from '../..'
import { nestedRawish } from '../../../lib/modelUtils'

const {
  Grant,
  GrantNumberLink,
  MonitoringClassSummary,
  MonitoringReview,
  MonitoringReviewLink,
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringReviewStatusLink,
  Recipient,
} = db

describe('MonitoringClassSummary', () => {
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
        [Sequelize.literal(`"monitoringReviewLink->monitoringReviews"."outcome"`), 'monitoringReviewOutcome'],
        // eslint-disable-next-line @typescript-eslint/quotes
        [Sequelize.literal(`"monitoringReviewLink->monitoringReviews"."reviewType"`), 'monitoringReviewType'],
        // eslint-disable-next-line @typescript-eslint/quotes
        [Sequelize.literal(`"grantNumberLink->grant"."status"`), 'grantStatus'],
      ],
      where: { grantNumber: '09HP044444' },
    })
    expect(nestedRawish(data)).toMatchObject([
      {
        classroomOrganization: '5.2303',
        emotionalSupport: '6.2303',
        grantNumber: '09HP044444',
        grantStatus: 'Active',
        instructionalSupport: '3.2303',
        monitoringReviewOutcome: 'Deficient',
        monitoringReviewType: 'RAN',
      },
    ])
  })
  it('use case', async () => {
    const grants = await Grant.findAll({
      attributes: ['id', 'recipientId', 'regionId', 'number'],
      where: {
        // regionId,
        // recipientId,
        number: '09CH033333', // since we query by grant number, there can only be one anyways
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
    })
    expect(nestedRawish(grants)).toMatchObject([
      {
        id: 8,
        recipientId: 7,
        regionId: 9,
        number: '09CH033333',
        grantNumberLink: {
          id: 1,
          monitoringReviewGrantees: [
            {
              id: 1,
              grantNumber: '09CH033333',
              reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
              monitoringReviewLink: {
                id: 1,
                monitoringReviews: [
                  {
                    id: 1,
                    reviewType: 'FA-1',
                    reviewId: 'B34336CF-8033-46DD-A4CD-000619B73C54',
                    statusId: 6006,
                    statusLink: {
                      id: 1,
                      monitoringReviewStatuses: [
                        {
                          id: 1,
                          name: 'Complete',
                          statusId: 6006,
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
    ])
  })
})
