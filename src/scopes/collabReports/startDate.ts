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
    .filter((dateRange): dateRange is string => typeof dateRange === 'string' && dateRange.trim().length > 0)
    .map((dateRange) => dateRange.trim())
    .map((dateRange) => dateRange.split(/\s*-\s*/))
    .filter((splitDates) => splitDates.length === 2)
    .map(([startDate, endDate]) => [new Date(startDate.trim()), new Date(endDate.trim())] as const)
    .filter(
      ([startDate, endDate]) =>
        !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())
    )
    .map(([startDate, endDate]) => [startDate.toISOString(), endDate.toISOString()] as const);

  if (dateRanges.length === 0) {
    return {};
  }

  const withinClauses = dateRanges.map(
    ([startDate, endDate]) => `
      "CollabReport"."createdAt" BETWEEN ${sequelize.escape(startDate)}::timestamp with time zone
      AND ${sequelize.escape(endDate)}::timestamp with time zone
    `
  );

  return {
    [Op.and]: [
      sequelize.literal(`
        (${withinClauses.join('\n         OR ')})
      `),
    ],
  };
}
