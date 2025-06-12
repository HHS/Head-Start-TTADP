import handleErrors from '../../lib/apiErrorHandler';
import { reseed, query } from '../../../tests/utils/dbUtils';

async function queryDB(req, res) {
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

async function reseedDB(req, res) {
  try {
    const result = await reseed();
    res.status(result ? 200 : 500).json(result);
  } catch (e) {
    await handleErrors(req, res, e, 'reseedDB');
  }
}

async function health(req, res) {
  res.status(200).json();
}

export { queryDB, reseedDB, health };
