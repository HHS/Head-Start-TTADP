import _ from 'lodash';
import { Op } from 'sequelize';

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

  if (activityRecipientType === 'non-grantee') {
    where[Op.or] = {
      nonGranteeId: {
        [Op.notIn]: activityRecipientIds,
      },
      grantId: {
        [Op.not]: null,
      },
    };
  } else if (activityRecipientType === 'grantee') {
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
    ],
  });
}

export function activityReports() {
  return ActivityReport.findAll({
    attributes: ['id', 'startDate', 'lastSaved', 'topics', 'status', 'regionId'],
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
        attributes: ['name', 'role', 'fullName', 'homeRegionId'],
        as: 'author',
      },
      {
        model: User,
        attributes: ['name', 'role', 'fullName'],
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
  });
  return activityReportById(savedReport.id);
}

export async function possibleRecipients() {
  const grants = await Grantee.findAll({
    attributes: ['id', 'name'],
    include: [{
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
