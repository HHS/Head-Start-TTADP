import { Op } from 'sequelize';
import db from '../../models';
import { normalizeDateInput } from '../utils';

const { sequelize } = db;

function normalizeValidDates(dates: string[]): string[] {
  return dates
    .filter((date): date is string => typeof date === 'string' && date.trim().length > 0)
    .map((date) => normalizeDateInput(date.trim(), 'start'))
    .filter((date): date is string => date !== null);
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
    .filter(
      (dateRange): dateRange is string =>
        typeof dateRange === 'string' && dateRange.trim().length > 0
    )
    .map((dateRange) => dateRange.trim())
    .map((dateRange) => dateRange.split(/\s*-\s*/))
    .filter((splitDates) => splitDates.length === 2)
    .map(
      ([startDate, endDate]) =>
        [
          normalizeDateInput(startDate.trim(), 'start'),
          normalizeDateInput(endDate.trim(), 'end'),
        ] as const
    )
    .filter((pair): pair is [string, string] => pair[0] !== null && pair[1] !== null);

  if (dateRanges.length === 0) {
    return {};
  }

  const withinClauses = dateRanges.map(
    ([startDate, endDate]) => `
    "CollabReport"."createdAt"::date BETWEEN ${sequelize.escape(startDate)}::date
    AND ${sequelize.escape(endDate)}::date
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
