import type { Request, Response } from 'express';
import handleErrors from '../../lib/apiErrorHandler';
import { getCitationReviewTypes as getCitationReviewTypesService } from '../../services/deliveredReviews';

const namespace = 'HANDLERS:DELIVERED_REVIEWS';
const logContext = {
  namespace,
};

export async function getCitationReviewTypes(req: Request, res: Response) {
  // site access middleware is enough validation
  // to view the review types, since it is non-specific
  // data that is not tied to any specific data point

  try {
    const reviewTypes = await getCitationReviewTypesService();
    return res.json(reviewTypes);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
}
