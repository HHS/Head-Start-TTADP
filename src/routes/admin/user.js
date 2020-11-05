import { Op } from 'sequelize';
import {
  User, Permission, sequelize,
} from '../../models';
import handleErrors from '../../lib/apiErrorHandler';

const namespace = 'SERVICE:USER';

const logContext = {
  namespace,
};
/**
 * Gets a user from the database.
 *
 * //potentially use also or instead of the user id provided by HSES
 * @param {Object} userData - user information containing email address, hses user id
 * @returns {Promise<any>} - returns a promise
 */
export async function getUser(req, res) {
  const { userId } = req.params;
  try {
    const user = await User.findOne({
      attributes: ['id', 'name', 'hsesUserId', 'email', 'phoneNumber', 'homeRegionId', 'title'],
      where: {
        id: {
          [Op.eq]: userId,
        },
      },
      include: [
        { model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] },
      ],
    });
    res.json(user);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export default async function getUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'title', 'hsesUserId', 'email', 'phoneNumber', 'homeRegionId'],
      include: [
        { model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] },
      ],
    });
    res.json(users);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function createUser(req, res) {
  const newUser = req.body;
  try {
    const user = await User.create(newUser,
      {
        include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
      });
    res.json(user);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function updateUser(req, res) {
  const requestUser = req.body;
  const { userId } = req.params;
  try {
    const result = await User.update(requestUser,
      {
        where: { id: userId },
        include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
      });
    await sequelize.transaction(async (t) => {
      await Permission.destroy({ where: { userId } },
        { transaction: t });
      await Permission.bulkCreate(requestUser.permissions,
        { transaction: t });
    });
    // res.json(await User.findOne({ where: { id: userId }, include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }] }));
    res.json(result);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function deleteUser(req, res) {
  const { userId } = req.params;
  try {
    const result = await User.destroy({ where: { id: userId } });
    res.json(result);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
