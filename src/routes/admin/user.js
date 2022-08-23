import express from 'express';
import {
  User, Permission, sequelize, UserSetting,
} from '../../models';
import { featureFlags } from '../../models/user';
import { userById, userAttributes } from '../../services/users';
import handleErrors from '../../lib/apiErrorHandler';
import { auditLogger } from '../../logger';
import transactionWrapper from '../transactionWrapper';
import { USER_SETTINGS } from '../../constants';

const namespace = 'SERVICE:USER';

const logContext = {
  namespace,
};

/**
 * Gets one user from the database.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getUser(req, res) {
  const { userId } = req.params;
  try {
    const user = await userById(userId);
    res.json(user.toJSON());
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Gets all users from the database.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: userAttributes,
      include: [
        { model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] },
      ],
    });
    res.json(users);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Creates one user in the database.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function createUser(req, res) {
  const newUser = req.body;
  let user;
  try {
    user = await User.create(
      newUser,
      {
        include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
      },
    );

    // Create user settings for the user.
    const now = new Date();
    const defaultSettings = Object.values(USER_SETTINGS.EMAIL.KEYS).map((key) => ({
      userId: user.id,
      key,
      value: USER_SETTINGS.EMAIL.VALUES.NEVER,
      createdAt: now,
      updatedAt: now,
    }));
    await UserSetting.bulkCreate(defaultSettings);

    auditLogger.info(`User ${req.session.userId} created new User: ${user.id}`);
    res.json(user);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Updates one user in the database.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function updateUser(req, res) {
  const requestUser = req.body;
  const { userId } = req.params;

  try {
    await User.update(
      requestUser,
      {
        include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
        where: { id: userId },
        individualHooks: true,
      },
    );
    await Permission.destroy({ where: { userId } });
    await Permission.bulkCreate(requestUser.permissions, { validate: true, individualHooks: true });
    auditLogger.warn(`User ${req.session.userId} updated User: ${userId} and set permissions: ${JSON.stringify(requestUser.permissions)}`);
    const user = await userById(userId);
    res.json(user);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Deletes one user from the database.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function deleteUser(req, res) {
  const { userId } = req.params;
  auditLogger.info(`User ${req.session.userId} deleting User: ${userId}`);
  try {
    await sequelize.transaction(async (transaction) => {
      const result = await User.destroy({ where: { id: userId }, transaction });

      // Remove any settings related to this user.
      await UserSetting.destroy({ where: { userId }, transaction });

      // TODO: Should this user's validation statuses be removed from `UserValidationStatus`,
      // or should we preserve it?
      res.json(result);
    });
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getFeatures(req, res) {
  try {
    res.json(featureFlags);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

const router = express.Router();

router.get('/features', transactionWrapper(getFeatures));
router.get('/:userId', transactionWrapper(getUser));
router.get('/', transactionWrapper(getUsers));
router.post('/', transactionWrapper(createUser));
router.put('/:userId', transactionWrapper(updateUser));
router.delete('/:userId', transactionWrapper(deleteUser));

export default router;
