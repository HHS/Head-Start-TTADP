/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import { sequelize } from '../../models';

/**
 * Creates a subquery to find grants where the recipient's last TTA date
 * is on or before the specified date(s).
 *
 * @param {String[]} dates - Array of date strings in YYYY/MM/DD format
 * @returns {Object} Sequelize scope with where clause
 */
export function beforeLastTTA(dates) {
  const dateConditions = dates.map((date) => sequelize.escape(date)).join(',');

  return {
    where: {
      id: {
        [Op.in]: sequelize.literal(`(
          SELECT DISTINCT g.id
          FROM "Grants" g
          INNER JOIN "Goals" goals ON goals."grantId" = g.id
          INNER JOIN "ActivityReportGoals" arg ON arg."goalId" = goals.id
          INNER JOIN "ActivityReports" ar ON arg."activityReportId" = ar.id
          WHERE ar."calculatedStatus" = 'approved'
          GROUP BY g.id, g."recipientId"
          HAVING MAX(ar."approvedAt")::date <= ANY(ARRAY[${dateConditions}]::date[])
        )`),
      },
    },
  };
}

/**
 * Creates a subquery to find grants where the recipient's last TTA date
 * is on or after the specified date(s).
 *
 * @param {String[]} dates - Array of date strings in YYYY/MM/DD format
 * @returns {Object} Sequelize scope with where clause
 */
export function afterLastTTA(dates) {
  const dateConditions = dates.map((date) => sequelize.escape(date)).join(',');

  return {
    where: {
      id: {
        [Op.in]: sequelize.literal(`(
          SELECT DISTINCT g.id
          FROM "Grants" g
          INNER JOIN "Goals" goals ON goals."grantId" = g.id
          INNER JOIN "ActivityReportGoals" arg ON arg."goalId" = goals.id
          INNER JOIN "ActivityReports" ar ON arg."activityReportId" = ar.id
          WHERE ar."calculatedStatus" = 'approved'
          GROUP BY g.id, g."recipientId"
          HAVING MAX(ar."approvedAt")::date >= ANY(ARRAY[${dateConditions}]::date[])
        )`),
      },
    },
  };
}

/**
 * Creates a subquery to find grants where the recipient's last TTA date
 * falls within the specified date range(s).
 *
 * @param {String[]} dates - Array of date range strings in YYYY/MM/DD-YYYY/MM/DD format
 * @returns {Object} Sequelize scope with where clause
 */
export function withinLastTTA(dates) {
  const dateRanges = dates.reduce((acc, range) => {
    if (!range.split) {
      return acc;
    }

    const [startDate, endDate] = range.split('-');
    if (!startDate || !endDate) {
      return acc;
    }

    return [
      ...acc,
      {
        start: sequelize.escape(startDate),
        end: sequelize.escape(endDate),
      },
    ];
  }, []);

  if (dateRanges.length === 0) {
    return { where: {} };
  }

  // Build OR conditions for multiple date ranges
  const rangeConditions = dateRanges
    .map(({ start, end }) => `(MAX(ar."approvedAt")::date >= ${start}::date AND MAX(ar."approvedAt")::date <= ${end}::date)`)
    .join(' OR ');

  return {
    where: {
      id: {
        [Op.in]: sequelize.literal(`(
          SELECT DISTINCT g.id
          FROM "Grants" g
          INNER JOIN "Goals" goals ON goals."grantId" = g.id
          INNER JOIN "ActivityReportGoals" arg ON arg."goalId" = goals.id
          INNER JOIN "ActivityReports" ar ON arg."activityReportId" = ar.id
          WHERE ar."calculatedStatus" = 'approved'
          GROUP BY g.id, g."recipientId"
          HAVING ${rangeConditions}
        )`),
      },
    },
  };
}
