import db from '../models';

const {
  Grant,
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringReview,
} = db;

interface IMonitoringReview {
  reportDeliveryDate: string;
  id: number;
  reviewType: string;
  status: {
    name: string;
  };
}

interface IMonitoringReviewGrantee {
  id: number;
  grantId: number;
  reviewId: number;
  monitoringReview: IMonitoringReview;
}

interface IGrant {
  id: number;
  recipientId: number;
  regionId: number;
  number: string;
  monitoringReviewGrantees: IMonitoringReviewGrantee[];
}

interface IMonitoringResponse {
  recipientId: number;
  regionId: number;
  reviewStatus: string;
  reviewDate: string;
  reviewType: string;
  grant: string;
}

export async function monitoringData(
  recipientId: number,
  regionId: number,
): Promise<IMonitoringResponse[]> {
  const grants = await Grant.findAll({
    attributes: ['id', 'recipientId', 'regionId', 'number'],
    where: { regionId, recipientId },
    required: true,
    include: [
      {
        model: MonitoringReviewGrantee,
        attributes: ['id', 'grantNumber', 'reviewId'],
        required: true,
        as: 'monitoringReviewGrantees',
        include: [
          {
            model: MonitoringReview,
            as: 'monitoringReview',
            attributes: [
              'reportDeliveryDate',
              'id',
              'reviewType',
              'reviewId',
            ],
            required: true,
            include: [
              {
                attributes: ['id', 'name', 'statusId'],
                model: MonitoringReviewStatus,
                as: 'status',
                required: true,
              },
            ],
          },
        ],
      },
    ],
  });

  return grants.map((grant: IGrant) => {
    const { monitoringReviewGrantees } = grant;

    // get the most recent review
    const monitoringReviews = monitoringReviewGrantees.map(
      (review: IMonitoringReviewGrantee) => review.monitoringReview,
    );
    const monitoringReview = monitoringReviews.reduce((a, b) => {
      if (a.reportDeliveryDate > b.reportDeliveryDate) {
        return a;
      }
      return b;
    }, monitoringReviews[0]);

    const { status } = monitoringReview;

    return {
      recipientId: grant.recipientId,
      regionId: grant.regionId,
      reviewStatus: status.name,
      reviewDate: monitoringReview.reportDeliveryDate,
      reviewType: monitoringReview.reviewType,
      grant: grant.number,
    };
  });
}

export async function classScore(recipientId: number, regionId: number) {
  return {
    recipientId,
    regionId,
    received: '05/01/2023',
    ES: 6,
    CO: 3,
    IS: 7,
  };
}
