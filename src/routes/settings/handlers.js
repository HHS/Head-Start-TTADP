import handleErrors from '../../lib/apiErrorHandler';
import {
  saveSettings,
  subscribeAll,
  unsubscribeAll,
  userEmailSettingsById,
  userSettingsById,
} from '../../services/userSettings';
import { currentUserId } from '../../services/currentUser';

const namespace = 'SERVICE:USER_SETTINGS';

const getUserSettings = async (req, res) => {
  const userId = await currentUserId(req, res);
  try {
    const settings = await userSettingsById(userId);
    res.json(settings);
  } catch (error) {
    await handleErrors(req, res, error, { namespace });
  }
};

const getUserEmailSettings = async (req, res) => {
  const userId = await currentUserId(req, res);
  try {
    const settings = await userEmailSettingsById(userId);
    res.json(settings);
  } catch (error) {
    await handleErrors(req, res, error, { namespace });
  }
};

/**
 * Updates settings for the user. Expects a JSON body that looks like:
 * [
 *   { "key": "emailWhenReportApproval", "value": "never" },
 *   { "key": "emailWhenChangeRequested", "value": "monthlyDigest" },
 * ]
 * @param {express.Request} req
 * @param {express.Response} res
 */
const updateSettings = async (req, res) => {
  const userId = await currentUserId(req, res);
  let pairs = req.body;

  if (!pairs || !Array.isArray(pairs)) {
    try {
      res.sendStatus(400);
    } catch (error) {
      await handleErrors(req, res, error, { namespace });
    }

    return;
  }

  // Filter anything out that's missing a `key` or `value`:
  pairs = pairs.filter(({ key, value }) => key && value);

  try {
    await saveSettings(userId, pairs);
    res.sendStatus(204);
  } catch (error) {
    await handleErrors(req, res, error, { namespace });
  }
};

/**
 * Unsubscribes the user from all email notications.
 * @param {express.Request} req
 * @param {express.Response} res
 */
const unsubscribe = async (req, res) => {
  const userId = await currentUserId(req, res);

  try {
    await unsubscribeAll(userId);
    res.sendStatus(204);
  } catch (error) {
    await handleErrors(req, res, error, { namespace });
  }
};

/**
 * Subscribes the user to all email notications (immediately).
 * @param {express.Request} req
 * @param {express.Response} res
 */
const subscribe = async (req, res) => {
  const userId = await currentUserId(req, res);

  try {
    await subscribeAll(userId);
    res.sendStatus(204);
  } catch (error) {
    await handleErrors(req, res, error, { namespace });
  }
};

export {
  getUserSettings,
  getUserEmailSettings,
  subscribe,
  unsubscribe,
  updateSettings,
};
