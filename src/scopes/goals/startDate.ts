import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../models';

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
  return {
    id: {
      [Op.in]: getDateSql([`'${date}'`], '<='),
    },
  };
}

export function afterStartDate(date: string): WhereOptions {
  return {
    id: {
      [Op.in]: getDateSql([`'${date}'`], '>='),
    },
  };
}

export function withinStartDates(dates: string[]): WhereOptions {
  // got: [ '2022/11/23-2023/02/22' ]
  // need: [ '2022-11-23', '2023-02-22']
  const escapedDates = dates[0].split('-').map((d) => `'${d.replace(/\//g, '-')}'`);
  return {
    id: {
      [Op.in]: getDateSql(escapedDates, 'BETWEEN'),
    },
  };
}
