import db from '../models';

const {
  Grant,
  GrantNumberLink,
  MonitoringReviewGrantee,
  MonitoringReviewStatus,
  MonitoringReview,
  MonitoringReviewLink,
  MonitoringReviewStatusLink,
} = db;

interface IMonitoringReview {
  reportDeliveryDate: Date;
  id: number;
  reviewType: string;
  statusLink: {
    status: {
      name: string;
    }
  };
}

interface IMonitoringReviewGrantee {
  id: number;
  grantId: number;
  reviewId: number;
  monitoringReviewLink: {
    monitoringReviews: IMonitoringReview[];
  }
}

interface IMonitoringResponse {
  recipientId: number;
  regionId: number;
  reviewStatus: string;
  reviewDate: string;
  reviewType: string;
  grant: string;
}

export async function monitoringData({
  recipientId,
  regionId,
  grantNumber,
}: {
  recipientId: number;
  regionId: number;
  grantNumber: string;
}): Promise<IMonitoringResponse> {
  /**
   *
   *
   * because of the way these tables were linked,
   * we cannot use a findOne here, although it is what we really want
   */
  const grants = await Grant.findAll({
    attributes: ['id', 'recipientId', 'regionId', 'number'],
    where: {
      regionId,
      recipientId,
      number: grantNumber, // since we query by grant number, there can only be one anyways
    },
    required: true,
    include: [
      {
        model: GrantNumberLink,
        as: 'grantNumberLink',
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
                required: true,
                include: [
                  {
                    model: MonitoringReview,
                    as: 'monitoringReviews',
                    attributes: [
                      'reportDeliveryDate',
                      'id',
                      'reviewType',
                      'reviewId',
                      'statusId',
                    ],
                    required: true,
                    include: [
                      {
                        attributes: ['id', 'statusId'],
                        model: MonitoringReviewStatusLink,
                        as: 'statusLink',
                        required: true,
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

  const grant = (grants[0]?.toJSON() || null);

  if (!grant) {
    // not an error, it's valid for there to be no findings for a grant
    return null;
  }

  // since all the joins made in the query above are inner joins
  // we can count on the rest of this data being present

  const { monitoringReviewGrantees } = grant.grantNumberLink;

  // get the most recent review
  const monitoringReviews = monitoringReviewGrantees.map(
    (review: IMonitoringReviewGrantee) => review.monitoringReviewLink.monitoringReviews,
  ).flat();

  const monitoringReview = monitoringReviews.reduce((
    a: IMonitoringReview,
    b: IMonitoringReview,
  ) => {
    if (a.reportDeliveryDate > b.reportDeliveryDate) {
      return a;
    }
    return b;
  }, monitoringReviews[0]);

  const { monitoringReviewStatuses } = monitoringReview.statusLink;
  // I am presuming there can only be one status linked to a review
  const [status] = monitoringReviewStatuses;

  return {
    recipientId: grant.recipientId,
    regionId: grant.regionId,
    reviewStatus: status.name,
    reviewDate: monitoringReview.reportDeliveryDate,
    reviewType: monitoringReview.reviewType,
    grant: grant.number,
  };
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
