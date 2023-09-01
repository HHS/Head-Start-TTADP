import httpCodes from 'http-codes';
import {
  getGoalsByActivityRecipient,
  recipientById,
  recipientsByName,
  recipientsByUserId,
  recipientLeadership,
  recipientLeadershipHistory,
} from '../../services/recipient';
import { goalsByIdAndRecipient } from '../../services/goals';
import handleErrors from '../../lib/apiErrorHandler';
import filtersToScopes from '../../scopes';
import Recipient from '../../policies/recipient';
import { userById } from '../../services/users';
import { getUserReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';

const namespace = 'SERVICE:RECIPIENT';

const logContext = {
  namespace,
};

const checkAccessAndExistence = async (req, res) => {
  const { recipientId, regionId } = req.params;
  // Check if user has access to this region.
  const userId = await currentUserId(req, res);
  const readRegions = await getUserReadRegions(userId);
  if (!readRegions.includes(parseInt(regionId, 10))) {
    res.sendStatus(403);
    return false;
  }

  // Check recipient exists.
  const recipient = await recipientById(recipientId, []);
  if (!recipient) {
    res.sendStatus(404);
    return false;
  }

  return true;
};

export async function getGoalsByIdandRecipient(req, res) {
  try {
    const { recipientId } = req.params;
    const { goalIds } = req.query;

    const goals = await goalsByIdAndRecipient(goalIds, recipientId);

    if (!goals.length) {
      res.sendStatus(404);
    }

    res.json(goals);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getRecipientAndGrantsByUser(req, res) {
  try {
    const userId = await currentUserId(req, res);

    if (!userId) {
      res.sendStatus(httpCodes.UNAUTHORIZED);
      return;
    }

    const recipients = await recipientsByUserId(userId);
    if (!recipients || !recipients.length) {
      res.sendStatus(httpCodes.NOT_FOUND);
      return;
    }

    res.json(recipients);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getRecipient(req, res) {
  try {
    const { recipientId } = req.params;
    const { grant: scopes } = await filtersToScopes(req.query);
    const recipient = await recipientById(recipientId, scopes);
    if (!recipient) {
      res.sendStatus(404);
      return;
    }

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const policy = new Recipient(user, recipient);
    if (!policy.canView()) {
      res.sendStatus(401);
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

    const userId = await currentUserId(req, res);
    const userRegions = await getUserReadRegions(userId);

    const { grant: scopes } = await filtersToScopes(
      req.query,
      { userId },
    );
    const recipients = await recipientsByName(s, scopes, sortBy, direction, offset, userRegions);
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
    const proceedQuestionMark = await checkAccessAndExistence(req, res);

    if (!proceedQuestionMark) {
      return;
    }

    const { recipientId, regionId } = req.params;

    // Get goals for recipient.
    const recipientGoals = await getGoalsByActivityRecipient(recipientId, regionId, req.query);
    res.json(recipientGoals);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getRecipientLeadership(req, res) {
  try {
    const proceedQuestionMark = await checkAccessAndExistence(req, res);

    if (!proceedQuestionMark) {
      return;
    }

    const { recipientId, regionId } = req.params;

    // Get goals for recipient.
    const leadership = await recipientLeadership(recipientId, regionId);
    res.json(leadership);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getRecipientLeadershipHistory(req, res) {
  try {
    const proceedQuestionMark = await checkAccessAndExistence(req, res);

    if (!proceedQuestionMark) {
      return;
    }

    const { recipientId, regionId } = req.params;

    // Get goals for recipient.
    const leadershipHistory = await recipientLeadershipHistory(recipientId, regionId);
    res.json(leadershipHistory);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
