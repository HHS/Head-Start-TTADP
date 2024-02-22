/* eslint-disable import/prefer-default-export */
import { Request, Response } from 'express';
import { DECIMAL_BASE } from '@ttahub/common';
import handleErrors from '../../lib/apiErrorHandler';
import {
  getCuratedTemplates,
  getFieldPromptsForCuratedTemplate,
  getOptionsByGoalTemplateFieldPromptName,
} from '../../services/goalTemplates';

export async function getGoalTemplates(req: Request, res: Response) {
  try {
    const { grantIds } = req.query;

    // ensure we only pass numbers to the service
    const parsedGrantIds = [grantIds].flat().map((id: string) => parseInt(id, DECIMAL_BASE))
      .filter((id: number) => !Number.isNaN(id));

    const templates = await getCuratedTemplates(parsedGrantIds);
    res.json(templates);
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getGoalTemplates');
  }
}

export async function getPrompts(req: Request, res: Response) {
  try {
    const { goalTemplateId } = req.params;
    const { goalIds } = req.query;

    // this is a single string param in the url, i.e. the "1" in /goalTemplates/1/prompts/
    // this will be verified as "canBeNumber" by some middleware before we get to this point
    const numericalGoalTemplateId = parseInt(goalTemplateId, DECIMAL_BASE);

    // this is a query string, i.e. the "goalIds=1&goalIds=2&goalIds=3"
    // the query can have one or more goal ids, and its hard to tell
    // until we parse it if it's a single value or an array
    const parsedGoalIds = [goalIds]
      .flat()
      .map((id: string) => parseInt(id, DECIMAL_BASE))
      .filter((id: number) => !Number.isNaN(id));

    const prompts = await getFieldPromptsForCuratedTemplate(numericalGoalTemplateId, parsedGoalIds);
    res.json(prompts);
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getPrompts');
  }
}

export async function getOptionsByPromptName(req: Request, res: Response) {
  try {
    const { name } = req.query;
    const prompts = await getOptionsByGoalTemplateFieldPromptName((name.toString()));
    res.json(prompts);
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getOptionsByPromptName');
  }
}
