import express from 'express';
import { allRecipients } from '../../services/recipient';
import handleErrors from '../../lib/apiErrorHandler';
import transactionWrapper from '../transactionWrapper';
/**
 * Gets all recipients from the database.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getRecipients(req, res) {
  try {
    const recipients = await allRecipients();
    res.json(recipients);
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:RECIPIENTS' });
  }
}

const router = express.Router();

router.get('/', transactionWrapper(getRecipients));

export default router;
