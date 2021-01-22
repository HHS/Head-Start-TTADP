import _ from 'lodash';
import { Op } from 'sequelize';

import {
  ActivityReport,
  ActivityReportCollaborator,
  sequelize,
  ActivityRecipient,
  Grant,
  Grantee,
  NonGrantee,
  User,
} from '../models';

async function saveReportCollaborators(activityReportId, collaborators, transaction) {
  await ActivityReportCollaborator.destroy({
    where: {
      activityReportId: {
        [Op.eq]: activityReportId,
      },
    },
    transaction,
  });

  await Promise.all(collaborators.map(async (collaborator) => ActivityReportCollaborator.create({
    activityReportId,
    userId: collaborator,
  },
  {
    transaction,
  })));
}

async function saveReportRecipients(
  activityReportId,
  activityRecipientIds,
  activityRecipientType,
  transaction,
) {
  await ActivityRecipient.destroy({
    where: {
      activityReportId: {
        [Op.eq]: activityReportId,
      },
    },
    transaction,
  });

  await Promise.all(activityRecipientIds.map(async (activityRecipientId) => {
    const activityRecipient = {
      activityReportId,
    };

    if (activityRecipientType === 'grantee') {
      activityRecipient.grantId = activityRecipientId;
    } else if (activityRecipientType === 'non-grantee') {
      activityRecipient.nonGranteeId = activityRecipientId;
    }

    return ActivityRecipient.create(activityRecipient, { transaction });
  }));
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
        attributes: ['id', 'name'],
        as: 'collaborators',
      },
    ],
  });
}

export async function createOrUpdate(newActivityReport, report) {
  let savedReport;
  const { collaborators, activityRecipients, ...updatedFields } = newActivityReport;
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
