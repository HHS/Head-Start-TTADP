import {
  User, Permission, sequelize,
} from '../../models';
import { userById } from '../../services/users';
import handleErrors from '../../lib/apiErrorHandler';

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
export default async function getUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'role', 'hsesUserId', 'email', 'phoneNumber', 'homeRegionId'],
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
    await sequelize.transaction(async (t) => {
      await User.update(requestUser,
        {
          include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
          where: { id: userId },
        }, { transaction: t });

      await Permission.destroy({ where: { userId } },
        { transaction: t });
      await Permission.bulkCreate(requestUser.permissions,
        { transaction: t });
    });
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
  try {
    const result = await User.destroy({ where: { id: userId } });
    res.json(result);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
