import { Op } from 'sequelize';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import db, { sequelize } from '../models';
import { CREATION_METHOD } from '../constants';
import { IScopes } from './types';

// eslint-disable-next-line max-len
export default async function trStandardGoalList(scopes: IScopes): Promise<{ name: string; count: number }[]> {
  const events = await db.EventReportPilot.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [
        scopes.trainingReport,
        {
          data: {
            status: TRAINING_REPORT_STATUSES.COMPLETE,
            startDate: {
              [Op.gte]: new Date('2025-09-01'),
            },
          },
        },
      ],
    },
  });

  if (events.length === 0) {
    return [];
  }

  return (await db.GoalTemplate.findAll({
    attributes: [
      ['standard', 'name'],
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sessionReports.eventId'))), 'count'],
    ],
    where: {
      creationMethod: CREATION_METHOD.CURATED,
      standard: {
        [Op.not]: 'Monitoring',
      },
    },
    include: [
      {
        through: {
          attributes: [],
        },
        model: db.SessionReportPilot,
        as: 'sessionReports',
        attributes: [],
        required: true,
        where: {
          data: {
            status: TRAINING_REPORT_STATUSES.COMPLETE,
          },
          eventId: events.map(({ id }) => id),
        },
      },
    ],
    group: [
      'GoalTemplate.id',
      'GoalTemplate.standard',
      'sessionReports->SessionReportPilotGoalTemplate.id',
    ],
    order: [
      [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sessionReports.eventId'))), 'DESC'],
      ['standard', 'ASC'],
    ],
  })).map((gt: {
    toJSON: () => ({ name: string, count: number })
  }) => gt.toJSON());
}
