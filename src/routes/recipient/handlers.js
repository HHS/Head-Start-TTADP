import getGoalsByActivityRecipient, { recipientById, recipientsByName } from '../../services/recipient';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';

const namespace = 'SERVICE:RECIPIENT';

const logContext = {
  namespace,
};

export async function getRecipient(req, res) {
  try {
    const { recipientId } = req.params;

    const scopes = filtersToScopes(req.query, 'grant');
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
    const scopes = filtersToScopes(req.query, 'grant');
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

export async function getGoalsByRecipientId(req, res) {
  try {
    const { recipientId } = req.params;
    const query = await setReadRegions(req.query, req.session.userId, true);
    const recipient = await getGoalsByActivityRecipient(recipientId, query);

    if (!recipient) {
      res.sendStatus(404);
      return;
    }

    res.json(recipient);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
