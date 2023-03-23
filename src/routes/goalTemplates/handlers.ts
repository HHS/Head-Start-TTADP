/* eslint-disable import/prefer-default-export */
import { Request, Response } from 'express';
import handleErrors from '../../lib/apiErrorHandler';
import { getCuratedTemplates } from '../../services/goalTemplates';

export async function getGoalTemplates(req: Request, res: Response) {
  try {
    const templates = await getCuratedTemplates();
    res.json(templates);
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getGoalTemplates');
  }
}
