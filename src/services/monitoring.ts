/* eslint-disable max-len */
import db from '../models';

const {
  Grant,
  Recipient,
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

export async function monitoringData(recipientId: number, regionId: number): Promise<IMonitoringResponse[]> {
  const recipientWithMonitoring = await Recipient.findOne({
    attributes: ['id'],
    where: { id: recipientId },
    include: [{
      model: Grant,
      attributes: ['id', 'recipientId', 'regionId', 'number'],
      where: { regionId },
      required: true,
      as: 'grants',
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
              ],
              // only get the most recent review
              // limit: 1,
              // order: [['reportDeliveryDate', 'DESC']],
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
    }],
  });

  if (!recipientWithMonitoring) {
    return [];
  }

  //   recipientId, // from request
  //   regionId, // from request
  //   reviewStatus: 'Compliant', status.name from recipient.grants.monitoringReviewGrantees.monitoringReview
  //   reviewDate: '05/01/2023', reportDeliveryDate from recipient.grants.monitoringReviewGrantees.monitoringReview
  //   reviewType: 'FA-2', // reviewType from recipient.grants.monitoringReviewGrantees.monitoringReview

  const { grants } = recipientWithMonitoring;
  return grants.map((grant: IGrant) => {
    const { monitoringReviewGrantees } = grant;
    const { monitoringReview } = monitoringReviewGrantees[0];
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
