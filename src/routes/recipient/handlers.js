import { recipientById, recipientsByName } from '../../services/recipient';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';

const namespace = 'SERVICE:RECIPIENT';

const logContext = {
  namespace,
};

export async function getRecipient(req, res) {
  try {
    const { recipientId } = req.params;

    const { grant: scopes } = filtersToScopes(req.query);
    const recipient = await recipientById(recipientId, scopes);

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
    const { grant: scopes } = filtersToScopes(req.query);
    const recipients = await recipientsByName(s, scopes, sortBy, direction, offset);
    if (!recipients) {
      res.sendStatus(404);
      return;
    }
    res.json(recipients);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
