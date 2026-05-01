import { Op } from 'sequelize';
import db from '../../models';

const { sequelize } = db;

export function beforeStartDate(dates: string[]) {
  return {
    [Op.and]: [
      sequelize.literal(`
        "CollabReport"."createdAt" <= ${sequelize.escape(dates[0])}::timestamp with time zone
      `),
    ],
  };
}

export function afterStartDate(dates: string[]) {
  return {
    [Op.and]: [
      sequelize.literal(`
        "CollabReport"."createdAt" >= ${sequelize.escape(dates[0])}::timestamp with time zone
      `),
    ],
  };
}

export function withinStartDate(dates: string[]) {
  const splitDates = dates[0].split('-');
  if (splitDates.length !== 2) {
    return {};
  }

  const startDate = splitDates[0];
  const endDate = splitDates[1];

  return {
    [Op.and]: [
      sequelize.literal(`
        "CollabReport"."createdAt" BETWEEN ${sequelize.escape(startDate)}::timestamp with time zone
        AND ${sequelize.escape(endDate)}::timestamp with time zone
      `),
    ],
  };
}
