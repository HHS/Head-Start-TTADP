import express from 'express';
import {
  User, Permission, sequelize,
} from '../../models';
import { featureFlags } from '../../models/user';
import { userById, userAttributes } from '../../services/users';
import handleErrors from '../../lib/apiErrorHandler';
import { auditLogger } from '../../logger';

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
    await sequelize.transaction(async (transaction) => {
      user = await User.create(newUser,
        {
          include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
        }, transaction);
    });
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
    await sequelize.transaction(async (transaction) => {
      await User.update(requestUser,
        {
          include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
          where: { id: userId },
        }, { transaction });
      await Permission.destroy({ where: { userId } }, { transaction });
      await Permission.bulkCreate(requestUser.permissions, { transaction });
    });
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
    const result = await User.destroy({ where: { id: userId } });
    res.json(result);
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

router.get('/features', getFeatures);
router.get('/:userId', getUser);
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:userId', updateUser);
router.delete('/:userId', deleteUser);

export default router;
