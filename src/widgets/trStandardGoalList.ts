import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import { CREATION_METHOD } from '../constants';
import db, { sequelize } from '../models';
import type { IScopes } from './types';

export default async function trStandardGoalList(
  scopes: IScopes
): Promise<{ name: string; count: number }[]> {
  const events = await db.EventReportPilot.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [
        scopes.trainingReport,
        sequelize.literal(
          `TO_DATE("EventReportPilot"."data"->>'startDate', 'MM/DD/YYYY') >= '2025-09-01'::date`
        ),
      ],
    },
  });

  if (events.length === 0) {
    return [];
  }

  return db.GoalTemplate.findAll({
    attributes: [
      ['standard', 'name'],
      [
        sequelize.cast(
          sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sessionReports.eventId'))),
          'INTEGER'
        ),
        'count',
      ],
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
    group: ['GoalTemplate.standard'],
    order: [
      [
        sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('sessionReports.eventId'))),
        'DESC',
      ],
      ['standard', 'ASC'],
    ],
    raw: true,
  });
}
