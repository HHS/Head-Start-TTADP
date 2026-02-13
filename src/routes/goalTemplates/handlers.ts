/* eslint-disable import/prefer-default-export */
import type { Request, Response } from 'express'
import { DECIMAL_BASE } from '@ttahub/common'
import handleErrors from '../../lib/apiErrorHandler'
import {
  getCuratedTemplates,
  getFieldPromptsForCuratedTemplate,
  getFieldPromptsForActivityReports,
  getOptionsByGoalTemplateFieldPromptName,
  getSourceFromTemplate,
} from '../../services/goalTemplates'
import { newStandardGoal, updateExistingStandardGoal, goalForRtr, standardGoalsForRecipient } from '../../services/standardGoals'

export async function getStandardGoal(req: Request, res: Response) {
  try {
    const { grantId, goalTemplateId } = req.params
    const { status } = req.query

    if (status) {
      const standard = await goalForRtr(Number(grantId), Number(goalTemplateId), status as string[])
      res.json(standard)
      return
    }

    const standard = await goalForRtr(Number(grantId), Number(goalTemplateId))
    res.json(standard)
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getStandardGoal')
  }
}

export async function getGoalTemplates(req: Request, res: Response) {
  try {
    const { grantIds, includeClosedSuspendedGoals } = req.query

    // ensure we only pass numbers to the service
    const parsedGrantIds = [grantIds]
      .flat()
      .map((id: string) => parseInt(id, DECIMAL_BASE))
      .filter((id: number) => !Number.isNaN(id))

    const templates = await getCuratedTemplates(parsedGrantIds, !!includeClosedSuspendedGoals)
    res.json(templates)
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getGoalTemplates')
  }
}

export async function useStandardGoal(req: Request, res: Response) {
  try {
    const { grantId, goalTemplateId } = req.params
    const { objectives, rootCauses, status } = req.body

    const standards = await newStandardGoal(
      Number(grantId),
      Number(goalTemplateId),
      objectives,
      rootCauses,
      status || undefined // if status is not provided, it will default to NOT_STARTED
    )

    res.json(standards)
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.useStandardGoal')
  }
}

export async function updateStandardGoal(req: Request, res: Response) {
  try {
    const { grantId, goalTemplateId } = req.params
    const { objectives, rootCauses } = req.body

    const standards = await updateExistingStandardGoal(Number(grantId), Number(goalTemplateId), objectives, rootCauses)

    res.json(standards)
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.updateStandardGoal')
  }
}

export async function getSource(req: Request, res: Response) {
  try {
    const { goalTemplateId } = req.params
    const { grantIds } = req.query

    // this is a single string param in the url, i.e. the "1" in /goalTemplates/1/prompts/
    // this will be verified as "canBeNumber" by some middleware before we get to this point
    const numericalGoalTemplateId = parseInt(goalTemplateId, DECIMAL_BASE)

    // this is a query string, i.e. the "goalIds=1&goalIds=2&goalIds=3"
    // the query can have one or more goal ids, and its hard to tell
    // until we parse it if it's a single value or an array
    const parsedGrantIds = [grantIds]
      .flat()
      .map((id: string) => parseInt(id, DECIMAL_BASE))
      .filter((id: number) => !Number.isNaN(id))

    const source = await getSourceFromTemplate(numericalGoalTemplateId, parsedGrantIds)
    res.json({ source: source || '' })
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getSource')
  }
}

export async function getPrompts(req: Request, res: Response) {
  try {
    const { goalTemplateId } = req.params
    const { goalIds, isForActivityReport } = req.query

    // this is a single string param in the url, i.e. the "1" in /goalTemplates/1/prompts/
    // this will be verified as "canBeNumber" by some middleware before we get to this point
    const numericalGoalTemplateId = parseInt(goalTemplateId, DECIMAL_BASE)

    // this is a query string, i.e. the "goalIds=1&goalIds=2&goalIds=3"
    // the query can have one or more goal ids, and its hard to tell
    // until we parse it if it's a single value or an array
    const parsedGoalIds = [goalIds]
      .flat()
      .map((id: string) => parseInt(id, DECIMAL_BASE))
      .filter((id: number) => !Number.isNaN(id))

    let responsesWithPrompts
    if (isForActivityReport) {
      // If this is for an AR we need the prompts back in a different format.
      responsesWithPrompts = await getFieldPromptsForActivityReports(numericalGoalTemplateId, parsedGoalIds)
    } else {
      const originalPromptsWithResponses = await getFieldPromptsForCuratedTemplate(numericalGoalTemplateId, parsedGoalIds)
      responsesWithPrompts = [originalPromptsWithResponses, null]
    }
    res.json(responsesWithPrompts)
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getPrompts')
  }
}

export async function getOptionsByPromptName(req: Request, res: Response) {
  try {
    const { name } = req.query
    const prompts = await getOptionsByGoalTemplateFieldPromptName(name.toString())
    res.json(prompts)
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getOptionsByPromptName')
  }
}

export async function getStandardGoalsByRecipientId(req: Request, res: Response) {
  try {
    const { regionId, recipientId } = req.params
    const { limit, offset, sortBy, sortDir } = req.query
    const goals = await standardGoalsForRecipient(Number(recipientId), Number(regionId), {
      limit: Number(limit),
      offset: Number(offset),
      sortBy: sortBy as 'createdOn' | 'goalStatus',
      sortDir: sortDir as 'ASC' | 'DESC',
    })
    res.json(goals)
  } catch (err) {
    await handleErrors(req, res, err, 'goalTemplates.getStandardGoalsByRecipientId')
  }
}
