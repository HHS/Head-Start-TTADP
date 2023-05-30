import { Request, Response } from 'express';
import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import { reseed, query } from '../../../tests/utils/dbUtils';

/**
 *
 * @param {Request} req
 * @param {Request} req
 * @returns Promise<void>
 */
export async function reseedDB(req: Request, res: Response) {
  try {
    const result = await reseed();
    res
      .status(result ? 200 : 500)
      .json(result);
  } catch (e) {
    await handleErrors(req, res, e, 'reseedDB');
  }
}

export async function queryDB(req: Request, res: Response) {
  try {
    const { command, options } = req.params;
    const result = await query(command, options);
    res
      .status(result ? 200 : 500)
      .json(result);
  } catch (e) {
    await handleErrors(req, res, e, 'queryDB');
  }
}
