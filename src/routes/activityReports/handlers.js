import { Op } from 'sequelize';
import {
  User, Permission,
} from '../../models';
import handleErrors from '../../lib/apiErrorHandler';
import SCOPES from '../../middleware/scopeConstants';

const { READ_WRITE_REPORTS, APPROVE_REPORTS } = SCOPES;

const namespace = 'SERVICE:ACTIVITY_REPORTS';

const logContext = {
  namespace,
};

const userById = async (userId) => User.findOne({
  attributes: ['id'],
  where: {
    id: {
      [Op.eq]: userId,
    },
  },
  include: [
    { model: Permission, as: 'permissions', attributes: ['scopeId', 'regionId'] },
  ],
});

/**
 * Gets all users that have approve permissions for the current user's
 * regions.
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function getApprovers(req, res) {
  const user = await userById(req.session.userId);
  const reportRegions = user.permissions
    .filter((p) => p.scopeId === READ_WRITE_REPORTS)
    .map((p) => p.regionId);

  try {
    const users = await User.findAll({
      attributes: ['id', 'name'],
      where: {
        [Op.and]: [
          { '$permissions.scopeId$': APPROVE_REPORTS },
          { '$permissions.regionId$': reportRegions },
        ],
      },
      include: [
        { model: Permission, as: 'permissions', attributes: [] },
      ],
    });
    res.json(users);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

/**
 * Flags a report as submitted for approval
 *
 * @param {*} req - request
 * @param {*} res - response
 */
export async function submitReport(req, res) {
  // Temporary until submitting of report is implemented
  // eslint-disable-next-line no-console
  console.log('submit');
  res.sendStatus(204);
}
