import type { Request, Response } from 'express'
import { getWhatsNewFeedData, getSingleFeedData } from '../../services/feed'
import handleErrors from '../../lib/apiErrorHandler'

export async function whatsNewFeedHandler(req: Request, res: Response) {
  try {
    const feed = await getWhatsNewFeedData()
    res.send(feed)
  } catch (error) {
    await handleErrors(req, res, error, 'whatsNewFeedHandler')
  }
}

export async function singleFeedByTagHandler(req: Request, res: Response) {
  try {
    const { tag } = req.query
    const feed = await getSingleFeedData(String(tag))
    res.send(feed)
  } catch (error) {
    await handleErrors(req, res, error, 'singleByTagFeedHandler')
  }
}
