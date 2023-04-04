/* eslint-disable import/prefer-default-export */
import { Request, Response } from 'express';
import { DECIMAL_BASE } from '../../constants';
import handleErrors from '../../lib/apiErrorHandler';
import {
  getCuratedTemplates,
  getFieldPromptsForCuratedTemplate,
  setFieldPromptForCuratedTemplate,
  setFieldPromptsForCuratedTemplate,
} from '../../services/goalTemplates';

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

export async function getPrompts(req: Request, res: Response) {
  try {
    const { goalTemplateId, grantIds } = req.params;

    // ensure we only pass numbers to the service
    const parsedGoalTemplateId = (
      [goalTemplateId]
        .map((id: string) => parseInt(id, DECIMAL_BASE))
        .filter((id: number) => !Number.isNaN(id))
    )[0];
    const parsedGrantIds = [grantIds]
      .flat()
      .map((id: string) => parseInt(id, DECIMAL_BASE))
      .filter((id: number) => !Number.isNaN(id));

    const prompts = await getFieldPromptsForCuratedTemplate(parsedGoalTemplateId, parsedGrantIds);
    res.json(prompts);
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getPrompts');
  }
}

export async function setPrompt(req: Request, res: Response) {
  try {
    const { grantIds, promptResponses } = req.params;

    // ensure we only pass numbers to the service
    const parsedGrantIds = [grantIds]
      .flat()
      .map((id: string) => parseInt(id, DECIMAL_BASE))
      .filter((id: number) => !Number.isNaN(id));

    const prompts = await setFieldPromptsForCuratedTemplate(
      parsedGrantIds,
      promptResponses,
    );
    res.json(prompts);
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getPrompts');
  }
}

export async function setPrompts(req: Request, res: Response) {

}
