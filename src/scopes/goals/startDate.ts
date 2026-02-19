import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';
import { normalizeDateInput } from '../utils';

function getDateSql(dates: string[], operator: string) {
  const dateClause = (operator === 'BETWEEN')
    ? `${dates[0]} AND ${dates[1]}`
    : dates[0];

  return sequelize.literal(`(
    SELECT DISTINCT "goalId"
    FROM "ActivityReportGoals"
    INNER JOIN "ActivityReports"
    ON "ActivityReportGoals"."activityReportId" = "ActivityReports"."id"
    WHERE "ActivityReports"."startDate" ${operator} ${dateClause}
  )`);
}

export function beforeStartDate(date: string): WhereOptions {
  const converted = normalizeDateInput(date, 'end');
  if (!converted) return {};
  return {
    id: {
      [Op.in]: getDateSql([`'${converted}'`], '<='),
    },
  };
}

export function afterStartDate(date: string): WhereOptions {
  const converted = normalizeDateInput(date, 'start');
  if (!converted) return {};
  return {
    id: {
      [Op.in]: getDateSql([`'${converted}'`], '>='),
    },
  };
}

export function withinStartDates(dates: string[]): WhereOptions {
  const splitDates = dates[0].split('-');
  if (splitDates.length !== 2) {
    return {};
  }
  const startDate = normalizeDateInput(splitDates[0], 'start');
  const endDate = normalizeDateInput(splitDates[1], 'end');
  if (!startDate || !endDate) {
    return {};
  }
  return {
    id: {
      [Op.in]: getDateSql([`'${startDate}'`, `'${endDate}'`], 'BETWEEN'),
    },
  };
}
