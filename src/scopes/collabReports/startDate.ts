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
  const dateRanges = dates
    .map((dateRange) => dateRange.trim())
    .map((dateRange) => dateRange.split(/\s+-\s+/))
    .filter((splitDates) => splitDates.length === 2)
    .map(([startDate, endDate]) => [startDate.trim(), endDate.trim()] as const)
    .filter(([startDate, endDate]) => startDate.length > 0 && endDate.length > 0);

  if (dateRanges.length === 0) {
    return {};
  }

  return {
    [Op.or]: dateRanges.map(([startDate, endDate]) =>
      sequelize.literal(`
        "CollabReport"."createdAt" BETWEEN ${sequelize.escape(startDate)}::timestamp with time zone
        AND ${sequelize.escape(endDate)}::timestamp with time zone
      `)
    ),
  };
}
