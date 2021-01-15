import _ from 'lodash';
import { Op } from 'sequelize';

import {
  ActivityReport,
  sequelize,
  ActivityParticipant,
  Grant,
  Grantee,
  NonGrantee,
} from '../models';

async function saveReportParticipants(
  activityReportId,
  participantIds,
  participantType,
  transaction,
) {
  await ActivityParticipant.destroy({
    where: {
      activityReportId: {
        [Op.eq]: activityReportId,
      },
    },
    transaction,
  });

  await Promise.all(participantIds.map(async (participantId) => {
    const activityParticipant = {
      activityReportId,
    };

    if (participantType === 'grantee') {
      activityParticipant.grantId = participantId;
    } else if (participantType === 'non-grantee') {
      activityParticipant.nonGranteeId = participantId;
    }

    return ActivityParticipant.create(activityParticipant, { transaction });
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
        model: ActivityParticipant,
        attributes: ['id', 'name', 'participantId'],
        as: 'activityParticipants',
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

    if (newActivityReport.activityParticipants) {
      const { participantType, id } = savedReport;
      const participantIds = newActivityReport.activityParticipants.map((g) => g.participantId);
      await saveReportParticipants(id, participantIds, participantType, transaction);
    }
  });
  return activityReportById(savedReport.id);
}

export async function reportParticipants() {
  const rawGrants = await Grant.findAll({
    attributes: ['id', 'name', 'number'],
    include: [{
      model: Grantee,
      as: 'grantee',
    }],
  });

  const grants = rawGrants.map((g) => ({
    participantId: g.id,
    name: g.name,
  }));

  const nonGrantees = await NonGrantee.findAll({
    raw: true,
    attributes: [['id', 'participantId'], 'name'],
  });
  return { grants, nonGrantees };
}

export async function reportExists(activityReportId) {
  const report = await ActivityReport.findOne({ where: { id: activityReportId } });
  return !_.isNull(report);
}
