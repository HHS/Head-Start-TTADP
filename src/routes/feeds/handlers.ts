/* eslint-disable import/prefer-default-export */
import { Request, Response } from 'express';
import { getWhatsNewFeedData } from '../../services/feed';
import handleErrors from '../../lib/apiErrorHandler';

export async function whatsNewFeedHandler(req: Request, res: Response) {
  try {
    const feed = await getWhatsNewFeedData();
    res.send(feed);
  } catch (error) {
    await handleErrors(req, res, error, 'whatsNewFeedHandler');
  }
}
