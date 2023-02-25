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
  ActivityRecipient,
  Grant,
  Goal,
  ActivityReportGoal,
  Objective,
  ActivityReportObjective,
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
    attributes: [
      [sequelize.col('"ActivityReport"."id"'), 'id'],
      [sequelize.col('"ActivityReport"."duration"'), 'duration'],
      [sequelize.fn(
        'ARRAY_AGG',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('"activityRecipients->grant"."recipientId"'),
        ),
      ), 'recipientIds'],
      [sequelize.fn(
        'ARRAY_AGG',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('"activityRecipients->grant"."id"'),
        ),
      ), 'grantIds'],
      [sequelize.col('"ActivityReport"."numberOfParticipants"'), 'numberOfParticipants'],
      [sequelize.fn(
        'ARRAY_AGG',
        sequelize.fn(
          'DISTINCT',
          sequelize.col('"activityReportGoals."goalId"'),
        ),
      ), 'goalIds'],
    ],
    group: ['"ActivityReport"."id"', '"ActivityReport"."duration"', '"ActivityReport"."numberOfParticipants"'],
    where: createdArWhere,
    include: [
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        attributes: [],
      },
      {
        model: ActivityRecipient.unscoped(),
        attributes: [],
        as: 'activityRecipients',
        required: false,
        include: [
          {
            attributes: [],
            model: Grant.unscoped(),
            as: 'grant',
          },
        ],
      },
    ],
  });

  // Approved report recipient ids.
  const createdRecipientIds = createdReports.flatMap((r) => r.dataValues.recipientIds).filter((r) => r);
  let collaboratorRecipientIds = [];
  let approverRecipientIds = [];

  // Grant ids.
  const createdGrantIds = createdReports.flatMap((r) => r.dataValues.grantIds).filter((r) => r);
  let collaboratorGrantIds = [];
  let approverGrantIds = [];

  // Goal ids.
  const createdGoalIds = createdReports.flatMap((r) => r.dataValues.goalIds).filter((r) => r);
  let collaboratorGoalIds = [];
  let approverGoalIds = [];

  // Additional report roles (if not read only).
  let collaboratorReports = [];
  let approverReports = [];

  if (!readonly) {
    // Get Collaborator's AR (if not read only).
    collaboratorReports = await ActivityReportModel.findAll({
      attributes: [
        [sequelize.col('"ActivityReport"."id"'), 'id'],
        [sequelize.col('"ActivityReport"."duration"'), 'duration'],
        [sequelize.fn(
          'ARRAY_AGG',
          sequelize.fn(
            'DISTINCT',
            sequelize.col('"activityRecipients->grant"."recipientId"'),
          ),
        ), 'recipientIds'],
        [sequelize.fn(
          'ARRAY_AGG',
          sequelize.fn(
            'DISTINCT',
            sequelize.col('"activityRecipients->grant"."id"'),
          ),
        ), 'grantIds'],
        [sequelize.col('"ActivityReport"."numberOfParticipants"'), 'numberOfParticipants'],
        [sequelize.fn(
          'ARRAY_AGG',
          sequelize.fn(
            'DISTINCT',
            sequelize.col('"activityReportGoals."goalId"'),
          ),
        ), 'goalIds'],
      ],
      group: ['"ActivityReport"."id"', '"ActivityReport"."duration"', '"ActivityReport"."numberOfParticipants"'],
      where: {
        regionId: regions,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        legacyId: null,
      },
      include: [
        {
          attributes: [],
          model: ActivityReportCollaborator,
          as: 'activityReportCollaborators',
          required: true,
          where: {
            userId: user.id,
          },
        },
        {
          model: ActivityReportGoal,
          as: 'activityReportGoals',
          attributes: [],
        },
        {
          model: ActivityRecipient.unscoped(),
          attributes: [],
          as: 'activityRecipients',
          required: false,
          include: [
            {
              attributes: [],
              model: Grant.unscoped(),
              as: 'grant',
            },
          ],
        },
      ],
    });

    // Collaborator report Recipient ids.
    collaboratorRecipientIds = collaboratorReports.flatMap((r) => r.dataValues.recipientIds).filter((r) => r);

    // Collaborator Grant ids.
    collaboratorGrantIds = collaboratorReports.flatMap((r) => r.dataValues.grantIds).filter((r) => r);

    // Collaborator report Goal ids.
    collaboratorGoalIds = collaboratorReports.flatMap((r) => r.dataValues.goalIds).filter((r) => r);

    // Get Approver AR's (if not read only).
    approverReports = await ActivityReportModel.findAll({
      attributes: [
        [sequelize.col('"ActivityReport"."id"'), 'id'],
        [sequelize.col('"ActivityReport"."duration"'), 'duration'],
        [sequelize.fn(
          'ARRAY_AGG',
          sequelize.fn(
            'DISTINCT',
            sequelize.col('"activityRecipients->grant"."recipientId"'),
          ),
        ), 'recipientIds'],
        [sequelize.fn(
          'ARRAY_AGG',
          sequelize.fn(
            'DISTINCT',
            sequelize.col('"activityRecipients->grant"."id"'),
          ),
        ), 'grantIds'],
        [sequelize.col('"ActivityReport"."numberOfParticipants"'), 'numberOfParticipants'],
        [sequelize.fn(
          'ARRAY_AGG',
          sequelize.fn(
            'DISTINCT',
            sequelize.col('"activityReportGoals."goalId"'),
          ),
        ), 'goalIds'],
      ],
      group: ['"ActivityReport"."id"', '"ActivityReport"."duration"', '"ActivityReport"."numberOfParticipants"'],
      where: {
        regionId: regions,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        legacyId: null,
      },
      include: [
        {
          attributes: [],
          model: ActivityReportApprover,
          as: 'approvers',
          required: true,
          where: {
            userId: user.id,
          },
        },
        {
          model: ActivityReportGoal,
          as: 'activityReportGoals',
          attributes: [],
        },
        {
          model: ActivityRecipient.unscoped(),
          attributes: [],
          as: 'activityRecipients',
          required: false,
          include: [
            {
              attributes: [],
              model: Grant.unscoped(),
              as: 'grant',
            },
          ],
        },
      ],
    });

    // Approver report recipient ids.
    approverRecipientIds = approverReports.flatMap((r) => r.dataValues.recipientIds).filter((r) => r);

    // Approver report recipient ids.
    approverGrantIds = approverReports.flatMap((r) => r.dataValues.grantIds).filter((r) => r);

    // Approver report Goal ids.
    approverGoalIds = approverReports.flatMap((r) => r.dataValues.goalIds).filter((r) => r);
  }

  // Approved TTA.
  const totalCreatedTTA = createdReports.reduce((acc, obj) => acc + parseInt(obj.duration, DECIMAL_BASE), 0);
  let totalCollaboratorTTA = 0;
  let totalApproverTTA = 0;

  // Participants.
  const totalCreatedParticipants = createdReports.reduce((acc, obj) => acc + parseInt(obj.numberOfParticipants, DECIMAL_BASE), 0);
  let totalCollaboratorParticipants = 0;
  let totalApproverParticipants = 0;

  if (!readonly) {
    // Collaborator TTA.
    let createdIds = new Set(createdReports.map((r) => r.id));
    const nonDuplicateCollaborators = collaboratorReports.filter((c) => !createdIds.has(c.id));
    totalCollaboratorTTA = nonDuplicateCollaborators.reduce((acc, obj) => acc + parseInt(obj.duration, DECIMAL_BASE), 0);

    // Collaborator Participants.
    const nonDuplicateCollaboratorParticipants = collaboratorReports.filter((c) => !createdIds.has(c.id));
    totalCollaboratorParticipants = nonDuplicateCollaboratorParticipants.reduce((acc, obj) => acc + parseInt(obj.numberOfParticipants, DECIMAL_BASE), 0);

    // Approver TTA.
    createdIds = new Set(createdIds, nonDuplicateCollaborators.map((r) => r.id));
    const nonDuplicateApprovers = approverReports.filter((a) => !createdIds.has(a.id));
    totalApproverTTA = nonDuplicateApprovers.reduce((acc, obj) => acc + parseInt(obj.duration, DECIMAL_BASE), 0);

    // Approver Participants.
    const nonDuplicateParticipantApprovers = approverReports.filter((a) => !createdIds.has(a.id));
    totalApproverParticipants = nonDuplicateParticipantApprovers.reduce((acc, obj) => acc + parseInt(obj.numberOfParticipants, DECIMAL_BASE), 0);
  }

  // TTA Provided '6 days 5 hours'.
  const totalTTA = totalCreatedTTA + totalCollaboratorTTA + totalApproverTTA;
  const totalTTADays = Math.floor(totalTTA / 24);
  const totalTTAHours = totalTTA - (totalTTADays * 24);
  const totalTTASentence = `${totalTTADays >= 1 ? totalTTADays : 0} days ${totalTTAHours} hrs`;

  // Total participants.
  const totalParticipants = totalCreatedParticipants + totalCollaboratorParticipants + totalApproverParticipants;

  // Total distinct recipient ids.
  const totalRecipientIds = new Set([...createdRecipientIds, ...collaboratorRecipientIds, ...approverRecipientIds]);

  // Total distinct grant ids.
  const totalGrantIds = new Set([...createdGrantIds, ...collaboratorGrantIds, ...approverGrantIds]);

  // Total Goals.
  const totalGoalIds = new Set([...createdGoalIds, ...collaboratorGoalIds, ...approverGoalIds]);

  // ...

  return {
    daysSinceJoined: totalDaysSinceJoined,
    arsCreated: createdReports.length,
    arsCollaboratedOn: collaboratorReports.length,
    ttaProvided: totalTTASentence,
    recipientsReached: totalRecipientIds.size,
    grantsServed: totalGrantIds.size,
    participantsReached: totalParticipants,
    goalsApproved: totalGoalIds.size,
    objectivesApproved: 0,
  };
}
