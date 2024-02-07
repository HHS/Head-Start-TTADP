import { Request, Response } from 'express';
import handleErrors from '../../lib/apiErrorHandler';
import { reseed, query } from '../../../tests/utils/dbUtils';

export async function reseedDB(req: Request, res: Response) {
  try {
    const result = await reseed();
    res.status(result ? 200 : 500).json(result);
  } catch (e) {
    await handleErrors(req, res, e, 'reseedDB');
  }
}

export async function queryDB(req: Request, res: Response) {
  try {
    if (!req.body) { throw new Error('req.body is required'); }

    const { command, options = {} } = req.body;

    if (!command) { throw new Error('command is required'); }

    const result = await query(command, options);
    res.status(result[0] ? 200 : 501).json(result);
  } catch (e) {
    await handleErrors(req, res, e, 'queryDB');
  }
}
