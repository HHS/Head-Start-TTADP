import express from 'express';
import {
  User,
  Permission,
  Role,
  UserRole,
  sequelize,
} from '../../models';
import { featureFlags } from '../../models/user';
import { userById, userAttributes } from '../../services/users';
import handleErrors from '../../lib/apiErrorHandler';
import { auditLogger } from '../../logger';
import transactionWrapper from '../transactionWrapper';
import SCOPES from '../../middleware/scopeConstants';

const namespace = 'SERVICE:USER';

const logContext = {
  namespace,
};

/**
 *
 * @param {Object} requestUser
 * @param {Array} requestUser.roles
 * @param {String} requestUser.roles.fullName
 * @param {Number} requestUser.roles.id
 * @param {Number} userId
 * @returns Promise
 */
export async function createUserRoles(requestUser, userId) {
  return Promise.all((requestUser.roles.map(async (role) => {
    const r = await Role.findOne({ where: { fullName: role.fullName } });
    if (r) {
      return UserRole.create({
        roleId: r.id,
        userId,
      });
    }
    return null;
  })));
}

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
        {
          model: Permission,
          as: 'permissions',
        },
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'fullName'],
        },
      ],
      order: [
        [sequelize.fn('CONCAT', sequelize.col('"User"."name"'), sequelize.col('email')), 'ASC'],
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
        include: [
          {
            model: Permission,
            as: 'permissions',
            attributes: ['userId', 'scopeId', 'regionId'],
          },
        ],
      },
    );

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

    // User roles are handled a bit more clumsily
    await UserRole.destroy({ where: { userId } });
    await createUserRoles(requestUser, userId);

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

export async function getCreatorsByRegion(req, res) {
  try {
    const { regionId } = req.params;
    const creators = await User.findAll({
      attributes: userAttributes,
      include: [
        {
          model: Permission,
          as: 'permissions',
          where: {
            regionId: Number(regionId),
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
          required: true,
        },
      ],
      order: [
        [sequelize.fn('CONCAT', sequelize.col('"User"."name"'), sequelize.col('email')), 'ASC'],
      ],
    });

    res.json(creators);
  } catch (err) {
    await handleErrors(req, res, err, logContext);
  }
}

const router = express.Router();

router.get('/features', transactionWrapper(getFeatures));
router.get('/:userId', transactionWrapper(getUser));
router.get('/', transactionWrapper(getUsers));
router.get('/creators/region/:regionId', transactionWrapper(getCreatorsByRegion));
router.post('/', transactionWrapper(createUser));
router.put('/:userId', transactionWrapper(updateUser));
router.delete('/:userId', transactionWrapper(deleteUser));

export default router;
