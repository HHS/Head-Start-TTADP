import _ from 'lodash';
import { Op } from 'sequelize';
import { REPORT_STATUSES, DECIMAL_BASE } from '../constants';

import {
  ActivityReport,
  ActivityReportCollaborator,
  sequelize,
  ActivityRecipient,
  File,
  Grant,
  Grantee,
  NonGrantee,
  Goal,
  User,
  NextStep,
} from '../models';

async function saveReportCollaborators(activityReportId, collaborators, transaction) {
  const newCollaborators = collaborators.map((collaborator) => ({
    activityReportId,
    userId: collaborator,
  }));

  if (newCollaborators.length > 0) {
    await ActivityReportCollaborator.bulkCreate(
      newCollaborators,
      { transaction, ignoreDuplicates: true },
    );
    await ActivityReportCollaborator.destroy({
      where: {
        activityReportId,
        userId: {
          [Op.notIn]: collaborators,
        },
      },
    },
    {
      transaction,
    });
  } else {
    await ActivityReportCollaborator.destroy({
      where: {
        activityReportId,
      },
    },
    {
      transaction,
    });
  }
}

async function saveReportRecipients(
  activityReportId,
  activityRecipientIds,
  activityRecipientType,
  transaction,
) {
  const newRecipients = activityRecipientIds.map((activityRecipientId) => {
    const activityRecipient = {
      activityReportId,
      grantId: null,
      nonGranteeId: null,
    };

    if (activityRecipientType === 'non-grantee') {
      activityRecipient.nonGranteeId = activityRecipientId;
    } else if (activityRecipientType === 'grantee') {
      activityRecipient.grantId = activityRecipientId;
    }
    return activityRecipient;
  });

  const where = {
    activityReportId,
  };

  const empty = activityRecipientIds.length === 0;
  if (!empty && activityRecipientType === 'non-grantee') {
    where[Op.or] = {
      nonGranteeId: {
        [Op.notIn]: activityRecipientIds,
      },
      grantId: {
        [Op.not]: null,
      },
    };
  } else if (!empty && activityRecipientType === 'grantee') {
    where[Op.or] = {
      grantId: {
        [Op.notIn]: activityRecipientIds,
      },
      nonGranteeId: {
        [Op.not]: null,
      },
    };
  }

  await ActivityRecipient.bulkCreate(newRecipients, { transaction, ignoreDuplicates: true });
  await ActivityRecipient.destroy({ where }, { transaction });
}

async function saveNotes(activityReportId, notes, isGranteeNotes, transaction) {
  const noteType = isGranteeNotes ? 'GRANTEE' : 'SPECIALIST';
  const ids = notes.map((n) => n.id).filter((id) => !!id);
  const where = {
    activityReportId,
    noteType,
    id: {
      [Op.notIn]: ids,
    },
  };
  // Remove any notes that are no longer relevant
  await NextStep.destroy({ where }, { transaction });

  if (notes.length > 0) {
    // If a note has an id, and its content has changed, update to the newer content
    // If no id, then assume its a new entry
    const newNotes = notes.map((note) => ({
      id: note.id ? parseInt(note.id, DECIMAL_BASE) : undefined,
      note: note.note,
      activityReportId,
      noteType,
    }));
    await NextStep.bulkCreate(newNotes, { transaction, updateOnDuplicate: ['note', 'updatedAt'] });
  }
}

async function update(newReport, report, transaction) {
  const updatedReport = await report.update(newReport, {
    transaction,
    fields: _.keys(newReport),
  });
  return updatedReport;
}

async function create(report, transaction) {
  return ActivityReport.create(report, { transaction });
}

export async function review(report, status, managerNotes) {
  const updatedReport = await report.update({
    status,
    managerNotes,
  },
  {
    fields: ['status', 'managerNotes'],
  });
  return updatedReport;
}

export function activityReportById(activityReportId) {
  return ActivityReport.findOne({
    where: {
      id: {
        [Op.eq]: activityReportId,
      },
    },
    include: [
      {
        model: ActivityRecipient,
        attributes: ['id', 'name', 'activityRecipientId'],
        as: 'activityRecipients',
        required: false,
        include: [
          {
            model: Grant,
            attributes: ['id', 'number'],
            as: 'grant',
            required: false,
            include: [{
              model: Grantee,
              as: 'grantee',
              attributes: ['name'],
            }],
          },
          {
            model: NonGrantee,
            as: 'nonGrantee',
            required: false,
          },
        ],
      },
      {
        model: User,
        as: 'author',
        attributes: ['name'],
      },
      {
        model: Goal,
        as: 'goals',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        attributes: ['id', 'name'],
        as: 'collaborators',
      },
      {
        model: File,
        where: {
          attachmentType: 'ATTACHMENT',
          status: {
            [Op.ne]: 'UPLOAD_FAILED',
          },
        },
        as: 'attachments',
        required: false,
      },
      {
        model: File,
        where: {
          attachmentType: 'RESOURCE',
          status: {
            [Op.ne]: 'UPLOAD_FAILED',
          },
        },
        as: 'otherResources',
        required: false,
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
        required: false,
      },
      {
        model: NextStep,
        where: {
          noteType: {
            [Op.eq]: 'GRANTEE',
          },
        },
        attributes: ['note', 'id'],
        as: 'granteeNextSteps',
        required: false,
      },
      {
        model: User,
        as: 'approvingManager',
        required: false,
      },
    ],
  });
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
export function activityReports(readRegions, {
  sortBy = 'updatedAt', sortDir = 'desc', offset = 0, limit = 10,
}) {
  let result = '';
  const regions = readRegions || [];
  const orderBy = () => {
    switch (sortBy) {
      case 'author':
        result = [[
          sequelize.literal(`authorName ${sortDir}`),
        ]];
        break;
      case 'collaborators':
        result = [[
          sequelize.literal(`collaboratorName ${sortDir} NULLS LAST`),
        ]];
        break;
      case 'topics':
        result = [[
          sequelize.literal(`topics ${sortDir}`),
        ]];
        break;
      case 'regionId':
        result = [[
          'regionId',
          sortDir,
        ],
        [
          'id',
          sortDir,
        ]];
        break;
      case 'activityRecipients':
        result = [
          [
            sequelize.literal(`granteeName ${sortDir}`),
          ],
          [
            sequelize.literal(`nonGranteeName ${sortDir}`),
          ]];
        break;
      case 'status':
      case 'startDate':
      case 'updatedAt':
        result = [[sortBy, sortDir]];
        break;
      default:
        break;
    }
    return result;
  };
  return ActivityReport.findAndCountAll(
    {
      where: { regionId: regions },
      attributes: [
        'id',
        'displayId',
        'startDate',
        'lastSaved',
        'topics',
        'status',
        'regionId',
        'updatedAt',
        'sortedTopics',
        sequelize.literal(
          '(SELECT name as authorName FROM "Users" WHERE "Users"."id" = "ActivityReport"."userId")',
        ),
        sequelize.literal(
          '(SELECT name as collaboratorName FROM "Users" join "ActivityReportCollaborators" on "Users"."id" = "ActivityReportCollaborators"."userId" and  "ActivityReportCollaborators"."activityReportId" = "ActivityReport"."id" limit 1)',
        ),
        sequelize.literal(
          // eslint-disable-next-line quotes
          `(SELECT "NonGrantees".name as nonGranteeName from "NonGrantees" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" AND "ActivityRecipients"."nonGranteeId" = "NonGrantees".id order by nonGranteeName ${sortDir} limit 1)`,
        ),
        sequelize.literal(
          // eslint-disable-next-line quotes
          `(SELECT "Grantees".name as granteeName FROM "Grantees" INNER JOIN "ActivityRecipients" ON "ActivityReport"."id" = "ActivityRecipients"."activityReportId" JOIN "Grants" ON "Grants"."id" = "ActivityRecipients"."grantId" AND "Grantees"."id" = "Grants"."granteeId" order by granteeName ${sortDir} limit 1)`,
        ),
      ],
      include: [
        {
          model: ActivityRecipient,
          attributes: ['id', 'name', 'activityRecipientId'],
          as: 'activityRecipients',
          required: false,
          include: [
            {
              model: Grant,
              attributes: ['id', 'number'],
              as: 'grant',
              required: false,
              include: [
                {
                  model: Grantee,
                  as: 'grantee',
                  attributes: ['name'],
                },
              ],
            },
            {
              model: NonGrantee,
              as: 'nonGrantee',
              required: false,
            },
          ],
        },
        {
          model: User,
          attributes: ['name', 'role', 'fullName', 'homeRegionId'],
          as: 'author',
        },
        {
          model: User,
          attributes: ['id', 'name', 'role', 'fullName'],
          as: 'collaborators',
          through: { attributes: [] },
        },
      ],
      order: orderBy(),
      offset,
      limit,
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
 * manager - approvingManagerId matches and report status is submitted.
 * specialist - author id or one of the collaborator's id matches and status is not approved nor
 * submitted.
 * @param {*} userId
 */
export function activityReportAlerts(userId) {
  return ActivityReport.findAll({
    where: {
      [Op.or]: [
        {
          [Op.or]: [
            { status: REPORT_STATUSES.SUBMITTED },
            { status: REPORT_STATUSES.NEEDS_ACTION },
          ],
          approvingManagerId: userId,
        },
        {
          [Op.and]: [
            {
              [Op.and]: [
                {
                  status: { [Op.ne]: REPORT_STATUSES.APPROVED },
                },
                {
                  status: { [Op.ne]: REPORT_STATUSES.SUBMITTED },
                },
              ],
            },
            {
              [Op.or]: [{ userId }, { '$collaborators.id$': userId }],
            },
          ],
        },
      ],
    },
    attributes: [
      'id',
      'displayId',
      'startDate',
      'status',
      'regionId',
      'userId',
      'approvingManagerId',
    ],
    include: [
      {
        model: ActivityRecipient,
        attributes: ['id', 'name', 'activityRecipientId'],
        as: 'activityRecipients',
        required: false,
        include: [
          {
            model: Grant,
            attributes: ['id', 'number'],
            as: 'grant',
            required: false,
            include: [
              {
                model: Grantee,
                as: 'grantee',
                attributes: ['name'],
              },
            ],
          },
          {
            model: NonGrantee,
            as: 'nonGrantee',
            required: false,
          },
        ],
      },
      {
        model: User,
        attributes: ['name', 'role', 'fullName', 'homeRegionId'],
        as: 'author',
      },
      {
        model: User,
        attributes: ['id', 'name', 'role', 'fullName'],
        as: 'collaborators',
        through: { attributes: [] },
      },
    ],
  });
}

export async function createOrUpdate(newActivityReport, report) {
  let savedReport;
  const {
    goals,
    collaborators,
    activityRecipients,
    attachments,
    otherResources,
    approvingManager,
    author,
    granteeNextSteps,
    specialistNextSteps,
    ...updatedFields
  } = newActivityReport;
  await sequelize.transaction(async (transaction) => {
    if (report) {
      savedReport = await update(updatedFields, report, transaction);
    } else {
      savedReport = await create(updatedFields, transaction);
    }

    if (collaborators) {
      const { id } = savedReport;
      const newCollaborators = collaborators.map(
        (g) => g.id,
      );
      await saveReportCollaborators(id, newCollaborators, transaction);
    }

    if (activityRecipients) {
      const { activityRecipientType, id } = savedReport;
      const activityRecipientIds = activityRecipients.map(
        (g) => g.activityRecipientId,
      );
      await saveReportRecipients(id, activityRecipientIds, activityRecipientType, transaction);
    }

    if (granteeNextSteps) {
      const { id } = savedReport;
      await saveNotes(id, granteeNextSteps, true, transaction);
    }

    if (specialistNextSteps) {
      const { id } = savedReport;
      await saveNotes(id, specialistNextSteps, false, transaction);
    }
  });
  return activityReportById(savedReport.id);
}

export async function setStatus(report, status) {
  const updatedReport = await report.update({ status }, {
    fields: ['status'],
  });
  return updatedReport;
}

/*
 * Queries the db for relevant recipients depending on the region id.
 * If no region id is passed, then default to returning all available recipients.
 * Note: This only affects grants and grantees. Non Grantees remain unaffected by the region id.
 *
 * @param {number} [regionId] - A region id to query against
 * @returns {*} Grants and Non grantees
 */
export async function possibleRecipients(regionId) {
  const where = regionId ? { regionId } : undefined;

  const grants = await Grantee.findAll({
    attributes: ['id', 'name'],
    include: [{
      where,
      model: Grant,
      as: 'grants',
      attributes: [['id', 'activityRecipientId'], 'name', 'number'],
      include: [{
        model: Grantee,
        as: 'grantee',
      }],
    }],
  });
  const nonGrantees = await NonGrantee.findAll({
    raw: true,
    attributes: [['id', 'activityRecipientId'], 'name'],
  });
  return { grants, nonGrantees };
}
