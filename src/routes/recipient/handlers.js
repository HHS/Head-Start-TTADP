import { granteeById, granteesByName } from '../../services/grantee';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';

const namespace = 'SERVICE:GRANTEE';

const logContext = {
  namespace,
};

export async function getRecipient(req, res) {
  try {
    const { recipientId } = req.params;

    const scopes = filtersToScopes(req.query, 'grant');
    const recipient = await granteeById(recipientId, scopes);

    if (!recipient) {
      res.sendStatus(404);
      return;
    }

    res.json(recipient);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function searchRecipients(req, res) {
  try {
    const {
      s, sortBy, direction, offset,
    } = req.query;
    const scopes = filtersToScopes(req.query, 'grant');
    const recipients = await granteesByName(s, scopes, sortBy, direction, offset);
    if (!recipients) {
      res.sendStatus(404);
      return;
    }
    res.json(recipients);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
