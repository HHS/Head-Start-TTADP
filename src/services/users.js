/* eslint-disable max-len */
import { v4 as uuidv4 } from 'uuid';
import { Op, QueryTypes } from 'sequelize';

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
  ActivityReportGoal,
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
  'createdAt',
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
export async function statisticsByUser(user, regions, readonly = false, reportIds = []) {
  // Get days joined.
  const dateJoined = new Date(user.createdAt);
  const todaysDate = new Date();
  const totalHours = Math.abs(todaysDate - dateJoined) / 36e5;
  const totalDaysSinceJoined = Math.floor(totalHours / 24);

  // Additional report roles (if not read only).
  let collaboratorReports = [];
  let approverReports = [];

  // CREATED temp table names (needed for unit tests same sql connection).
  const createdTempTableName = `Z_temp_ars_created_${uuidv4().replaceAll('-', '_')}`;
  const createdGoalsTempTableName = `Z_temp_goals_and_objs_created_${uuidv4().replaceAll('-', '_')}`;

  // Get created AR's.
  const createdArSql = `
  -- Get report and recipient info.
  SELECT
    ar."id",
    ar."duration",
    ar."numberOfParticipants",
    (ARRAY_AGG(DISTINCT arp."grantId")) AS "grantIds",
    (ARRAY_AGG(DISTINCT g."recipientId")) AS "recipientIds"
    INTO TEMP ${createdTempTableName}
  FROM "ActivityReports" ar
  LEFT JOIN "ActivityRecipients" arp ON
    ar."id" = arp."activityReportId"
  LEFT JOIN "Grants" g ON
    arp."grantId" = g."id"
  WHERE ar."legacyId" IS NULL AND
  ar."calculatedStatus" = 'approved' AND ar."regionId" IN (${regions.join(',')})
  ${!readonly ? `AND ar."userId" = ${user.id}` : ''}
  GROUP BY ar."id", ar."duration", ar."numberOfParticipants";

  -- Get Created Goals and Objectives.
  SELECT
    ar."id",
    (ARRAY_AGG(DISTINCT arg."goalId")) AS "goalIds",
    (ARRAY_AGG(DISTINCT aro."objectiveId")) AS "objectiveIds"
    INTO TEMP ${createdGoalsTempTableName}
  FROM ${createdTempTableName} ar
  INNER JOIN "ActivityReportGoals" arg ON
    ar."id" = arg."activityReportId"
  INNER JOIN "ActivityReportObjectives" aro ON
    ar."id" = aro."activityReportId"
  GROUP BY ar."id";

  -- Final Select.
  SELECT
    ar."id",
    ar."duration",
    ar."numberOfParticipants",
    ar."grantIds",
    ar."recipientIds",
    g."goalIds",
    g."objectiveIds"
  FROM ${createdTempTableName} ar
  LEFT JOIN ${createdGoalsTempTableName} g ON
    ar."id" = g."id";
  `;
  let createdReports = sequelize.query(createdArSql, { type: QueryTypes.SELECT });

  if (!readonly) {
    // COLLABORATOR temp table names (needed for unit tests same sql connection).
    const collaboratorTempTableName = `Z_temp_ars_collaborator_${uuidv4().replaceAll('-', '_')}`;
    const collaboratorGoalsTempTableName = `Z_temp_goals_and_objs_collaborator_${uuidv4().replaceAll('-', '_')}`;

    // Get Collaborator's AR (if not read only).
    const collaboratorArSql = `
  -- Get report and recipient info.
  SELECT
    ar."id",
    ar."duration",
    ar."numberOfParticipants",
    (ARRAY_AGG(DISTINCT arp."grantId")) AS "grantIds",
    (ARRAY_AGG(DISTINCT g."recipientId")) AS "recipientIds"
    INTO TEMP ${collaboratorTempTableName}
  FROM "ActivityReports" ar
  INNER JOIN "ActivityReportCollaborators" arc ON
    ar."id" = arc."activityReportId"
  LEFT JOIN "ActivityRecipients" arp ON
    ar."id" = arp."activityReportId"
  LEFT JOIN "Grants" g ON
    arp."grantId" = g."id"
  WHERE ar."legacyId" IS NULL AND
  ar."calculatedStatus" = 'approved' AND ar."regionId" IN (${regions.join(',')})
  ${!readonly ? `AND arc."userId" = ${user.id}` : ''}
  GROUP BY ar."id", ar."duration", ar."numberOfParticipants";

  -- Get Created Goals and Objectives.
  SELECT
    ar."id",
    (ARRAY_AGG(DISTINCT arg."goalId")) AS "goalIds",
    (ARRAY_AGG(DISTINCT aro."objectiveId")) AS "objectiveIds"
    INTO TEMP ${collaboratorGoalsTempTableName}
  FROM  ${collaboratorTempTableName} ar
  INNER JOIN "ActivityReportGoals" arg ON
    ar."id" = arg."activityReportId"
  INNER JOIN "ActivityReportObjectives" aro ON
    ar."id" = aro."activityReportId"
  GROUP BY ar."id";

  -- Final Select.
  SELECT
    ar."id",
    ar."duration",
    ar."numberOfParticipants",
    ar."grantIds",
    ar."recipientIds",
    g."goalIds",
    g."objectiveIds"
  FROM  ${collaboratorTempTableName} ar
  LEFT JOIN  ${collaboratorGoalsTempTableName} g ON
    ar."id" = g."id";
  `;
    collaboratorReports = sequelize.query(collaboratorArSql, { type: QueryTypes.SELECT });

    // APPROVER temp table names (needed for unit tests same sql connection).
    const approverTempTableName = `Z_temp_ars_approver_${uuidv4().replaceAll('-', '_')}`;
    const approverGoalsTempTableName = `Z_temp_goals_and_objs_approver_${uuidv4().replaceAll('-', '_')}`;

    // Get Approver AR's (if not read only).
    const approverArSql = `
    -- Get report and recipient info.
    SELECT
      ar."id",
      ar."duration",
      ar."numberOfParticipants",
      (ARRAY_AGG(DISTINCT arp."grantId")) AS "grantIds",
      (ARRAY_AGG(DISTINCT g."recipientId")) AS "recipientIds"
      INTO TEMP ${approverTempTableName}
    FROM "ActivityReports" ar
    INNER JOIN "ActivityReportApprovers" ara ON
      ar."id" = ara."activityReportId"
    LEFT JOIN "ActivityRecipients" arp ON
      ar."id" = arp."activityReportId"
    LEFT JOIN "Grants" g ON
      arp."grantId" = g."id"
    WHERE ar."legacyId" IS NULL AND
    ar."calculatedStatus" = 'approved' AND ar."regionId" IN (${regions.join(',')})
    ${!readonly ? `AND ara."userId" = ${user.id}` : ''}
    GROUP BY ar."id", ar."duration", ar."numberOfParticipants";

    -- Get Created Goals and Objectives.
    SELECT
      ar."id",
      (ARRAY_AGG(DISTINCT arg."goalId")) AS "goalIds",
      (ARRAY_AGG(DISTINCT aro."objectiveId")) AS "objectiveIds"
      INTO TEMP ${approverGoalsTempTableName}
    FROM  ${approverTempTableName} ar
    INNER JOIN "ActivityReportGoals" arg ON
      ar."id" = arg."activityReportId"
    INNER JOIN "ActivityReportObjectives" aro ON
      ar."id" = aro."activityReportId"
    GROUP BY ar."id";

    -- Final Select.
    SELECT
      ar."id",
      ar."duration",
      ar."numberOfParticipants",
      ar."grantIds",
      ar."recipientIds",
      g."goalIds",
      g."objectiveIds"
    FROM  ${approverTempTableName} ar
    LEFT JOIN ${approverGoalsTempTableName} g ON
      ar."id" = g."id";
    `;
    approverReports = sequelize.query(approverArSql, { type: QueryTypes.SELECT });

    // Await all three requests (created, collaborators, approved).
    [createdReports, collaboratorReports, approverReports] = await Promise.all([createdReports, collaboratorReports, approverReports]);
  } else {
    // Region only.
    [createdReports] = await Promise.all([createdReports]);
  }

  // Approved report recipient ids.
  const createdRecipientIds = createdReports.flatMap((r) => r.recipientIds).filter((r) => r);
  let collaboratorRecipientIds = [];
  let approverRecipientIds = [];

  // Grant ids.
  const createdGrantIds = createdReports.flatMap((r) => r.grantIds).filter((r) => r);
  let collaboratorGrantIds = [];
  let approverGrantIds = [];

  // Goal ids.
  const createdGoalIds = createdReports.flatMap((r) => r.goalIds).filter((r) => r);
  let collaboratorGoalIds = [];
  let approverGoalIds = [];

  // Goal ids.
  const createdObjectiveIds = createdReports.flatMap((r) => r.objectiveIds).filter((r) => r);
  let collaboratorObjectiveIds = [];
  let approverObjectiveIds = [];

  if (!readonly) {
    // Collaborator report Recipient ids.
    collaboratorRecipientIds = collaboratorReports.flatMap((r) => r.recipientIds).filter((r) => r);

    // Collaborator Grant ids.
    collaboratorGrantIds = collaboratorReports.flatMap((r) => r.grantIds).filter((r) => r);

    // Collaborator report Goal ids.
    collaboratorGoalIds = collaboratorReports.flatMap((r) => r.goalIds).filter((r) => r);

    // Collaborator report Objective ids.
    collaboratorObjectiveIds = collaboratorReports.flatMap((r) => r.objectiveIds).filter((r) => r);

    // Approver report recipient ids.
    approverRecipientIds = approverReports.flatMap((r) => r.recipientIds).filter((r) => r);

    // Approver report recipient ids.
    approverGrantIds = approverReports.flatMap((r) => r.grantIds).filter((r) => r);

    // Approver report Goal ids.
    approverGoalIds = approverReports.flatMap((r) => r.goalIds).filter((r) => r);

    // Approver report Goal ids.
    approverObjectiveIds = approverReports.flatMap((r) => r.objectiveIds).filter((r) => r);
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

  // Total Objectives.
  const totalObjectivesIds = new Set([...createdObjectiveIds, ...collaboratorObjectiveIds, ...approverObjectiveIds]);

  return {
    daysSinceJoined: totalDaysSinceJoined,
    arsCreated: createdReports.length,
    arsCollaboratedOn: collaboratorReports.length,
    ttaProvided: totalTTASentence,
    recipientsReached: totalRecipientIds.size,
    grantsServed: totalGrantIds.size,
    participantsReached: totalParticipants,
    goalsApproved: totalGoalIds.size,
    objectivesApproved: totalObjectivesIds.size,
  };
}
