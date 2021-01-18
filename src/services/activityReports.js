import _ from 'lodash';
import { Op } from 'sequelize';

import {
  ActivityReport,
  sequelize,
  ActivityRecipient,
  Grant,
  Grantee,
  NonGrantee,
} from '../models';

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

async function update(newReport, activityReportId, transaction) {
  const result = await ActivityReport.update(newReport, {
    where: {
      id: {
        [Op.eq]: activityReportId,
      },
    },
    returning: true,
    plain: true,
    transaction,
    fields: _.keys(newReport),
  });
  return result[1];
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
    ],
  });
}

export async function createOrUpdate(newActivityReport, activityReportId) {
  let savedReport;
  await sequelize.transaction(async (transaction) => {
    if (activityReportId) {
      savedReport = await update(newActivityReport, activityReportId, transaction);
    } else {
      savedReport = await create(newActivityReport, transaction);
    }

    if (newActivityReport.activityRecipients) {
      const { activityRecipientType, id } = savedReport;
      const activityRecipientIds = newActivityReport.activityRecipients.map(
        (g) => g.activityRecipientId,
      );
      await saveReportRecipients(id, activityRecipientIds, activityRecipientType, transaction);
    }
  });
  return activityReportById(savedReport.id);
}

export async function activityRecipients() {
  const rawGrants = await Grant.findAll({
    attributes: ['id', 'name', 'number'],
    include: [{
      model: Grantee,
      as: 'grantee',
    }],
  });

  const grants = rawGrants.map((g) => ({
    activityRecipientId: g.id,
    name: g.name,
  }));

  const nonGrantees = await NonGrantee.findAll({
    raw: true,
    attributes: [['id', 'activityRecipientId'], 'name'],
  });
  return { grants, nonGrantees };
}

export async function reportExists(activityReportId) {
  const report = await ActivityReport.findOne({ where: { id: activityReportId } });
  return !_.isNull(report);
}
