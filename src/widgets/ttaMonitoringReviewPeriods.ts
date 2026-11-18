import { Op } from 'sequelize';
import db from '../models';
import { getRecipientGrantIds } from './trSessionsForRecipient';
import type { IScopes } from './types';

const { DeliveredReview, GrantDeliveredReview } = db;

export default async function ttaMonitoringReviewPeriods(scopes: IScopes): Promise<
  {
    startDate: string;
    endDate: string;
  }[]
> {
  const grantIds = await getRecipientGrantIds(scopes);
  if (!grantIds.length) return [];

  const reviews = (await DeliveredReview.findAll({
    attributes: ['report_start_date', 'report_end_date'],
    where: {
      report_start_date: { [Op.ne]: null },
      report_end_date: { [Op.ne]: null },
    },
    include: [
      {
        model: GrantDeliveredReview,
        as: 'grantDeliveredReviews',
        attributes: [],
        required: true,
        where: { grantId: { [Op.in]: grantIds } },
      },
    ],
    raw: true,
  })) as { report_start_date: string; report_end_date: string }[];

  return reviews.map((review) => ({
    startDate: review.report_start_date,
    endDate: review.report_end_date,
  }));
}
