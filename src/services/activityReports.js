/* eslint-disable @typescript-eslint/quotes */
import _ from 'lodash';
import { Op } from 'sequelize';
import moment from 'moment';
import { REPORT_STATUSES, DECIMAL_BASE } from '@ttahub/common';
import { REPORTS_PER_PAGE } from '../constants';
import orderReportsBy from '../lib/orderReportsBy';
import filtersToScopes from '../scopes';
import { setReadRegions } from './accessValidation';
import { syncApprovers } from './activityReportApprovers';
import SCOPES from '../middleware/scopeConstants';
import {
  ActivityReport,
  ActivityReportApprover,
  ActivityReportCollaborator,
  ActivityReportFile,
  sequelize,
  ActivityRecipient,
  File,
  Grant,
  GrantReplacements,
  Recipient,
  OtherEntity,
  Goal,
  GoalTemplate,
  GoalFieldResponse,
  User,
  NextStep,
  Objective,
  Program,
  ActivityReportGoal,
  ActivityReportObjective,
  Resource,
  ActivityReportObjectiveTopic,
  Topic,
  CollaboratorRole,
  Role,
  Course,
} from '../models';
import {
  removeRemovedRecipientsGoals,
} from '../goalServices/goals';
import getGoalsForReport from '../goalServices/getGoalsForReport';
import { getObjectivesByReportId } from './objectives';
import parseDate from '../lib/date';
import { removeUnusedGoalsObjectivesFromReport, saveStandardGoalsForReport } from './standardGoals';
import { usersWithPermissions } from './users';
import { auditLogger as logger } from '../logger';
import { sanitizeActivityReportPageState } from '../lib/activityReportPageState';

const namespace = 'SERVICE:ACTIVITY_REPORTS';

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

async function saveReportCollaborators(activityReportId, collaborators) {
  const newCollaborators = collaborators.map((collaborator) => ({
    activityReportId,
    userId: collaborator,
  }));

  // Create and delete activity report collaborators.
  if (newCollaborators.length > 0) {
    await Promise.all(newCollaborators.map((where) => (
      ActivityReportCollaborator.findOrCreate({ where })
    )));
    await ActivityReportCollaborator.destroy(
      {
        where: {
          activityReportId,
          userId: {
            [Op.notIn]: collaborators,
          },
        },
      },
    );
  } else {
    await ActivityReportCollaborator.destroy(
      {
        where: {
          activityReportId,
        },
      },
    );
  }

  const updatedReportCollaborators = await ActivityReportCollaborator.findAll({
    where: { activityReportId },
    include: [
      {
        model: User,
        as: 'user',
        include: [
          {
            model: Role,
            as: 'roles',
          },
        ],
      },
    ],
  });

  if (updatedReportCollaborators && updatedReportCollaborators.length > 0) {
    // eslint-disable-next-line max-len
    await Promise.all(updatedReportCollaborators.map((collaborator) => Promise.all((collaborator?.user?.roles || []).map(async (role) => CollaboratorRole.findOrCreate({
      where: {
        activityReportCollaboratorId: collaborator.id,
        roleId: role.id,
      },
    })))));
  }
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

    if (activityRecipientType === 'other-entity') {
      activityRecipient.otherEntityId = activityRecipientId;
    } else if (activityRecipientType === 'recipient') {
      activityRecipient.grantId = activityRecipientId;
    }
    return activityRecipient;
  });

  const where = {
    activityReportId,
  };

  const empty = activityRecipientIds.length === 0;
  if (!empty && activityRecipientType === 'other-entity') {
    where[Op.or] = {
      otherEntityId: {
        [Op.notIn]: activityRecipientIds,
      },
      grantId: {
        [Op.not]: null,
      },
    };
  } else if (!empty && activityRecipientType === 'recipient') {
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

  await ActivityRecipient.destroy({ where });
}

export async function saveNotes(activityReportId, notes, isRecipientNotes) {
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
  await NextStep.destroy({
    where,
    individualHooks: true,
  });

  // If a note has an id, preserve it for update
  // If no id, and note or completeDate is provided, treat as a new entry
  const newNotes = notes.map((note) => ({
    id: note.id ? parseInt(note.id, DECIMAL_BASE) : undefined,
    note: note.note,
    completeDate: parseDate(note.completeDate),
    activityReportId,
    noteType,
  })).filter(({ id, note, completeDate }) => (
    id || (note && note.length > 0) || completeDate
  ));

  if (newNotes.length > 0) {
    await NextStep.bulkCreate(newNotes, {
      updateOnDuplicate: ['note', 'completeDate', 'updatedAt'],
    });
  }
}

async function update(newReport, report) {
  const updatedReport = await report.update(newReport, {
    fields: _.keys(newReport),
  });
  return updatedReport;
}

async function create(report) {
  return ActivityReport.create(report);
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
        model: ActivityReportApprover,
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

export async function activityReportAndRecipientsById(activityReportId) {
  const arId = parseInt(activityReportId, DECIMAL_BASE);

  const goalsAndObjectives = await getGoalsForReport(arId);
  const objectivesWithoutGoals = await getObjectivesByReportId(arId);

  const recipients = await ActivityRecipient.findAll({
    where: {
      activityReportId: arId,
    },
    attributes: [
      'id',
      'name',
      'activityRecipientId',
      'grantId',
      'otherEntityId',
    ],
    include: [
      {
        model: Grant,
        as: 'grant',
        include: [
          {
            model: Program,
            as: 'programs',
            attributes: ['programType'],
          },
          {
            model: Recipient,
            as: 'recipient',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
  });
  const activityRecipients = recipients.map((recipient) => {
    const recipientId = recipient.id;
    const name = recipient.otherEntity ? recipient.otherEntity.name : recipient.grant.name;
    const activityRecipientId = recipient.otherEntity
      ? recipient.otherEntity.dataValues.id : recipient.grant.dataValues.id;

    return {
      id: activityRecipientId,
      recipientId,
      activityRecipientId, // Create or Update Report Expect's this Field.
      name,
      // We need the actual id of the recipient to narrow down what grants are selected on the FE.
      // Viewing legacy OE reports will have a null grant.
      recipientIdForLookUp: recipient.grant ? recipient.grant.recipientId : null,
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
    attributes: { exclude: ['imported', 'legacyId'] },
    where: {
      id: arId,
    },
    include: [
      {
        attributes: [
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
              'id',
              'name',
              'status',
              'goalNumber',
            ],
          },
        ],
      },
      {
        model: User,
        as: 'author',
        include: [
          {
            model: Role, as: 'roles', order: [['name', 'ASC']],
          },
        ],
      },
      {
        required: false,
        model: ActivityReportCollaborator,
        separate: true,
        as: 'activityReportCollaborators',
        include: [
          {
            model: User,
            as: 'user',
            include: [
              { model: Role, as: 'roles', order: [['name', 'ASC']] },
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
        attributes: ['note', 'completeDate', 'id'],
        as: 'specialistNextSteps',
        required: false,
        separate: true,
      },
      {
        model: NextStep,
        attributes: ['note', 'completeDate', 'id'],
        as: 'recipientNextSteps',
        required: false,
        separate: true,
      },
      {
        model: ActivityReportApprover,
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
    order: [
      [{ model: Objective, as: 'objectivesWithGoals' }, 'id', 'ASC'],
    ],
  });

  if (report?.specialistNextSteps?.length === 0) {
    report.specialistNextSteps[0] = {
      dataValues: {
        note: '',
      },
    };
  }
  if (report?.recipientNextSteps?.length === 0) {
    report.recipientNextSteps[0] = {
      dataValues: {
        note: '',
      },
    };
  }

  return [report, activityRecipients, goalsAndObjectives, objectivesWithoutGoals];
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
  userId = 0,
  ids = [],
) {
  const { activityReport: scopes } = await filtersToScopes(filters, { userId });

  const where = {
    calculatedStatus: REPORT_STATUSES.APPROVED,
    [Op.and]: scopes,
  };

  if (excludeLegacy) {
    where.legacyId = { [Op.eq]: null };
  }

  if (ids?.length) {
    where.id = { [Op.in]: ids };
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
          '(SELECT name as authorName FROM "Users" WHERE "Users"."id" = "ActivityReport"."userId")',
        ),
        sequelize.literal(
          '(SELECT name as collaboratorName FROM "Users" join "ActivityReportCollaborators" on "Users"."id" = "ActivityReportCollaborators"."userId" and  "ActivityReportCollaborators"."activityReportId" = "ActivityReport"."id" limit 1)',
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
          model: User,
          attributes: ['name', 'fullName', 'homeRegionId'],
          as: 'author',
          include: [
            {
              model: Role,
              as: 'roles',
            },
          ],
          order: [
            [sequelize.col('author."name"'), 'ASC'],
          ],
        },
        {
          required: false,
          model: ActivityReportCollaborator,
          as: 'activityReportCollaborators',
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
            },
          ],
        },
        {
          model: ActivityReportApprover,
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
    include: [
      {
        model: Grant,
        as: 'grant',
        required: false,
        attributes: [
          'id',
          'number',
          'cdi',
          'status',
          'granteeName',
          'recipientId',
          'name',
          'inactivationDate',
          'inactivationReason',
        ],
        include: [
          {
            model: GrantReplacements,
            as: 'replacedGrantReplacements',
            required: false,
            attributes: ['replacedGrantId', 'replacingGrantId', 'replacementDate'],
          },
          {
            model: GrantReplacements,
            as: 'replacingGrantReplacements',
            required: false,
            attributes: ['replacedGrantId', 'replacingGrantId', 'replacementDate'],
          },
        ],
      },
    ],
  });

  const arots = await ActivityReportObjectiveTopic.findAll({
    include: [
      {
        model: ActivityReportObjective,
        as: 'activityReportObjective',
        where: {
          activityReportId: reportIds,
        },
        required: true,
      },
      {
        model: Topic,
        as: 'topic',
        required: true,
      },
    ],
  });

  const topics = arots.map((arot) => ({
    activityReportId: arot.activityReportObjective.activityReportId,
    name: arot.topic.name,
  }));

  return {
    ...reports, recipients, topics,
  };
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
              userId,
              calculatedStatus: {
                [Op.ne]: REPORT_STATUSES.DRAFT,
              },
            },
          },
          {
            // if the user is an approver on the report, it is eligible for cleanup
            '$approvers.userId$': userId,
          },
          {
            // if the user is an collaborator, and the report is not in draft,
            // it is eligible for cleanup
            '$activityReportCollaborators->user.id$': userId,
            calculatedStatus: {
              [Op.ne]: REPORT_STATUSES.DRAFT,
            },
          },
        ],
      },
      attributes: [
        'id',
        'calculatedStatus',
        'userId',
      ],
      include: [
        {
          model: User,
          attributes: ['id'],
          as: 'author',
        },
        {
          required: false,
          model: ActivityReportCollaborator,
          as: 'activityReportCollaborators',
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
          model: ActivityReportApprover,
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
 * specialist - author id or one of the collaborator's id matches and calculatedStatus is not
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
  const { activityReport: scopes } = await filtersToScopes(updatedFilters, { userId });
  const reports = await ActivityReport.findAndCountAll(
    {
      where: {
        [Op.and]: scopes,
        [Op.or]: [
          {
            calculatedStatus: {
              [Op.in]: [
                REPORT_STATUSES.SUBMITTED,
                REPORT_STATUSES.NEEDS_ACTION,
              ],
            },
            id: {
              [Op.in]: sequelize.literal(`(SELECT ara."activityReportId" FROM "ActivityReportApprovers" ara
                WHERE ara."userId" = ${userId} AND ara."activityReportId" = "ActivityReport"."id" AND ara."deletedAt" IS NULL)`),
            },
          },
          {
            [Op.and]: [
              {
                [Op.and]: [
                  {
                    calculatedStatus: { [Op.ne]: REPORT_STATUSES.APPROVED },
                  },
                ],
              },
              {
                [Op.or]: [
                  { userId },
                  {
                    id: {
                      [Op.in]: sequelize.literal(`(SELECT arc."activityReportId" FROM "ActivityReportCollaborators" arc
                      WHERE arc."userId" = ${userId} AND arc."activityReportId" = "ActivityReport"."id")`),
                    },
                  },
                ],
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
        'calculatedStatus',
        'regionId',
        'userId',
        'createdAt',
        'creatorRole',
        'language',
        'creatorName',
        sequelize.literal(
          '(SELECT name as authorName FROM "Users" WHERE "Users"."id" = "ActivityReport"."userId")',
        ),
        sequelize.literal(
          '(SELECT name as collaboratorName FROM "Users" join "ActivityReportCollaborators" on "Users"."id" = "ActivityReportCollaborators"."userId" and  "ActivityReportCollaborators"."activityReportId" = "ActivityReport"."id" limit 1)',
        ),
        sequelize.literal(
          `(SELECT "OtherEntities".name as otherEntityName from "OtherEntities" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" AND "ActivityRecipients"."otherEntityId" = "OtherEntities".id order by otherEntityName ${sortDir} limit 1)`,
        ),
        sequelize.literal(
          `(SELECT "Recipients".name as recipientName FROM "Recipients" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" JOIN "Grants" ON "Grants"."id" = "ActivityRecipients"."grantId" AND "Recipients"."id" = "Grants"."recipientId" order by recipientName ${sortDir} limit 1)`,
        ),
      ],
      include: [
        {
          model: User,
          attributes: ['name', 'fullName', 'homeRegionId'],
          include: [
            {
              model: Role,
              as: 'roles',
            },
          ],
          as: 'author',
        },
        {
          required: false,
          model: ActivityReportCollaborator,
          as: 'activityReportCollaborators',
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
          model: ActivityReportApprover,
          attributes: ['id', 'status', 'note'],
          as: 'approvers',
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              required: true,
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

export async function createOrUpdate(newActivityReport, report, userId) {
  let savedReport;
  const {
    approvers,
    approverUserIds,
    goals,
    objectivesWithGoals,
    objectivesWithoutGoals,
    activityReportCollaborators,
    activityRecipients,
    files,
    author,
    recipientNextSteps,
    specialistNextSteps,
    ECLKCResourcesUsed,
    nonECLKCResourcesUsed,
    attachments,
    recipientsWhoHaveGoalsThatShouldBeRemoved,
    ...allFields
  } = newActivityReport;
  const previousActivityRecipientType = report?.activityRecipientType;
  const resources = {};

  if (ECLKCResourcesUsed) {
    resources.ECLKCResourcesUsed = formatResources(ECLKCResourcesUsed);
  }

  if (nonECLKCResourcesUsed) {
    resources.nonECLKCResourcesUsed = formatResources(nonECLKCResourcesUsed);
  }

  const updatedFields = { ...allFields, ...resources };
  if (report) {
    savedReport = await update(updatedFields, report);
  } else {
    savedReport = await create(updatedFields);
  }

  if (activityReportCollaborators) {
    const { id } = savedReport;
    const newCollaborators = activityReportCollaborators.map(
      (c) => c.user.id,
    );
    await saveReportCollaborators(id, newCollaborators);
  }

  if (activityRecipients) {
    const { activityRecipientType: typeOfRecipient, id: savedReportId } = savedReport;
    const activityRecipientIds = activityRecipients.map(
      (g) => g.activityRecipientId,
    );
    await saveReportRecipients(savedReportId, activityRecipientIds, typeOfRecipient);
  }

  if (recipientNextSteps) {
    const { id } = savedReport;
    await saveNotes(id, recipientNextSteps, true);
  }

  if (specialistNextSteps) {
    const { id } = savedReport;
    await saveNotes(id, specialistNextSteps, false);
  }

  if (
    recipientsWhoHaveGoalsThatShouldBeRemoved?.length
  ) {
    await removeRemovedRecipientsGoals(recipientsWhoHaveGoalsThatShouldBeRemoved, savedReport);
  }

  if (previousActivityRecipientType
    && previousActivityRecipientType !== report.activityRecipientType) {
    await removeUnusedGoalsObjectivesFromReport(report.id, []);
  }
  if (goals) {
    await saveStandardGoalsForReport(goals, userId, savedReport);
  }

  // Approvers are removed if approverUserIds is an empty array
  if (approverUserIds) {
    const regionId = savedReport.regionId ?? report?.regionId;
    let sanitizedApproverIds = [];

    if (regionId) {
      const permittedApprovers = await usersWithPermissions(
        [regionId],
        [SCOPES.APPROVE_REPORTS],
      );
      const permittedIds = new Set(permittedApprovers.map((user) => user.id));
      sanitizedApproverIds = Array.from(
        new Set(
          approverUserIds
            .map((id) => Number(id))
            .filter((id) => permittedIds.has(id)),
        ),
      );

      if (sanitizedApproverIds.length !== approverUserIds.length) {
        logger.warn('Filtered unauthorized approvers from save request', {
          namespace,
          activityReportId: savedReport.id,
          requestedApproverUserIds: approverUserIds,
          sanitizedApproverUserIds: sanitizedApproverIds,
        });
      }
    } else {
      sanitizedApproverIds = approverUserIds;
      logger.warn('Unable to determine region when syncing approvers; skipping permission filter', {
        namespace,
        activityReportId: savedReport.id,
      });
    }

    await syncApprovers(savedReport.id, sanitizedApproverIds);
  }

  const [reportModel, recips, gAndOs, oWoG] = await activityReportAndRecipientsById(savedReport.id);
  const reportPlain = reportModel && reportModel.dataValues
    ? { ...reportModel.dataValues }
    : (reportModel || {});

  const sanitizedPageState = sanitizeActivityReportPageState(
    {
      ...reportPlain,
      activityRecipients: recips,
      goalsAndObjectives: gAndOs,
      objectivesWithoutGoals: oWoG,
    },
    newActivityReport.pageState || reportPlain.pageState || {},
  );

  if (!_.isEqual(reportPlain.pageState, sanitizedPageState)) {
    await ActivityReport.update({
      pageState: sanitizedPageState,
    }, {
      where: { id: savedReport.id },
    });
    reportPlain.pageState = sanitizedPageState;
  }

  return {
    ...reportPlain,
    displayId: reportModel.displayId,
    pageState: sanitizedPageState,
    activityRecipients: recips,
    goalsAndObjectives: gAndOs,
    objectivesWithoutGoals: oWoG,
  };
}

export async function setStatus(report, status) {
  await report.update({ submissionStatus: status });
  return activityReportAndRecipientsById(report.id);
}

export async function handleSoftDeleteReport(report) {
  const goalsToCleanup = (await Goal.findAll({
    attributes: ['id'],
    where: {
      createdVia: 'activityReport',
      id: {
        [Op.in]: sequelize.literal(`(SELECT "goalId" FROM "ActivityReportGoals" args WHERE args."activityReportId" = ${report.id})`),
      },
    },
    include: [{
      model: ActivityReportGoal,
      as: 'activityReportGoals',
      attributes: ['id', 'goalId'],
    }],
  })).filter((goal) => goal.activityReportGoals.length === 1).map((goal) => goal.id);

  if (goalsToCleanup.length) {
    // these goals and objectives will also be soft-deleted
    await Objective.destroy({
      where: {
        goalId: goalsToCleanup,
      },
    });

    await Goal.destroy({
      where: {
        id: goalsToCleanup,
      },
    });
  }
  return setStatus(report, REPORT_STATUSES.DELETED);
}

/*
 * Queries the db for relevant recipients depending on the region id.
 * If no region id is passed, then default to returning all available recipients.
 * Note: This only affects grants and recipients. Non Recipients remain unaffected by the region id.
 *
 * @param {number} [regionId] - A region id to query against
 * @returns {*} Grants and Other entities
 */
export async function possibleRecipients(regionId, activityReportId = null) {
  const inactiveDayDuration = 365;
  const grants = await Recipient.findAll({
    attributes: [
      'id',
      'name',
    ],
    order: ['name'],
    include: [
      {
        model: Grant,
        as: 'grants',
        attributes: ['number', ['id', 'activityRecipientId'], 'name', 'status'],
        required: true,
        include: [
          {
            model: Program,
            as: 'programs',
            attributes: ['programType'],
            required: false,
          },
          {
            model: Recipient,
            as: 'recipient',
            required: true,
          },
          {
            model: ActivityRecipient,
            as: 'activityRecipients',
            attributes: [],
            required: false,
          },
          {
            model: GrantReplacements,
            as: 'replacedGrantReplacements',
            attributes: [],
            required: false,
          },
        ],
      },
    ],
    where: {
      '$grants.regionId$': regionId,
      [Op.or]: [
        { '$grants.status$': 'Active' },
        { ...(activityReportId ? { '$grants.activityRecipients.activityReportId$': activityReportId } : {}) },
        {
          '$grants.inactivationDate$': {
            [Op.gte]: sequelize.literal(`
          CASE
            WHEN ${activityReportId ? 'true' : 'false'}
            THEN (SELECT COALESCE("startDate", NOW() - INTERVAL '${inactiveDayDuration} days') FROM "ActivityReports" WHERE "id" = ${activityReportId})
            ELSE date_trunc('day', NOW()) - interval '${inactiveDayDuration} days'
          END
            `),
          },
        },
      ],
    },
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
      include: ['displayId', 'createdAt', 'approvedAt', 'creatorRole', 'language', 'creatorName', 'submittedDate'],
      exclude: ['imported', 'legacyId', 'additionalNotes', 'approvers'],
    },
    include: [
      {
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        attributes: ['ttaProvided', 'status', 'supportType'],
        order: [['objective', 'goal', 'id'], ['objective', 'id']],
        separate,
        include: [{
          model: Objective,
          as: 'objective',
          include: [{
            model: Goal,
            as: 'goal',
            required: false,
            include: [{
              model: GoalFieldResponse,
              as: 'responses',
              attributes: ['response'],
            }, {
              model: GoalTemplate,
              as: 'goalTemplate',
              attributes: ['creationMethod'],
            }],
          },
          ],
          attributes: ['id', 'title', 'status'],
        },
        {
          model: Resource,
          as: 'resources',
          attributes: ['id', 'url'],
        },
        {
          model: Topic,
          as: 'topics',
        },
        {
          model: File,
          as: 'files',
        },
        {
          model: Course,
          as: 'courses',
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
            include: [
              {
                model: Program,
                as: 'programs',
                attributes: ['programType'],
              },
              {
                model: Recipient,
                as: 'recipient',
                attributes: ['name'],
              },
            ],
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
        model: User,
        attributes: ['name', 'fullName', 'homeRegionId'],
        include: [
          {
            model: Role,
            as: 'roles',
          },
        ],
        as: 'author',
      },
      {
        model: ActivityReportCollaborator,
        as: 'activityReportCollaborators',
        separate,
        include: [{
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
        {
          model: Role,
          as: 'roles',
        }],
      },
      {
        model: NextStep,
        attributes: ['note', 'id', 'completeDate'],
        as: 'specialistNextSteps',
        separate,
        required: false,
      },
      {
        model: NextStep,
        attributes: ['note', 'id', 'completeDate'],
        as: 'recipientNextSteps',
        separate,
        required: false,
      },
      {
        model: ActivityReportApprover,
        attributes: ['userId'],
        as: 'approvers',
        required: false,
        separate,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name'],
          },
        ],
      },
    ],
    subQuery: separate,
    order: [['id', 'DESC']],
  };

  // Get reports.
  return batchQuery(query, 2000);
}

export async function getAllDownloadableActivityReports(
  readRegions,
  filters,
  userId = 0,
  reportIds = [],
) {
  const toNumberArray = (value) => [value]
    .flat()
    .filter((item) => item !== undefined && item !== null && `${item}`.length > 0)
    .map((item) => parseInt(item, DECIMAL_BASE))
    .filter((item) => Number.isInteger(item));

  const regions = toNumberArray(readRegions);
  const parsedReportIds = toNumberArray(reportIds);

  const { activityReport: scopes } = await filtersToScopes(filters, { userId });
  const where = {
    regionId: {
      [Op.in]: regions,
    },
    calculatedStatus: REPORT_STATUSES.APPROVED,
    [Op.and]: scopes,
  };

  if (parsedReportIds.length) {
    where.id = { [Op.in]: parsedReportIds };
  }

  return getDownloadableActivityReports(where);
}

export async function getAllDownloadableActivityReportAlerts(userId, filters) {
  const { activityReport: scopes } = await filtersToScopes(filters, { userId });
  const where = {
    [Op.and]: scopes,
    [Op.or]: [
      { // User is approver, and report is submitted or needs_action
        [Op.and]: [{
          [Op.or]: [
            { calculatedStatus: REPORT_STATUSES.SUBMITTED },
            { calculatedStatus: REPORT_STATUSES.NEEDS_ACTION },
          ],
          '$approvers.userId$': userId,
        }],
      },
      { // User is author or collaborator, and report is approved
        [Op.and]: [
          {
            [Op.and]: [
              {
                calculatedStatus: { [Op.ne]: REPORT_STATUSES.APPROVED },
              },
            ],
          },
          {
            [Op.or]: [{ userId }, { '$activityReportCollaborators.userId$': userId }],
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
export async function activityReportsWhereCollaboratorByDate(userId, date) {
  const reports = await ActivityReport.findAll({
    attributes: ['id', 'displayId'],
    where: {
      calculatedStatus: {
        [Op.ne]: REPORT_STATUSES.APPROVED,
      },
      id: {
        [Op.in]: sequelize.literal(
          `(SELECT (new_row_data->'activityReportId')::NUMERIC
        FROM "ZALActivityReportCollaborators"
        where dml_timestamp > ${date} AND
        (new_row_data->'userId')::NUMERIC = ${userId})`,
        ),
      },
    },
    include: [
      {
        model: ActivityReportCollaborator,
        as: 'activityReportCollaborators',
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
          calculatedStatus: {
            [Op.ne]: REPORT_STATUSES.APPROVED,
          },
        },
        {
          [Op.or]: [{ userId }, { '$activityReportCollaborators.userId$': userId }],
        },
        {
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT data_id
          FROM "ZALActivityReports"
          where dml_timestamp > ${date} AND
          (new_row_data->>'calculatedStatus')::TEXT = '${REPORT_STATUSES.NEEDS_ACTION}')`,
            ),
          },
        },
      ],
    },
    include: [
      {
        model: ActivityReportCollaborator,
        as: 'activityReportCollaborators',
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
      [Op.and]: [
        { calculatedStatus: { [Op.ne]: REPORT_STATUSES.APPROVED } },
        { calculatedStatus: { [Op.ne]: REPORT_STATUSES.DRAFT } },
        {
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT data_id
          FROM "ZALActivityReports"
          where dml_timestamp > ${date} AND
          (new_row_data->>'calculatedStatus')::TEXT = '${REPORT_STATUSES.SUBMITTED}')`,
            ),
          },
        },
      ],
    },
    include: [
      {
        model: ActivityReportApprover,
        as: 'approvers',
        where: { userId },
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
          calculatedStatus: REPORT_STATUSES.APPROVED,
        },
        userId && {
          [Op.or]: [{ userId }, { '$activityReportCollaborators.userId$': userId }],
        },
        {
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT data_id
          FROM "ZALActivityReports"
          where dml_timestamp > ${date} AND
          (new_row_data->>'calculatedStatus')::TEXT = '${REPORT_STATUSES.APPROVED}')`,
            ),
          },
        },
      ].filter(Boolean),
    },
    include: [
      {
        model: ActivityReportCollaborator,
        as: 'activityReportCollaborators',
        attributes: ['userId'],
        required: false,
      },
    ],
  });
  return reports;
}
