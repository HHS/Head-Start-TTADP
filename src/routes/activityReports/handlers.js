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

export async function saveReport(req, res) {
  // Temporary until saving of report is implemented
  // eslint-disable-next-line no-console
  console.log('save');
  res.sendStatus(204);
}

export async function getReport(req, res) {
  const additionalData = {
    additionalNotes: 'this is an additional note',
    approvingManagers: [2],
  };

  const report = {
    activityMethod: 'in-person',
    activityType: ['training'],
    duration: '1',
    endDate: '11/11/2020',
    grantees: ['Grantee Name 1'],
    numberOfParticipants: '1',
    participantCategory: 'grantee',
    participants: ['other participant 1'],
    reason: ['reason 1'],
    otherUsers: ['user 1'],
    programTypes: ['program type 1'],
    requester: 'grantee',
    resourcesUsed: 'eclkcurl',
    startDate: '11/11/2020',
    targetPopulations: ['target pop 1'],
    topics: ['first'],
  };

  const pageState = {
    1: 'Complete',
    2: 'Complete',
    3: 'Complete',
    4: 'Complete',
  };

  res.json({
    report,
    pageState,
    additionalData,
  });
}
