/* eslint-disable max-len */
import { Op } from 'sequelize';

import {
  User,
  Permission,
  Role,
  sequelize,
  UserValidationStatus,
  ActivityReport as ActivityReportModel,
  ActivityReportCollaborator,
  ActivityReportApprover,
} from '../models';
import { REPORT_STATUSES, DECIMAL_BASE } from '../constants';

export const userAttributes = [
  'id',
  'name',
  'hsesUserId',
  'hsesUsername',
  'hsesAuthorities',
  'email',
  'phoneNumber',
  'homeRegionId',
  'lastLogin',
  'flags',
];

export async function userById(userId) {
  return User.findOne({
    attributes: userAttributes,
    where: {
      id: {
        [Op.eq]: userId,
      },
    },
    include: [
      { model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] },
      { model: Role, as: 'roles' },
      { model: UserValidationStatus, as: 'validationStatus', attributes: ['userId', 'type', 'validatedAt'] },
    ],
    order: [
      [{ model: Permission, as: 'permissions' }, 'regionId', 'ASC'],
      [sequelize.fn('CONCAT', sequelize.col('User."name"'), sequelize.col('User."email"')), 'ASC'],
    ],
  });
}

export async function userByEmail(email) {
  return User.findOne({
    attributes: ['id'],
    where: {
      email: { [Op.iLike]: email },
    },
  });
}

export async function usersWithPermissions(regions, scopes) {
  return User.findAll({
    attributes: ['id', 'name'],
    where: {
      [Op.and]: [
        { '$permissions.scopeId$': scopes },
        { '$permissions.regionId$': regions },
      ],
    },
    include: [
      { model: Permission, as: 'permissions', attributes: [] },
      { model: Role, as: 'roles' },
    ],
  });
}

/**
 * @param {User} user
 */
export async function userEmailIsVerified(user) {
  if (!user || !user.validationStatus || !user.validationStatus.length) return false;
  return user.validationStatus.some((status) => status.type === 'email' && status.validatedAt);
}

/**
 * @param {number} userId
 */
export async function userEmailIsVerifiedByUserId(userId) {
  const user = await userById(userId);
  return user
    ? userEmailIsVerified(user)
    : false;
}

/* Get Statistics by User */
export async function statisticsByUser(user, regions, readonly = false) {
  // Get days joined.
  const dateJoined = new Date(user.createdAt);
  const todaysDate = new Date();
  const totalHours = Math.abs(todaysDate - dateJoined) / 36e5;
  const totalDaysSinceJoined = Math.floor(totalHours / 24);

  // Created AR where.
  let createdArWhere = {
    regionId: regions,
    calculatedStatus: REPORT_STATUSES.APPROVED,
    legacyId: null,
  };

  // Focus only on user if has read/write.
  if (!readonly) {
    createdArWhere = {
      ...createdArWhere,
      userId: user.id,
    };
  }

  // Get created AR's.
  const createdReports = await ActivityReportModel.findAll({
    where: createdArWhere,
  });

  // Collaborator's AR where.
  let collaboratorReports = [];
  if (!readonly) {
    collaboratorReports = await ActivityReportModel.findAll({
      where: {
        regionId: regions,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        legacyId: null,
      },
      include: [
        {
          model: ActivityReportCollaborator,
          as: 'activityReportCollaborators',
          required: true,
          where: {
            userId: user.id,
          },
        },
      ],
    });
  }

  // Get Approver AR's
  let approverReports = [];
  if (!readonly) {
    approverReports = await ActivityReportModel.findAll({
      where: {
        regionId: regions,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        legacyId: null,
      },
      include: [
        {
          model: ActivityReportApprover,
          as: 'approvers',
          required: true,
          where: {
            userId: user.id,
          },
        },
      ],
    });
  }

  // Approved TTA.
  const totalCreatedTTA = createdReports.reduce((acc, obj) => acc + parseInt(obj.duration, DECIMAL_BASE), 0);
  let totalCollaboratorTTA = 0;
  let totalApproverTTA = 0;

  if (!readonly) {
    // Collaborator TTA.
    let createdIds = new Set(createdReports.map((r) => r.id));
    const nonDuplicateCollaborators = collaboratorReports.filter((c) => !createdIds.has(c.id));
    totalCollaboratorTTA = nonDuplicateCollaborators.reduce((acc, obj) => acc + parseInt(obj.duration, DECIMAL_BASE), 0);

    // Approver TTA.
    createdIds = new Set(createdIds, nonDuplicateCollaborators.map((r) => r.id));
    const nonDuplicateApprovers = approverReports.filter((a) => !createdIds.has(a.id));
    totalApproverTTA = nonDuplicateApprovers.reduce((acc, obj) => acc + parseInt(obj.duration, DECIMAL_BASE), 0);
  }

  // TTA Provided '6 days 5 hours'.
  const totalTTA = totalCreatedTTA + totalCollaboratorTTA + totalApproverTTA;
  const totalTTADays = Math.floor(totalTTA / 24);
  const totalTTAHours = totalTTA - (totalTTADays * 24);
  const totalTTASentence = `${totalTTADays >= 1 ? totalTTADays : 0} days ${totalTTAHours} hrs`;

  // ...

  return {
    daysSinceJoined: totalDaysSinceJoined,
    arsCreated: createdReports.length,
    arsCollaboratedOn: collaboratorReports.length,
    ttaProvided: totalTTASentence,
    recipientsReached: 0,
    grantsServed: 0,
    participantsReached: 0,
    goalsApproved: 0,
    objectivesApproved: 0,
  };
}
