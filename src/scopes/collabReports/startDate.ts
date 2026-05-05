import { Op } from 'sequelize';
import db from '../../models';

const { sequelize } = db;

function normalizeValidDates(dates: string[]) {
  return dates
    .filter((date): date is string => typeof date === 'string' && date.trim().length > 0)
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .map((date) => date.toISOString());
}

export function beforeStartDate(dates: string[]) {
  const validDates = normalizeValidDates(dates);
  if (validDates.length === 0) {
    return {};
  }

  return {
    [Op.and]: validDates.map((date) =>
      sequelize.literal(`
        "CollabReport"."createdAt" <= ${sequelize.escape(date)}::timestamp with time zone
      `)
    ),
  };
}

export function afterStartDate(dates: string[]) {
  const validDates = normalizeValidDates(dates);
  if (validDates.length === 0) {
    return {};
  }

  return {
    [Op.and]: validDates.map((date) =>
      sequelize.literal(`
        "CollabReport"."createdAt" >= ${sequelize.escape(date)}::timestamp with time zone
      `)
    ),
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
