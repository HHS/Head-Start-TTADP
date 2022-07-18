import _ from 'lodash';
import { Op } from 'sequelize';
import { REPORT_STATUSES, DECIMAL_BASE, REPORTS_PER_PAGE } from '../constants';
import orderReportsBy from '../lib/orderReportsBy';
import filtersToScopes from '../scopes';
import { setReadRegions } from './accessValidation';
import { syncApprovers } from './activityReportApprovers';
// import { auditLogger } from '../logger';

import {
  ActivityReport,
  ActivityReportApprover,
  ActivityReportCollaborator,
  ActivityReportFile,
  sequelize,
  ActivityRecipient,
  File,
  Grant,
  Recipient,
  OtherEntity,
  Goal,
  User,
  Role,
  NextStep,
  Objective,
  Program,
  ActivityReportObjective,
  ObjectiveResource,
  Topic,
  CollaboratorRole,
} from '../models';

import { removeUnusedGoalsObjectivesFromReport, saveGoalsForReport, removeRemovedRecipientsGoals } from './goals';

import { saveObjectivesForReport } from './objectives';

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

  // Get updated collaborator roles.
  const updatedReportCollaborators = await ActivityReportCollaborator.findAll({
    where: { activityReportId },
    include: [
      {
        model: User,
        as: 'user',
      },
      {
        model: CollaboratorRole,
        as: 'collaboratorRoles',
      },
    ],
  });

  // Get collaborator roles to add.
  const rolesToAdd = updatedReportCollaborators.filter(
    (c) => !c.collaboratorRoles.length
      && c.user.role.length,
  );

  // If we have collaborators missing roles.
  if (rolesToAdd && rolesToAdd.length > 0) {
    let updatedRoles = [];
    rolesToAdd.forEach((collaborator) => {
    // Set collaborator roles.
      const { role } = collaborator.user;
      // Concat list of collaborator role updates promises.
      updatedRoles = updatedRoles.concat(role.map((r) => CollaboratorRole.findOrCreate(
        { where: { activityReportCollaboratorId: collaborator.id, role: r } },
      )));
    });

    // Resolve all role update promises.
    if (updatedRoles && updatedRoles.length > 0) {
      await Promise.all(updatedRoles);
    }
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
  await NextStep.destroy({ where });

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
            attributes: ['id', 'name', 'role', 'fullName'],
          },
        ],
      },
    ],
  });
}

export async function activityReportAndRecipientsById(activityReportId) {
  const arId = parseInt(activityReportId, DECIMAL_BASE);

  // goals
  const allGoalsAndObjectives = await Goal.findAll({
    include: [
      {
        attributes: ['id'],
        model: ActivityReport,
        as: 'activityReports',
        where: {
          id: arId,
        },
        required: true,
      },
      {
        model: Objective,
        as: 'objectives',
        required: false,
        include: [
          {
            model: Role,
            as: 'roles',
          },
          {
            attributes: ['ttaProvided', 'activityReportId'],
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            where: {
              activityReportId: arId,
            },
            required: true,
          },
          {
            attributes: [
              ['id', 'value'],
              ['name', 'label'],
            ],
            model: Topic,
            as: 'topics',
            required: false,
          },
          {
            attributes: [
              ['userProvidedUrl', 'value'],
            ],
            model: ObjectiveResource,
            as: 'resources',
            required: false,
          },
        ],
      },
    ],
  });

  // TODO - explore a way to move this query inline to the ActivityReport.findOne
  const goalsAndObjectives = allGoalsAndObjectives.reduce((previousValue, currentValue) => {
    const existingGoal = previousValue.find((g) => g.name === currentValue.name);

    if (existingGoal) {
      existingGoal.goalNumbers = [...existingGoal.goalNumbers, currentValue.goalNumber];
      existingGoal.goalIds = [...existingGoal.goalIds, currentValue.id];
      return previousValue;
    }

    const goal = {
      ...currentValue.dataValues,
      goalNumbers: [currentValue.goalNumber],
      goalIds: [currentValue.id],
      objectives: currentValue.objectives.map((objective) => {
        const ttaProvided = objective.activityReportObjectives
          && objective.activityReportObjectives[0]
          ? objective.activityReportObjectives[0].ttaProvided : '';

        return {
          ...objective.dataValues,
          ttaProvided,
        };
      }),
    };

    return [...previousValue, goal];
  }, []);

  const recipients = await ActivityRecipient.findAll({
    where: {
      activityReportId: arId,
    },
    attributes: [
      'id',
      'name',
      'activityRecipientId',
    ],
  });

  const activityRecipients = recipients.map((recipient) => {
    const name = recipient.otherEntity ? recipient.otherEntity.name : recipient.grant.name;
    const activityRecipientId = recipient.otherEntity
      ? recipient.otherEntity.dataValues.id : recipient.grant.dataValues.id;

    return {
      id: activityRecipientId,
      name,
    };
  });

  const report = await ActivityReport.findOne({
    attributes: { exclude: ['imported', 'legacyId'] },
    where: {
      id: arId,
    },
    include: [
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
      },
      {
        model: User,
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
          },
          {
            model: CollaboratorRole,
            as: 'collaboratorRoles',
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
    calculatedStatus: REPORT_STATUSES.APPROVED,
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
          attributes: ['name', 'role', 'fullName', 'homeRegionId'],
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
              attributes: ['id', 'name', 'role', 'fullName'],
            },
            {
              model: CollaboratorRole,
              as: 'collaboratorRoles',
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

  const reportIds = reports.rows.map(({ id }) => id);

  const recipients = await ActivityRecipient.findAll({
    where: {
      activityReportId: reportIds,
    },
    attributes: ['id', 'name', 'activityRecipientId', 'activityReportId'],
    // sorting these just so the order is testable
    order: [
      [
        sequelize.literal(`"grant.recipient.name" ${sortDir}`),
      ],
      [
        sequelize.literal(`"otherEntity.name" ${sortDir}`),
      ],
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
      ['name', sortDir],
    ],
  });

  return { ...reports, recipients, topics };
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
  const { activityReport: scopes } = filtersToScopes(updatedFilters);
  const reports = await ActivityReport.findAndCountAll(
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
                [Op.or]: [{ userId }, { '$activityReportCollaborators->user.id$': userId }],
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

        // eslint-disable-next-line quotes
        [sequelize.literal(`(SELECT  CASE WHEN COUNT(1) = 0 THEN '0' ELSE  CONCAT(SUM(CASE WHEN COALESCE("ActivityReportApprovers".status,'needs_action') = 'approved' THEN 1 ELSE 0 END), ' of ', COUNT(1)) END FROM "ActivityReportApprovers" WHERE "ActivityReportApprovers"."activityReportId" = "ActivityReport"."id" AND "deletedAt" IS NULL limit 1)`), 'pendingApprovals'],
      ],
      include: [
        {
          model: User,
          attributes: ['name', 'role', 'fullName', 'homeRegionId'],
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
              attributes: ['id', 'name', 'role', 'fullName'],
              duplicating: true,
            },
            {
              model: CollaboratorRole,
              as: 'collaboratorRoles',
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

  const recipients = await ActivityRecipient.findAll({
    where: {
      activityReportId: reports.rows.map(({ id }) => id),
    },
    attributes: ['id', 'name', 'activityRecipientId', 'activityReportId'],
  });

  return { ...reports, recipients };
}

export async function createOrUpdate(newActivityReport, report) {
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
  const previousActivityRecipientType = report && report.activityRecipientType;
  const resources = {};

  if (ECLKCResourcesUsed) {
    resources.ECLKCResourcesUsed = ECLKCResourcesUsed.filter((item) => item)
      .map((item) => item.value);
  }

  if (nonECLKCResourcesUsed) {
    resources.nonECLKCResourcesUsed = nonECLKCResourcesUsed.filter((item) => item)
      .map((item) => item.value);
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
    await removeRemovedRecipientsGoals(recipientsWhoHaveGoalsThatShouldBeRemoved, savedReport);
  }

  if (previousActivityRecipientType
    && previousActivityRecipientType !== report.activityRecipientType) {
    await removeUnusedGoalsObjectivesFromReport(report.id, []);
  }

  if (activityRecipientType === 'other-entity' && objectivesWithoutGoals) {
    await saveObjectivesForReport(objectivesWithoutGoals, savedReport);
  } else if (activityRecipientType === 'recipient' && goals) {
    await saveGoalsForReport(goals, savedReport, recipientsWhoHaveGoalsThatShouldBeRemoved);
  }

  // Approvers are removed if approverUserIds is an empty array
  if (approverUserIds) {
    await syncApprovers(savedReport.id, approverUserIds);
  }

  const [r, recips, gAndOs] = await activityReportAndRecipientsById(savedReport.id);
  return {
    ...r.dataValues,
    displayId: r.displayId,
    activityRecipients: recips,
    goalsAndObjectives: gAndOs,
  };
}

export async function setStatus(report, status) {
  await report.update({ submissionStatus: status });
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
        separate,
        include: [{
          model: Objective,
          as: 'objective',
          include: [{
            model: Goal,
            as: 'goal',
          }],
          attributes: ['id', 'title', 'status'],
        }],
        attributes: ['ttaProvided'],
        order: [['objective', 'goal', 'id'], ['objective', 'id']],
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
            attributes: ['id', 'number', 'programSpecialistName', 'recipientInfo', 'programTypes'],
            as: 'grant',
            include: [
              {
                model: Recipient,
                as: 'recipient',
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
        attributes: ['name', 'role', 'fullName', 'homeRegionId'],
        as: 'author',
      },
      {
        model: ActivityReportCollaborator,
        as: 'activityReportCollaborators',
        separate,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'role', 'fullName'],
        },
        {
          model: CollaboratorRole,
          as: 'collaboratorRoles',
        }],
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
        model: ActivityReportApprover,
        attributes: ['userId'],
        as: 'approvers',
        required: false,
        separate,
        include: [
          {
            model: User,
            attributes: ['name'],
          },
        ],
      },
    ],
    subQuery: separate,
    order: [['id', 'DESC']],
  };

  return batchQuery(query, 2000);
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
