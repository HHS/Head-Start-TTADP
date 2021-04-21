import express from 'express';
import { allGrantees } from '../../services/grantee';
import handleErrors from '../../lib/apiErrorHandler';
/**
 * Gets all grantees from the database.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getGrantees(req, res) {
  try {
    const grantees = await allGrantees();
    res.json(grantees);
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:GRANTEES' });
  }
}

const router = express.Router();

router.get('/', getGrantees);

export default router;
