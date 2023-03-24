/* eslint-disable import/prefer-default-export */
import { Request, Response } from 'express';
import { DECIMAL_BASE } from '../../constants';
import handleErrors from '../../lib/apiErrorHandler';
import { getCuratedTemplates } from '../../services/goalTemplates';

export async function getGoalTemplates(req: Request, res: Response) {
  try {
    const { grantIds } = req.params;

    // ensure we only pass numbers to the service
    const parsedGrantIds = [grantIds].flat().map((id: string) => parseInt(id, DECIMAL_BASE))
      .filter((id: number) => !Number.isNaN(id));

    const templates = await getCuratedTemplates(parsedGrantIds);
    res.json(templates);
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getGoalTemplates');
  }
}
