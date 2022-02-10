import {
  getGoalsByActivityRecipient, recipientById, recipientsByName,
} from '../../services/recipient';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';
import { getUserReadRegions } from '../../services/accessValidation';

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

export async function getGoalsByRecipient(req, res) {
  try {
    const { recipientId, regionId } = req.params;
    // Check if user has access to this region.
    const readRegions = await getUserReadRegions(req.session.userId);
    if (!readRegions.includes(parseInt(regionId, 10))) {
      res.sendStatus(403);
      return;
    }

    // Check recipient exists.
    const recipient = await recipientById(recipientId);
    if (!recipient) {
      res.sendStatus(404);
      return;
    }

    // Get goals for recipient.
    const recipientGoals = await getGoalsByActivityRecipient(recipientId, regionId, req.query);
    res.json(recipientGoals);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
