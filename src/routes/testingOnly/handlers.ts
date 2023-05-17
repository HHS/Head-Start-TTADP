import { Request, Response } from 'express';
import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import { reseed } from '../../../tests/utils/dbUtils';

/**
 *
 * @param {Request} req
 * @param {Request} req
 * @returns Promise<void>
 */
export default async function reseedDB(req: Request, res: Response) {
  try {
    const result = await reseed();
    res.json(result);
  } catch (e) {
    await handleErrors(req, res, e, 'reseedDB');
  }
}
