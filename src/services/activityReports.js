import _ from 'lodash';
import { Op } from 'sequelize';
import moment from 'moment';
import { REPORT_STATUSES, DECIMAL_BASE, REPORTS_PER_PAGE } from '../constants';
import orderReportsBy from '../lib/orderReportsBy';
import filtersToScopes from '../scopes';
import { setReadRegions } from './accessValidation';
import { syncApprovers } from './activityReportApprovers';

import {
  ActivityReport,
  ActivityReportApprover,
  ActivityReportCollaborator,
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
} from '../models';

import { saveGoalsForReport } from './goals';

import { saveObjectivesForReport } from './objectives';

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
    await ActivityReportCollaborator.destroy(
      {
        where: {
          activityReportId,
          userId: {
            [Op.notIn]: collaborators,
          },
        },
      },
      {
        transaction,
      },
    );
  } else {
    await ActivityReportCollaborator.destroy(
      {
        where: {
          activityReportId,
        },
      },
      {
        transaction,
      },
    );
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

  await ActivityRecipient.bulkCreate(newRecipients, { transaction, ignoreDuplicates: true });
  await ActivityRecipient.destroy({ where }, { transaction });
}

async function saveNotes(activityReportId, notes, isRecipientNotes, transaction) {
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

export function activityReportByLegacyId(legacyId) {
  return ActivityReport.findOne({
    where: {
      legacyId,
    },
    include: [
      {
        model: File,
        where: {
          status: {
            [Op.ne]: 'UPLOAD_FAILED',
          },
        },
        as: 'attachments',
        required: false,
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
            attributes: ['id', 'name', 'role', 'fullName'],
          },
        ],
      },
    ],
  });
}

export function activityReportById(activityReportId) {
  return ActivityReport.findOne({
    attributes: { exclude: ['imported', 'legacyId'] },
    where: {
      id: {
        [Op.eq]: activityReportId,
      },
    },
    include: [
      {
        model: ActivityRecipient,
        attributes: ['id', 'name', 'activityRecipientId', 'grantId', 'otherEntityId'],
        as: 'activityRecipients',
        required: false,
        separate: true,
        include: [
          {
            model: Grant,
            attributes: ['id', 'number'],
            as: 'grant',
            required: false,
            include:
            [
              {
                model: Recipient,
                as: 'recipient',
                attributes: ['name'],
              },
              {
                model: Program,
                as: 'programs',
                attributes: ['programType'],
              },
            ],
          },
          {
            model: OtherEntity,
            as: 'otherEntity',
            required: false,
          },
        ],
      },
      {
        model: Objective,
        as: 'objectivesWithGoals',
        include: [{
          model: Goal,
          as: 'goal',
        }],
      },
      {
        model: Objective,
        as: 'objectivesWithoutGoals',
      },
      {
        model: User,
        as: 'author',
      },
      {
        model: User,
        as: 'collaborators',
        required: false,
      },
      {
        model: File,
        where: {
          status: {
            [Op.ne]: 'UPLOAD_FAILED',
          },
        },
        as: 'attachments',
        required: false,
        separate: true,
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
        separate: true,
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
            attributes: ['id', 'name', 'role', 'fullName'],
          },
        ],
      },
    ],
    order: [
      [{ model: Objective, as: 'objectivesWithGoals' }, 'id', 'ASC'],
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
export function activityReports(
  {
    sortBy = 'updatedAt', sortDir = 'desc', offset = 0, limit = REPORTS_PER_PAGE, ...filters
  },
  excludeLegacy = false,
) {
  const { activityReport: scopes } = filtersToScopes(filters);

  const endDte = moment().format('MM/DD/yyyy');

  const where = {
    calculatedStatus: REPORT_STATUSES.APPROVED,
    [Op.and]: scopes,
    startDate: { [Op.gte]: '2020-08-31', [Op.lte]: endDte },
  };

  if (excludeLegacy) {
    where.legacyId = { [Op.eq]: null };
  }

  return ActivityReport.findAndCountAll(
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
          model: ActivityRecipient,
          attributes: ['id', 'name', 'activityRecipientId', 'grantId', 'otherEntityId'],
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
                  model: Recipient,
                  as: 'recipient',
                  attributes: ['name'],
                },
              ],
            },
            {
              model: OtherEntity,
              as: 'otherEntity',
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
        {
          model: ActivityReportApprover,
          attributes: ['id', 'status', 'note'],
          as: 'approvers',
          required: false,
          include: [
            {
              model: User,
              attributes: ['id', 'name', 'role', 'fullName'],
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
  sortBy = 'startDate', sortDir = 'desc', offset = 0, ...filters
}) {
  const updatedFilters = await setReadRegions(filters, userId);
  const { activityReport: scopes } = filtersToScopes(updatedFilters);
  return ActivityReport.findAndCountAll(
    {
      where: {
        [Op.and]: scopes,
        [Op.or]: [
          {
            [Op.or]: [
              { calculatedStatus: REPORT_STATUSES.SUBMITTED },
              { calculatedStatus: REPORT_STATUSES.NEEDS_ACTION },
            ],
            '$approvers.userId$': userId,
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
                [Op.or]: [{ userId }, { '$collaborators.id$': userId }],
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
        // eslint-disable-next-line quotes
        [sequelize.literal(`(SELECT  CASE WHEN COUNT(1) = 0 THEN '0' ELSE  CONCAT(SUM(CASE WHEN COALESCE("ActivityReportApprovers".status,'needs_action') = 'approved' THEN 1 ELSE 0 END), ' of ', COUNT(1)) END FROM "ActivityReportApprovers" WHERE "ActivityReportApprovers"."activityReportId" = "ActivityReport"."id" AND "deletedAt" IS NULL limit 1)`), 'pendingApprovals'],
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
                  model: Recipient,
                  as: 'recipient',
                  attributes: ['name'],
                },
              ],
            },
            {
              model: OtherEntity,
              as: 'otherEntity',
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
          duplicating: true,
          through: { attributes: [] },
        },
        {
          model: ActivityReportApprover,
          attributes: ['id', 'status', 'note'],
          as: 'approvers',
          required: false,
          include: [
            {
              model: User,
              attributes: ['id', 'name', 'role', 'fullName'],
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
}

export async function createOrUpdate(newActivityReport, report) {
  let savedReport;
  const {
    approvers,
    approverUserIds,
    goals,
    objectivesWithGoals,
    objectivesWithoutGoals,
    collaborators,
    activityRecipients,
    attachments,
    author,
    recipientNextSteps,
    specialistNextSteps,
    ECLKCResourcesUsed,
    nonECLKCResourcesUsed,
    ...allFields
  } = newActivityReport;

  const resources = {};

  if (ECLKCResourcesUsed) {
    resources.ECLKCResourcesUsed = ECLKCResourcesUsed.map((item) => item.value);
  }

  if (nonECLKCResourcesUsed) {
    resources.nonECLKCResourcesUsed = nonECLKCResourcesUsed.map((item) => item.value);
  }

  const updatedFields = { ...allFields, ...resources };
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
    if (recipientNextSteps) {
      const { id } = savedReport;
      await saveNotes(id, recipientNextSteps, true, transaction);
    }
    if (specialistNextSteps) {
      const { id } = savedReport;
      await saveNotes(id, specialistNextSteps, false, transaction);
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

    if (activityRecipientType === 'other-entity' && objectivesWithoutGoals) {
      await saveObjectivesForReport(objectivesWithoutGoals, savedReport, transaction);
    } else if (activityRecipientType === 'recipient' && goals) {
      await saveGoalsForReport(goals, savedReport, transaction);
    }

    // Approvers are removed if approverUserIds is an empty array
    if (approverUserIds) {
      await syncApprovers(savedReport.id, approverUserIds, transaction);
    }
  });

  return activityReportById(savedReport.id);
}

export async function setStatus(report, status) {
  return report.update({ submissionStatus: status });
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
  let where = { status: 'Active' };
  if (regionId) {
    where = { ...where, regionId };
  }

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

async function getDownloadableActivityReports(where) {
  return ActivityReport.findAndCountAll(
    {
      where,
      attributes: {
        include: ['displayId', 'createdAt', 'approvedAt'],
        exclude: ['imported', 'legacyId', 'oldManagerNotes', 'additionalNotes', 'approvers'],
      },
      include: [
        {
          model: Objective,
          as: 'objectives',
          include: [{
            model: Goal,
            as: 'goal',
          }],
          attributes: ['title', 'status', 'ttaProvided'],
        },
        {
          model: ActivityRecipient,
          attributes: ['id', 'name', 'activityRecipientId', 'grantId', 'otherEntityId'],
          as: 'activityRecipients',
          required: false,
          include: [
            {
              model: Grant,
              attributes: ['id', 'number', 'programSpecialistName'],
              as: 'grant',
              required: false,
              include: [
                {
                  model: Recipient,
                  as: 'recipient',
                  attributes: ['name'],
                },
                {
                  model: Program,
                  as: 'programs',
                  attributes: ['programType'],
                },
              ],
            },
            {
              model: OtherEntity,
              as: 'otherEntity',
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
          as: 'attachments',
          required: false,
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
              [Op.eq]: 'RECIPIENT',
            },
          },
          attributes: ['note', 'id'],
          as: 'recipientNextSteps',
          required: false,
        },
        {
          model: ActivityReportApprover,
          attributes: ['userId'],
          as: 'approvers',
          required: false,
          include: [
            {
              model: User,
              attributes: ['name'],
            },
          ],
        },
      ],
      distinct: true,
      order: [['id', 'DESC']],
    },
  );
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
    calculatedStatus: REPORT_STATUSES.APPROVED,
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
        [Op.or]: [
          { submissionStatus: REPORT_STATUSES.SUBMITTED },
          { calculatedStatus: REPORT_STATUSES.NEEDS_ACTION },
        ],
        '$approvers.userId$': userId,
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
            [Op.or]: [{ userId }, { '$collaborators.id$': userId }],
          },
        ],
      },
    ],
    legacyId: null,
  };

  return getDownloadableActivityReports(where);
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
