import _ from 'lodash';
import { Op } from 'sequelize';
import moment from 'moment';
import {
  REPORT_STATUSES,
  DECIMAL_BASE,
  REPORTS_PER_PAGE,
  ENTITY_TYPES,
  COLLABORATOR_TYPES,
  RECIPIENT_TYPE,
} from '../constants';
import orderReportsBy from '../lib/orderReportsBy';
import filtersToScopes from '../scopes';
import { setReadRegions } from './accessValidation';
import {
  syncOwner,
  syncOwnerInstantiators,
  syncEditors,
  syncRatifiers,
} from './collaborators';
import {
  ActivityReport,
  Approval,
  Collaborator,
  ActivityReportFile,
  sequelize,
  ActivityRecipient,
  File,
  Grant,
  Recipient,
  OtherEntity,
  Goal,
  User,
  NextStep,
  Objective,
  Program,
  ActivityReportGoal,
  ActivityReportObjective,
  ActivityReportObjectiveResource,
  ObjectiveResource,
  Topic,
  Role,
} from '../models';
import {
  removeUnusedGoalsObjectivesFromReport,
  saveGoalsForReport,
  removeRemovedRecipientsGoals,
  getGoalsForReport,
} from './goals';

import { saveObjectivesForReport } from './objectives';
import { auditLogger } from '../logger';

export async function batchQuery(query, limit) {
  let finished = false;
  let page = 0;
  const finalResult = [];

  while (!finished) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await ActivityReport.findAll({
      ...query,
      limit,
      offset: page * limit,
    });
    /*
      Sequelize adds a bunch of data/functions to items it retrieves from
      the database. We _should_ be able to give sequelize `raw: true` to
      get results without the extra sequelize "stuff", but the link to an
      issue below shows sequelize can't handle `raw: true` with `hasMany`
      associations.

      When DB objects have the extra sequelize "stuff" we run into memory
      issues. When we get only data from the DB we don't run into memory
      issues because all the sequelize "stuff" we don't need is garbage
      collected at some point.

      See https://github.com/sequelize/sequelize/issues/3897
    */
    const raw = JSON.parse(JSON.stringify(rows));
    finalResult.push(...raw);
    if (rows.length < limit) {
      finished = true;
    }
    page += 1;
  }

  return finalResult;
}
async function saveOwner(activityReportId, collaborator) {
  return syncOwner(
    ENTITY_TYPES.REPORT,
    activityReportId,
    [collaborator],
  );
}

async function saveOwnerInstantiators(activityReportId, collaborator) {
  if (!collaborator) {
    throw new Error('No collaborator provided. If creating a report, make sure to provide an `owner`.');
  }

  return syncOwnerInstantiators(
    ENTITY_TYPES.REPORT,
    activityReportId,
    [collaborator],
  );
}

async function saveReportCollaborators(activityReportId, collaborators) {
  return syncEditors(
    ENTITY_TYPES.REPORT,
    activityReportId,
    collaborators,
  );
}

async function saveApprovers(activityReportId, collaborators) {
  return syncRatifiers(
    ENTITY_TYPES.REPORT,
    activityReportId,
    collaborators,
  );
}

async function saveApproval(activityReportId, approval) {
  return Approval.update(approval, {
    where: {
      entityType: ENTITY_TYPES.REPORT,
      entityId: activityReportId,
      tier: 0,
    },
  });
}

async function saveReportRecipients(
  activityReportId,
  activityRecipientIds,
  activityRecipientType,
) {
  const newRecipients = activityRecipientIds.map((activityRecipientId) => {
    const activityRecipient = {
      activityReportId,
      grantId: null,
      otherEntityId: null,
    };

    if (activityRecipientType === RECIPIENT_TYPE.OTHER_ENTITY) {
      activityRecipient.otherEntityId = activityRecipientId;
    } else if (activityRecipientType === RECIPIENT_TYPE.RECIPIENT) {
      activityRecipient.grantId = activityRecipientId;
    }
    return activityRecipient;
  });

  const where = {
    activityReportId,
  };

  const empty = activityRecipientIds.length === 0;
  if (!empty && activityRecipientType === RECIPIENT_TYPE.OTHER_ENTITY) {
    where[Op.or] = {
      otherEntityId: {
        [Op.notIn]: activityRecipientIds,
      },
      grantId: {
        [Op.not]: null,
      },
    };
  } else if (!empty && activityRecipientType === RECIPIENT_TYPE.RECIPIENT) {
    where[Op.or] = {
      grantId: {
        [Op.notIn]: activityRecipientIds,
      },
      otherEntityId: {
        [Op.not]: null,
      },
    };
  }

  await Promise.all(
    newRecipients.map(async (newRecipient) => {
      if (newRecipient.grantId) {
        const gr = await Grant.findOne({ where: { id: newRecipient.grantId } });
        auditLogger.error(JSON.stringify({ name: 'saveReportRecipients', newRecipient, gr }));
        return ActivityRecipient.findOrCreate({
          where: {
            activityReportId: newRecipient.activityReportId,
            grantId: newRecipient.grantId,
          },
          defaults: newRecipient,
        });
      }
      if (newRecipient.otherEntityId) {
        return ActivityRecipient.findOrCreate({
          where: {
            activityReportId: newRecipient.activityReportId,
            otherEntityId: newRecipient.otherEntityId,
          },
          defaults: newRecipient,
        });
      }
      return null;
    }),
  );
  const before = await ActivityRecipient.findAll({ where: { activityReportId } });
  await ActivityRecipient.destroy({ where, individualHooks: true });
  const after = await ActivityRecipient.findAll({ where: { activityReportId } });
  auditLogger.info(JSON.stringify({ name: 'saveReportRecipients', before, after }));
}

async function saveNotes(activityReportId, notes, isRecipientNotes) {
  const noteType = isRecipientNotes ? 'RECIPIENT' : 'SPECIALIST';
  const ids = notes.map((n) => n.id).filter((id) => !!id);
  const where = {
    activityReportId,
    noteType,
    id: {
      [Op.notIn]: ids,
    },
  };
  // Remove any notes that are no longer relevant
  await NextStep.destroy({ where, individualHooks: true });

  if (notes.length > 0) {
    // If a note has an id, and its content has changed, update to the newer content
    // If no id, then assume its a new entry
    const newNotes = notes.map((note) => ({
      id: note.id ? parseInt(note.id, DECIMAL_BASE) : undefined,
      note: note.note,
      completeDate: note.completeDate,
      activityReportId,
      noteType,
    }));
    await NextStep.bulkCreate(newNotes, { updateOnDuplicate: ['note', 'completeDate', 'updatedAt'] });
  }
}

async function update(newReport, report) {
  const updatedReport = await report.update(newReport, {
    fields: _.keys(newReport),
  });
  return updatedReport;
}

async function create(report, silent = false) {
  try {
    return ActivityReport.create(report, {
      silent,
      // logging: (msg) => auditLogger.error(JSON.stringify({ name: 'ActivityReport.create', msg })),
    });
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'ActivityReport.create', err, report }));
    throw new Error(err);
  }
}

export function activityReportByLegacyId(legacyId) {
  return ActivityReport.findOne({
    where: {
      legacyId,
    },
    include: [
      {
        model: ActivityReportFile,
        as: 'reportFiles',
        required: false,
        separate: true,
        include: [
          {
            model: File,
            where: {
              status: {
                [Op.ne]: 'UPLOAD_FAILED',
              },
            },
            as: 'file',
            required: false,
          },
        ],
      },
      {
        model: Collaborator,
        attributes: ['id', 'status', 'note'],
        as: 'approvers',
        required: false,
        separate: true,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName'],
            include: [
              {
                model: Role,
                as: 'roles',
              },
            ],
          },
        ],
      },
    ],
  });
}

export async function populateRecipientInfo(activityRecipients, grantPrograms) {
  /*
      Hopefully this code is temporary until we figure
      out why joining programs to grants causes issues.
  */
  return activityRecipients.map((recipient) => {
    if (recipient.grant && grantPrograms.length) {
      const programsToAssign = grantPrograms.filter((p) => p.grantId === recipient.grantId);
      // Programs.
      Object.defineProperty(
        recipient.grant,
        'programs',
        {
          value: programsToAssign,
          enumerable: true,
        },
      );

      // Program Types.
      const programTypes = programsToAssign && programsToAssign.length > 0
        ? [...new Set(
          programsToAssign.filter((p) => (p.programType))
            .map((p) => (p.programType)).sort(),
        )] : [];
      Object.defineProperty(
        recipient.grant,
        'programTypes',
        {
          value: programTypes,
          enumerable: true,
        },
      );

      // Number with Program Types.
      const numberWithProgramTypes = `${recipient.grant.number} ${programTypes.length > 0 ? ` - ${programTypes.join(', ')}` : ''}`;

      Object.defineProperty(
        recipient.grant,
        'numberWithProgramTypes',
        {
          value: numberWithProgramTypes,
          enumerable: true,
        },
      );

      // Name.
      let nameValue;
      if (recipient.grant.recipient) {
        nameValue = `${recipient.grant.recipient.name} - ${recipient.grant.numberWithProgramTypes}`;
      } else {
        nameValue = `${recipient.grant.numberWithProgramTypes}`;
      }
      Object.defineProperty(
        recipient.grant,
        'name',
        {
          value: nameValue,
          enumerable: true,
        },
      );

      Object.defineProperty(
        recipient,
        'name',
        {
          value: nameValue,
          enumerable: true,
        },
      );
    }
    return { ...recipient };
  });
}

export async function activityReportAndRecipientsById(activityReportId, isImported = false) {
  const arId = parseInt(activityReportId, DECIMAL_BASE);

  const goalsAndObjectives = await getGoalsForReport(arId);

  const recipients = await ActivityRecipient.findAll({
    where: {
      activityReportId: arId,
    },
    attributes: [
      'id',
      'name',
      'activityRecipientId',
      'grantId',
    ],
    include: [
      {
        model: Grant,
        as: 'grant',
      },
    ],
  });

  // Get all grant programs at once to reduce DB calls.
  const grantIds = recipients.map((a) => a.grantId);
  const grantPrograms = await Program.findAll({
    where: {
      grantId: grantIds,
    },
  });

  // Populate Activity Recipient info.
  const updatedRecipients = await populateRecipientInfo(recipients, grantPrograms);

  const activityRecipients = updatedRecipients.map((recipient) => {
    const name = recipient.otherEntity ? recipient.otherEntity.name : recipient.grant.name;

    const activityRecipientId = recipient.otherEntity
      ? recipient.otherEntity.dataValues.id
      : recipient.grant.dataValues.id;

    return {
      id: activityRecipientId,
      activityRecipientId, // Create or Update Report Expect's this Field.
      name,
    };
  });

  // TTAHUB-949: Determine how many other AR's are using these goals.
  /*
  const users = await sequelize.query("SELECT * FROM `users`", { type: QueryTypes.SELECT });
  sequelize.literal(
    `(SELECT arg.goalId AS goalId, COUNT(arg.id) AS reportsUsingGoal
      FROM "ActivityReportGoals" arg
      INNER JOIN "Goals" g ON arg."goalId" = g.id
      WHERE arg."activityReportId" != ${arId} AND  AND g."createdVia" = 'activityReport'
      GROUP BY g.id)`),
      */

  const report = await ActivityReport.findOne({
    attributes: {
      exclude: [
        !isImported && 'imported',
        'legacyId',
      ].filter(Boolean),
    },
    where: {
      id: arId,
    },
    include: [
      {
        model: Approval,
        as: 'approval',
      },
      {
        attributes: [
          ['id', 'value'],
          ['title', 'label'],
          'id',
          'title',
          'status',
          'goalId',
        ],
        model: Objective,
        as: 'objectivesWithGoals',
        include: [
          {
            model: Goal,
            as: 'goal',
            attributes: [
              ['id', 'value'],
              ['name', 'label'],
              'id',
              'name',
              'status',
              'endDate',
              'goalNumber',
            ],
          },
          {
            model: ObjectiveResource,
            as: 'resources',
            attributes: [
              ['userProvidedUrl', 'value'],
              ['id', 'key'],
            ],
          },
          {
            model: Topic,
            as: 'topics',
            attributes: [
              ['id', 'value'],
              ['name', 'label'],
            ],
          },
        ],
      },
      {
        model: Objective,
        as: 'objectivesWithoutGoals',
        include: [
          {
            model: Topic,
            as: 'topics',
            attributes: [
              ['id', 'value'],
              ['name', 'label'],
            ],
          },
          {
            model: File,
            as: 'files',
          },
          {
            model: ObjectiveResource,
            as: 'resources',
            attributes: [
              ['userProvidedUrl', 'value'],
              ['id', 'key'],
            ],
          },
        ],
      },
      {
        model: Collaborator,
        as: 'owner',
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'fullName', 'homeRegionId'],
            include: [{
              model: Role,
              as: 'roles',
              order: [['name', 'ASC']],
              required: false,
            }],
          },
          {
            model: Role,
            as: 'roles',
            order: [['name', 'ASC']],
            required: false,
          },
        ],
      },
      {
        model: Collaborator,
        as: 'collaborators',
        required: false,
        separate: true,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'fullName', 'homeRegionId'],
            include: [{
              model: Role,
              as: 'roles',
              order: [['name', 'ASC']],
              required: false,
            }],
          },
          {
            model: Role,
            as: 'roles',
            order: [['name', 'ASC']],
            required: false,
          },
        ],
      },
      {
        model: File,
        where: {
          status: {
            [Op.ne]: 'UPLOAD_FAILED',
          },
        },
        as: 'files',
        required: false,
      },
      {
        model: NextStep,
        where: {
          noteType: {
            [Op.eq]: 'SPECIALIST',
          },
        },
        attributes: ['note', 'completeDate', 'id'],
        as: 'specialistNextSteps',
        required: false,
        separate: true,
      },
      {
        model: NextStep,
        where: {
          noteType: {
            [Op.eq]: 'RECIPIENT',
          },
        },
        attributes: ['note', 'completeDate', 'id'],
        as: 'recipientNextSteps',
        required: false,
        separate: true,
      },
      {
        model: Collaborator,
        as: 'approvers',
        attributes: ['id', 'status', 'note'],
        required: false,
        separate: true,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName'],
            include: [{
              model: Role,
              as: 'roles',
              order: [['name', 'ASC']],
              required: false,
            }],
          },
          {
            model: Role,
            as: 'roles',
            order: [['name', 'ASC']],
            required: false,
          },
        ],
      },
    ],
    order: [
      [{ model: Objective, as: 'objectivesWithGoals' }, 'id', 'ASC'],
    ],
  });

  return [report, activityRecipients, goalsAndObjectives];
}

/**
 * Retrieves activity reports in sorted slices
 * using sequelize.literal for several associated fields based on the following
 * https://github.com/sequelize/sequelize/issues/11288
 *
 * @param {*} sortBy - field to sort by; default updatedAt
 * @param {*} sortDir - order: either ascending or descending; default desc
 * @param {*} offset - offset from the start of the total sorted results
 * @param {*} limit - size of the slice
 * @returns {Promise<any>} - returns a promise with total reports count and the reports slice
 */
export async function activityReports(
  {
    sortBy = 'updatedAt',
    sortDir = 'desc',
    offset = 0,
    limit = REPORTS_PER_PAGE,
    ...filters
  },
  excludeLegacy = false,
) {
  const { activityReport: scopes } = filtersToScopes(filters);

  const where = {
    '$approval.calculatedStatus$': REPORT_STATUSES.APPROVED,
    [Op.and]: scopes,
  };

  if (excludeLegacy) {
    where.legacyId = { [Op.eq]: null };
  }

  const reports = await ActivityReport.findAndCountAll(
    {
      where,
      attributes: [
        'id',
        'displayId',
        'startDate',
        'lastSaved',
        'topics',
        'calculatedStatus',
        'regionId',
        'updatedAt',
        'sortedTopics',
        'legacyId',
        'createdAt',
        'approvedAt',
        'creatorRole',
        'creatorName',
        sequelize.literal(
          `(SELECT
            name as collaboratorName
          FROM "Users"
          JOIN "Collaborators"
          ON "Users"."id" = "Collaborators"."userId"
          AND "Collaborators"."entityType" = '${ENTITY_TYPES.REPORT}'
          AND "Collaborators"."entityId" = "ActivityReport"."id"
          AND '${COLLABORATOR_TYPES.OWNER}' = ALL("Collaborators"."collaboratorRoles")
          LIMIT 1)`,
        ),
        sequelize.literal(
          `(SELECT
            name as collaboratorName
          FROM "Users"
          JOIN "Collaborators"
          ON "Users"."id" = "Collaborators"."userId"
          AND "Collaborators"."entityType" = '${ENTITY_TYPES.REPORT}'
          AND "Collaborators"."entityId" = "ActivityReport"."id"
          AND '${COLLABORATOR_TYPES.EDITOR}' = ALL("Collaborators"."collaboratorRoles")
          LIMIT 1)`,
        ),
        sequelize.literal(
          // eslint-disable-next-line quotes
          `(SELECT "OtherEntities".name as otherEntityName from "OtherEntities" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" AND "ActivityRecipients"."otherEntityId" = "OtherEntities".id order by otherEntityName ${sortDir} limit 1)`,
        ),
        sequelize.literal(
          // eslint-disable-next-line quotes
          `(SELECT "Recipients".name as recipientName FROM "Recipients" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" JOIN "Grants" ON "Grants"."id" = "ActivityRecipients"."grantId" AND "Recipients"."id" = "Grants"."recipientId" order by recipientName ${sortDir} limit 1)`,
        ),
      ],
      include: [
        {
          model: Collaborator,
          as: 'owner',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'fullName', 'homeRegionId'],
              include: [
                {
                  model: Role,
                  as: 'roles',
                },
              ],
              order: [
                [sequelize.col('user."name"'), 'ASC'],
              ],
            },
            {
              model: Role,
              as: 'roles',
              order: [['name', 'ASC']],
            },
          ],
        },
        {
          required: false,
          model: Collaborator,
          as: 'collaborators',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'fullName'],
              include: [
                {
                  model: Role,
                  as: 'roles',
                },
              ],
              order: [
                [sequelize.col('user."name"'), 'ASC'],
              ],
            },
            {
              model: Role,
              as: 'roles',
              order: [['name', 'ASC']],
            },
          ],
        },
        {
          model: Collaborator,
          attributes: ['id', 'status', 'note'],
          as: 'approvers',
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'fullName'],
              include: [
                {
                  model: Role,
                  as: 'roles',
                },
              ],
            },
          ],
        },
      ],
      order: orderReportsBy(sortBy, sortDir),
      offset,
      limit,
      distinct: true,
    },
    {
      subQuery: false,
    },
  );

  const reportIds = reports.rows.map(({ id }) => id);

  const recipients = await ActivityRecipient.findAll({
    where: {
      activityReportId: reportIds,
    },
    attributes: ['id', 'name', 'activityRecipientId', 'activityReportId', 'grantId'],
    // sorting these just so the order is testable
    order: [
      [sequelize.col('grant.recipient.name'), sortDir],
      [sequelize.col('otherEntity.name'), sortDir],
    ],
  });

  const topics = await Topic.findAll({
    attributes: ['name', 'id'],
    include: [
      {
        model: Objective,
        attributes: ['id'],
        as: 'objectives',
        required: true,
        include: {
          attributes: ['activityReportId', 'objectiveId'],
          model: ActivityReportObjective,
          as: 'activityReportObjectives',
          required: true,
          where: {
            activityReportId: reportIds,
          },
        },
      },
    ],
    order: [
      [sequelize.col('name'), sortDir],
    ],
  });

  // Get all grant programs at once to reduce DB calls.
  const grantIds = recipients.map((a) => a.grantId);
  const grantPrograms = await Program.findAll({
    where: {
      grantId: grantIds,
    },
  });

  // Populate Activity Recipient info.
  await populateRecipientInfo(recipients, grantPrograms);

  return { ...reports, recipients, topics };
}

export async function activityReportsForCleanup(userId) {
  const threeMonthsAgo = moment().subtract(3, 'months').format('YYYY-MM-DD');

  return ActivityReport.unscoped().findAll(
    {
      where: {
        // we only cleanup reports from the last three months
        createdAt: { [Op.gt]: threeMonthsAgo },
        [Op.or]: [
          // if the report is created by a user and not in draft status, it is eligible for cleanup
          {
            [Op.and]: {
              '$owner.userId$': { [Op.eq]: userId },
              '$approval.calculatedStatus$': {
                [Op.ne]: REPORT_STATUSES.DRAFT,
              },
            },
          },
          {
            // if the user is an approver on the report, it is eligible for cleanup
            '$approvers.userId$': { [Op.eq]: userId },
          },
          {
            // if the user is an collaborator, and the report is not in draft,
            // it is eligible for cleanup
            '$collaborators.userId$': { [Op.eq]: userId },
            '$approval.calculatedStatus$': {
              [Op.ne]: REPORT_STATUSES.DRAFT,
            },
          },
        ],
      },
      attributes: [
        'id',
        ['$approval.calculatedStatus$', 'calculatedStatus'],
        ['$owner.userId$', 'userId'],
      ],
      include: [
        {
          model: Approval,
          as: 'approval',
        },
        {
          model: Collaborator,
          as: 'owner',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id'],
          }],
        },
        {
          required: false,
          model: Collaborator,
          as: 'owner',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id'],
              duplicating: true,
            },
          ],
        },
        {
          required: false,
          model: Collaborator,
          as: 'collaborators',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id'],
              duplicating: true,
            },
          ],
        },
        {
          model: Collaborator,
          attributes: ['id'],
          as: 'approvers',
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id'],
            },
          ],
        },
      ],
      distinct: true,
    },
    {
      subQuery: false,
    },
  );
}

/**
 * Retrieves alerts based on the following logic:
 * One or both of these high level conditions are true -
 * manager - assigned to approve and report is 'submitted' or 'needs_action'.
 * specialist - owner id or one of the collaborator's id matches and calculatedStatus is not
 * 'approved'.
 * @param {*} userId
 */
export async function activityReportAlerts(userId, {
  sortBy = 'startDate',
  sortDir = 'desc',
  offset = 0,
  ...filters
}) {
  const updatedFilters = await setReadRegions(filters, userId);
  const { activityReport: scopes } = filtersToScopes(updatedFilters);
  const reports = await ActivityReport.findAndCountAll(
    {
      where: {
        [Op.and]: scopes,
        [Op.or]: [
          {
            [Op.or]: [
              { '$approval.calculatedStatus$': REPORT_STATUSES.SUBMITTED },
              { '$approval.calculatedStatus$': REPORT_STATUSES.NEEDS_ACTION },
            ],
            '$approvers.userId$': userId,
          },
          {
            [Op.and]: [
              {
                [Op.and]: [
                  {
                    '$approval.calculatedStatus$': { [Op.ne]: REPORT_STATUSES.APPROVED },
                  },
                ],
              },
              {
                [Op.or]: [{ '$owner->user.id$': userId }, { '$collaborators->user.id$': userId }],
              },
            ],
          },
        ],
        legacyId: null,
      },
      attributes: [
        'id',
        'displayId',
        'startDate',
        [sequelize.col('approval.calculatedStatus'), 'calculatedStatus'],
        'regionId',
        [sequelize.col('owner.userId'), 'userId'],
        'createdAt',
        [sequelize.col('owner.roles.name'), 'creatorRole'],
        [sequelize.col('owner.user.name'), 'creatorName'],
        sequelize.literal(
          `(SELECT
            name AS collaboratorName
          FROM "Users"
          JOIN "Collaborators"
          ON "Users"."id" = "Collaborators"."userId"
          AND "Collaborators"."entityType" = '${ENTITY_TYPES.REPORT}'
          AND "Collaborators"."entityId" = "ActivityReport"."id"
          AND '${COLLABORATOR_TYPES.OWNER}' = ALL("Collaborators"."collaboratorTypes")
          LIMIT 1)`,
        ),
        sequelize.literal(
          `(SELECT
            name AS collaboratorName
          FROM "Users"
          JOIN "Collaborators"
          ON "Users"."id" = "Collaborators"."userId"
          AND "Collaborators"."entityType" = '${ENTITY_TYPES.REPORT}'
          AND "Collaborators"."entityId" = "ActivityReport"."id"
          AND '${COLLABORATOR_TYPES.EDITOR}' = ALL("Collaborators"."collaboratorTypes")
          LIMIT 1)`,
        ),
        sequelize.literal(
          `(SELECT
            "OtherEntities".name AS otherEntityName
          FROM "OtherEntities"
          INNER JOIN "ActivityRecipients"
          ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId"
          AND "ActivityRecipients"."otherEntityId" = "OtherEntities".id
          ORDER BY otherEntityName ${sortDir}
          LIMIT 1)`,
        ),
        sequelize.literal(
          `(SELECT
            "Recipients".name AS recipientName
          FROM "Recipients"
          INNER JOIN "ActivityRecipients"
          ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId"
          JOIN "Grants"
          ON "Grants"."id" = "ActivityRecipients"."grantId"
          AND "Recipients"."id" = "Grants"."recipientId"
          ORDER BY recipientName ${sortDir}
          LIMIT 1)`,
        ),

        // TODO: GH
        // eslint-disable-next-line quotes
        [sequelize.literal(`
        (SELECT
          CASE
            WHEN COUNT(1) = 0
              THEN '0'
            ELSE  CONCAT(SUM(
              CASE
                WHEN COALESCE("Collaborators".status,'needs_action') = 'approved'
                  THEN 1
                ELSE 0
              END), ' of ', COUNT(1))
          END
        FROM "Collaborators"
        WHERE "Collaborators"."entityType" = '${ENTITY_TYPES.REPORT}'
        AND "Collaborators"."entityId" = "ActivityReport"."id"
        AND '${COLLABORATOR_TYPES.RATIFIER}' = ANY("Collaborators"."collaboratorTypes")
        AND "Collaborators"."deletedAt" IS NULL
        limit 1)`), 'pendingApprovals'],
      ],
      include: [
        {
          model: Approval,
          as: 'approval',
          attributes: ['calculatedStatus'],
        },
        {
          model: Collaborator,
          as: 'owner',
          include: [{
            model: User,
            as: 'user',
            attributes: ['name', 'fullName', 'homeRegionId'],
            include: [
              {
                model: Role,
                as: 'roles',
              },
            ],
          }],
        },
        {
          required: false,
          model: Collaborator,
          as: 'collaborators',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'fullName'],
              include: [
                {
                  model: Role,
                  as: 'roles',
                },
              ],
              duplicating: true,
            },
            {
              model: Role,
              as: 'roles',
            },
          ],
        },
        {
          model: Collaborator,
          attributes: ['id', 'status', 'note'],
          as: 'approvers',
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'fullName'],
              include: [
                {
                  model: Role,
                  as: 'roles',
                },
              ],
            },
          ],
        },
      ],
      order: orderReportsBy(sortBy, sortDir),
      offset,
      distinct: true,
    },
    {
      subQuery: false,
    },
  );

  const recipients = await ActivityRecipient.findAll({
    where: {
      activityReportId: reports.rows.map(({ id }) => id),
    },
    attributes: ['id', 'name', 'activityRecipientId', 'activityReportId'],
  });

  return { ...reports, recipients };
}

export function formatResources(resources) {
  return resources.reduce((acc, resource) => {
    // skip empties
    if (!resource) {
      return acc;
    }

    // if we have a value, grab it
    if (resource.value !== undefined) {
      if (resource.value) {
        return [...acc, resource.value];
      }
      // if the above statement is not truthy, we don't want to add it to the array
      return acc;
    }

    // otherwise, we just return the resource, under the assumption that
    // its a string
    return [...acc, resource];
  }, []);
}

export async function createOrUpdate(newActivityReport, report) {
  let savedReport;
  auditLogger.info(JSON.stringify(newActivityReport));
  const {
    approvers,
    approval,
    // approverUserIds,
    goals,
    objectivesWithGoals,
    objectivesWithoutGoals,
    collaborators,
    activityRecipients,
    files,
    owner,
    recipientNextSteps,
    specialistNextSteps,
    ECLKCResourcesUsed,
    nonECLKCResourcesUsed,
    attachments,
    recipientsWhoHaveGoalsThatShouldBeRemoved,
    silent,
    imported,
    ...allFields
  } = newActivityReport;
  const previousActivityRecipientType = report && report.activityRecipientType;
  const resources = {};

  if (ECLKCResourcesUsed) {
    resources.ECLKCResourcesUsed = formatResources(ECLKCResourcesUsed);
  }

  if (nonECLKCResourcesUsed) {
    resources.nonECLKCResourcesUsed = formatResources(nonECLKCResourcesUsed);
  }

  const updatedFields = { ...allFields, ...resources, imported };
  if (report) {
    savedReport = await update(updatedFields, report);
    const { id: savedReportId } = savedReport;
    await saveOwner(savedReportId, owner);
  } else {
    if (silent) {
      savedReport = await create(updatedFields, silent);
    } else {
      savedReport = await create(updatedFields);
    }
    const { id: savedReportId } = savedReport;
    try {
      await saveOwnerInstantiators(savedReportId, owner);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'saveOwnerInstantiators', owner, err }));
      throw new Error(err);
    }
  }
  if (approval) {
    const { id: savedReportId } = savedReport;
    try {
      await saveApproval(savedReportId, approval);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'saveApproval', approval, err }));
      throw new Error(err);
    }
  }
  if (collaborators) {
    const { id: savedReportId } = savedReport;
    try {
      await saveReportCollaborators(savedReportId, collaborators);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'saveReportCollaborators', collaborators, err }));
      throw new Error(err);
    }
  }
  if (approvers) {
    const { id: savedReportId } = savedReport;
    try {
      await saveApprovers(savedReportId, approvers);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'saveApprovers', approvers, err }));
      throw new Error(err);
    }
  }

  if (activityRecipients) {
    try {
      const { activityRecipientType: recipientType, id: savedReportId } = savedReport;
      let typeOfRecipient = recipientType;
      if (typeOfRecipient === null || typeOfRecipient === undefined) {
        if (activityRecipients[0].hasOwnProperty('otherEntityId')) { // eslint-disable-line no-prototype-builtins
          typeOfRecipient = RECIPIENT_TYPE.OTHER_ENTITY;
        } else if (activityRecipients[0].hasOwnProperty('grantId')) { // eslint-disable-line no-prototype-builtins
          typeOfRecipient = RECIPIENT_TYPE.RECIPIENT;
        }
      }
      const activityRecipientIds = activityRecipients.map((g) => {
        if (g.activityRecipientId) return g.activityRecipientId;
        return typeOfRecipient === RECIPIENT_TYPE.OTHER_ENTITY
          ? g.otherEntityId
          : g.grantId;
      });
      auditLogger.info(JSON.stringify({ name: 'saveReportRecipients', activityRecipients, activityRecipientIds, typeOfRecipient }));
      await saveReportRecipients(savedReportId, activityRecipientIds, typeOfRecipient);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'saveReportRecipients', activityRecipients, err }));
      throw new Error(err);
    }
  }

  if (recipientNextSteps) {
    try {
      const { id } = savedReport;
      await saveNotes(id, recipientNextSteps, true);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'saveNotes', recipientNextSteps, err }));
      throw new Error(err);
    }
  }

  if (specialistNextSteps) {
    try {
      const { id } = savedReport;
      await saveNotes(id, specialistNextSteps, false);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'saveNotes', specialistNextSteps, err }));
      throw new Error(err);
    }
  }

  /**
     * since on partial updates, a new value for activity recipient type may not be passed,
     * we use the old one in that case
     */

  const recipientType = () => {
    if (allFields && allFields.activityRecipientType) {
      return allFields.activityRecipientType;
    }
    if (report && report.activityRecipientType) {
      return report.activityRecipientType;
    }

    return '';
  };

  const activityRecipientType = recipientType();

  if (recipientsWhoHaveGoalsThatShouldBeRemoved) {
    try {
      await removeRemovedRecipientsGoals(recipientsWhoHaveGoalsThatShouldBeRemoved, savedReport);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'removeRemovedRecipientsGoals', recipientsWhoHaveGoalsThatShouldBeRemoved, err }));
      throw new Error(err);
    }
  }

  if (previousActivityRecipientType
    && previousActivityRecipientType !== report.activityRecipientType) {
    try {
      await removeUnusedGoalsObjectivesFromReport(report.id, []);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'removeUnusedGoalsObjectivesFromReport', reportId: report.id, err }));
      throw new Error(err);
    }
  }

  if (activityRecipientType === 'other-entity' && objectivesWithoutGoals) {
    try {
      await saveObjectivesForReport(objectivesWithoutGoals, savedReport);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'saveObjectivesForReport', objectivesWithoutGoals, err }));
      throw new Error(err);
    }
  } else if (activityRecipientType === 'recipient' && goals) {
    try {
      await saveGoalsForReport(goals, savedReport, recipientsWhoHaveGoalsThatShouldBeRemoved);
    } catch (err) {
      auditLogger.error(JSON.stringify({ name: 'saveGoalsForReport', savedReport, err }));
      throw new Error(err);
    }
  }

  // // Approvers are removed if approverUserIds is an empty array
  // if (approverUserIds) { // TODO: Remove this
  //   await syncRatifiers(
  //     ENTITY_TYPES.REPORT,
  //     savedReport.id,
  //     approverUserIds.map((id) => { const approver = { userId: id }; return approver; }),
  //   );
  // }
  try {
    const [r, recips, gAndOs] = await activityReportAndRecipientsById(savedReport.id, !!imported);
    return {
      ...r.dataValues,
      displayId: r.displayId,
      activityRecipients: recips,
      goalsAndObjectives: gAndOs,
    };
  } catch (err) {
    auditLogger.error(JSON.stringify(err));
    throw new Error(err);
  }
}

export async function setStatus(report, status) {
  await Approval.update({ submissionStatus: status }, {
    where: { entityType: ENTITY_TYPES.REPORT, entityId: report.id, tier: 0 },
    individualHooks: true,
  });
  return activityReportAndRecipientsById(report.id);
}

/*
 * Queries the db for relevant recipients depending on the region id.
 * If no region id is passed, then default to returning all available recipients.
 * Note: This only affects grants and recipients. Non Recipients remain unaffected by the region id.
 *
 * @param {number} [regionId] - A region id to query against
 * @returns {*} Grants and Other entities
 */
export async function possibleRecipients(regionId) {
  const where = { status: 'Active', regionId };

  const grants = await Recipient.findAll({
    attributes: ['id', 'name'],
    order: ['name'],
    include: [{
      where,
      model: Grant,
      as: 'grants',
      attributes: [['id', 'activityRecipientId'], 'name', 'number'],
      include: [{
        model: Recipient,
        as: 'recipient',
      },
      {
        model: Program,
        as: 'programs',
        attributes: ['programType'],
      },
      ],
    }],
  });
  const otherEntities = await OtherEntity.findAll({
    raw: true,
    attributes: [['id', 'activityRecipientId'], 'name'],
  });
  return { grants, otherEntities };
}

async function getDownloadableActivityReports(where, separate = true) {
  const query = {
    where,
    attributes: {
      include: ['displayId', 'createdAt', 'approvedAt', 'creatorRole', 'creatorName'],
      exclude: ['imported', 'legacyId', 'additionalNotes', 'approvers'],
    },
    include: [
      {
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        attributes: ['ttaProvided', 'status'],
        order: [['objective', 'goal', 'id'], ['objective', 'id']],
        separate,
        include: [{
          model: Objective,
          as: 'objective',
          include: [{
            model: Goal,
            as: 'goal',
          },
          ],
          attributes: ['id', 'title', 'status'],
        },
        {
          model: ActivityReportObjectiveResource,
          as: 'activityReportObjectiveResources',
        },
        {
          model: Topic,
          as: 'topics',
        },
        {
          model: File,
          as: 'files',
        },
        ],
      },
      {
        model: ActivityReportGoal,
        as: 'activityReportGoals',
        separate,
        include: [{
          model: Goal,
          as: 'goal',
        }],
        attributes: ['status'],
        order: [['goal', 'id']],
      },
      {
        model: ActivityRecipient,
        attributes: ['id', 'name', 'activityRecipientId', 'grantId', 'otherEntityId'],
        as: 'activityRecipients',
        required: false,
        separate,
        include: [
          {
            model: Grant,
            as: 'grant',
          },
        ],
      },
      {
        model: File,
        where: {
          status: {
            [Op.ne]: 'UPLOAD_FAILED',
          },
        },
        as: 'files',
        required: false,
      },
      {
        model: Collaborator,
        as: 'owner',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName', 'homeRegionId'],
          },
          {
            model: Role,
            as: 'roles',
            order: [['name', 'ASC']],
          },
        ],
      },
      {
        model: Collaborator,
        as: 'collaborators',
        separate,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName', 'homeRegionId'],
          },
          {
            model: Role,
            as: 'roles',
            order: [['name', 'ASC']],
          },
        ],
      },
      {
        model: NextStep,
        where: {
          noteType: {
            [Op.eq]: 'SPECIALIST',
          },
        },
        attributes: ['note', 'id'],
        as: 'specialistNextSteps',
        separate,
        required: false,
      },
      {
        model: NextStep,
        where: {
          noteType: {
            [Op.eq]: 'RECIPIENT',
          },
        },
        attributes: ['note', 'id'],
        as: 'recipientNextSteps',
        separate,
        required: false,
      },
      {
        model: Collaborator,
        attributes: ['userId'],
        as: 'approvers',
        required: false,
        separate,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'fullName', 'homeRegionId'],
          },
          {
            model: Role,
            as: 'roles',
            order: [['name', 'ASC']],
          },
        ],
      },
    ],
    subQuery: separate,
    order: [['id', 'DESC']],
  };

  // Get reports.
  const reports = await batchQuery(query, 2000);

  // Populate Activity Recipient info.
  const updatedReportPromises = reports.map(async (r) => {
    const grantIds = r.activityRecipients.map((a) => a.grantId);
    // Get all grant programs at once to reduce DB calls.
    const grantPrograms = await Program.findAll({
      where: {
        grantId: grantIds,
      },
    });
    const updatedRecipients = await populateRecipientInfo(r.activityRecipients, grantPrograms);
    return { ...r, activityRecipients: updatedRecipients };
  });
  return Promise.all(updatedReportPromises);
}

export async function getAllDownloadableActivityReports(
  readRegions,
  filters,
) {
  const regions = readRegions || [];

  const { activityReport: scopes } = filtersToScopes(filters);

  const where = {
    regionId: {
      [Op.in]: regions,
    },
    '$approval.calculatedStatus$': REPORT_STATUSES.APPROVED,
    [Op.and]: scopes,
  };

  return getDownloadableActivityReports(where);
}

export async function getAllDownloadableActivityReportAlerts(userId, filters) {
  const { activityReport: scopes } = filtersToScopes(filters);
  const where = {
    [Op.and]: scopes,
    [Op.or]: [
      { // User is approver, and report is submitted or needs_action
        [Op.and]: [{
          [Op.or]: [
            { '$approval.calculatedStatus$': REPORT_STATUSES.SUBMITTED },
            { '$approval.calculatedStatus$': REPORT_STATUSES.NEEDS_ACTION },
          ],
          '$approvers.userId$': userId,
        }],
      },
      { // User is owner or collaborator, and report is approved
        [Op.and]: [
          {
            [Op.and]: [
              {
                '$approval.calculatedStatus$': { [Op.ne]: REPORT_STATUSES.APPROVED },
              },
            ],
          },
          {
            [Op.or]: [{ '$owner.userId$': userId }, { '$collaborators.userId$': userId }],
          },
        ],
      },
    ],
    legacyId: null,
  };

  return getDownloadableActivityReports(where, false);
}

/**
 * Fetches ActivityReports for downloading
 *
 * @param {Array<int>} report - array of report ids
 * @returns {Promise<any>} - returns a promise with total reports count and the reports slice
 */
export async function getDownloadableActivityReportsByIds(readRegions, {
  report = [],
}) {
  const regions = readRegions || [];
  // Create a Set to ensure unique ordered values
  const reportSet = Array.isArray(report) ? new Set(report) : new Set([report]);
  const reportIds = [...reportSet].filter((i) => /\d+/.test(i));
  const where = { regionId: regions, id: { [Op.in]: reportIds } };
  return getDownloadableActivityReports(where);
}

/**
 * Fetches ActivityReports where a user is a collaborator based by date
 *
 * @param {integer} userId - user id
 * @param {string} date - date interval string, e.g. NOW() - INTERVAL '1 DAY'
 * @returns {Promise<ActivityReport[]>} - retrieved reports
 */
// TODO: I don't think using the audit log is the correct method to do this.
export async function activityReportsWhereCollaboratorByDate(userId, date) {
  const reports = await ActivityReport.findAll({
    attributes: ['id', 'displayId'],
    where: {
      [Op.and]: [
        {
          '$approval.calculatedStatus$': {
            [Op.ne]: REPORT_STATUSES.APPROVED,
          },
        },
        {
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT (new_row_data->'entityId')::NUMERIC
            FROM "ZALCollaborators"
            where dml_timestamp > ${date}
            AND (new_row_data->'userId')::NUMERIC = ${userId}
            AND (new_row_data->>'entityType')::TEXT = '${ENTITY_TYPES.REPORT}'
            AND (new_row_data->>'collaboratorTypes')::TEXT like '%${COLLABORATOR_TYPES.EDITOR}%')`,
            ),
          },
        },
      ],
    },
    include: [
      {
        model: Approval,
        as: 'approval',
      },
      {
        model: Collaborator,
        as: 'collaborators',
        where: { userId },
      },
    ],
  });
  return reports;
}

/**
 * Fetches ActivityReports where change was requested and a user is either
 * a collaborator or an author
 *
 * @param {integer} userId - user id
 * @param {string} date - date interval string, e.g. NOW() - INTERVAL '1 DAY'
 * @returns {Promise<ActivityReport[]>} - retrieved reports
 */
export async function activityReportsChangesRequestedByDate(userId, date) {
  const reports = await ActivityReport.findAll({
    attributes: ['id', 'displayId'],
    where: {
      [Op.and]: [
        {
          '$approval.calculatedStatus$': {
            [Op.ne]: REPORT_STATUSES.APPROVED,
          },
        },
        {
          [Op.or]: [{ '$owner.userId$': userId }, { '$collaborators.userId$': userId }],
        },
        {
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT (new_row_data->'entityId')::NUMERIC
                FROM "ZALApprovals"
                where dml_timestamp > ${date}
                AND (new_row_data->>'calculatedStatus')::TEXT = '${REPORT_STATUSES.NEEDS_ACTION}'
                AND (new_row_data->'entityType')::TEXT = '${ENTITY_TYPES.REPORT}'
                AND (new_row_data->'tier')::NUMERIC = 0)`,
            ),
          },
        },
      ],
    },
    include: [
      {
        model: Approval,
        as: 'approval',
      },
      {
        model: Collaborator,
        as: 'owner',
        attributes: ['userId'],
      },
      {
        model: Collaborator,
        as: 'collaborators',
        attributes: ['userId'],
        required: false,
      },
    ],
  });
  return reports;
}

/**
 * Fetches ActivityReports that were submitted for the manager's review
 *
 * @param {integer} userId - manager's id
 * @param {string} date - date interval string, e.g. NOW() - INTERVAL '1 DAY'
 * @returns {Promise<ActivityReport[]>} - retrieved reports
 */
export async function activityReportsSubmittedByDate(userId, date) {
  const reports = await ActivityReport.findAll({
    attributes: ['id', 'displayId'],
    where: {
      id: {
        [Op.in]: sequelize.literal(
          `(SELECT (new_row_data->'entityId')::NUMERIC
            FROM "ZALApprovals"
            where dml_timestamp > ${date}
            AND (new_row_data->>'calculatedStatus')::TEXT = '${REPORT_STATUSES.SUBMITTED}'
            AND (new_row_data->'entityType')::TEXT = '${ENTITY_TYPES.REPORT}'
            AND (new_row_data->'tier')::NUMERIC = 0)`,
        ),
      },
    },
    include: [
      {
        model: Approval,
        as: 'approval',
        where: {
          calculatedStatus: { [Op.notIn]: [REPORT_STATUSES.APPROVED, REPORT_STATUSES.DRAFT] },
        },
        required: true,
      },
      {
        model: Collaborator,
        as: 'approvers',
        attributes: ['userId'],
      },
    ],
  });
  return reports;
}

/**
 * Fetches ActivityReports that were approved for authors and collaborators
 *
 * @param {integer} userId - user's id
 * @param {string} date - date interval string, e.g. NOW() - INTERVAL '1 DAY'
 * @returns {Promise<ActivityReport[]>} - retrieved reports
 */
export async function activityReportsApprovedByDate(userId, date) {
  const reports = await ActivityReport.findAll({
    attributes: ['id', 'displayId'],
    where: {
      [Op.and]: [
        {
          '$approval.calculatedStatus$': REPORT_STATUSES.APPROVED,
        },
        {
          [Op.or]: [{ '$owner.userId$': userId }, { '$collaborators.userId$': userId }],
        },
        {
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT (new_row_data->'entityId')::NUMERIC
                FROM "ZALApprovals"
                where dml_timestamp > ${date}
                AND (new_row_data->>'calculatedStatus')::TEXT = '${REPORT_STATUSES.APPROVED}'
                AND (new_row_data->'entityType')::TEXT = '${ENTITY_TYPES.REPORT}'
                AND (new_row_data->'tier')::NUMERIC = 0)`,
            ),
          },
        },
      ],
    },
    include: [
      {
        model: Approval,
        as: 'approval',
      },
      {
        model: Collaborator,
        as: 'owner',
        attributes: ['userId'],
      },
      {
        model: Collaborator,
        as: 'collaborators',
        attributes: ['userId'],
        required: false,
      },
    ],
  });
  return reports;
}
