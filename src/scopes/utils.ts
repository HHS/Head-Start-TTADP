import { Op, WhereOptions } from 'sequelize';
import { DateTime } from 'luxon';
import { map, pickBy } from 'lodash';
import db from '../models';

const { Topic } = db;
const YEAR_MONTH_PATTERN = /^\d{4}[-/]\d{1,2}$/;
const YEAR_MONTH_FORMATS = ['YYYY-MM', 'YYYY-M', 'YYYY/MM', 'YYYY/M'];
const FULL_DATE_FORMATS = [
  'YYYY-MM-DD', 'YYYY-M-D', 'YYYY-MM-D', 'YYYY-M-DD',
  'YYYY/MM/DD', 'YYYY/M/D', 'YYYY/MM/D', 'YYYY/M/DD',
  'MM/DD/YYYY', 'M/D/YYYY', 'M/DD/YYYY', 'MM/D/YYYY',
  'MM/DD/YY', 'M/D/YY', 'M/DD/YY', 'MM/D/YY',
];

const toLuxonFormat = (format: string) => format
  .replace(/YYYY/g, 'yyyy')
  .replace(/YY/g, 'yy')
  .replace(/DD/g, 'dd')
  .replace(/D/g, 'd');

const parseFromFormats = (value: string, formats: string[]): DateTime | null => {
  const format = formats.find((f) => DateTime.fromFormat(value, toLuxonFormat(f)).isValid);
  if (!format) {
    return null;
  }
  const parsed = DateTime.fromFormat(value, toLuxonFormat(format));
  return parsed.isValid ? parsed : null;
};

function normalizeDateInput(value: string, boundary: 'start' | 'end'): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (YEAR_MONTH_PATTERN.test(trimmed)) {
    const monthOnly = parseFromFormats(trimmed, YEAR_MONTH_FORMATS);
    if (!monthOnly) {
      return null;
    }
    const bounded = boundary === 'end' ? monthOnly.endOf('month') : monthOnly.startOf('month');
    return bounded.toISODate();
  }

  const fullDate = parseFromFormats(trimmed, FULL_DATE_FORMATS);
  if (!fullDate) {
    return null;
  }

  return fullDate.toISODate();
}
/**
 * Takes an array of string date ranges (2020/09/01-2021/10/02, for example)
 * and attempts to turn them into something sequelize can understand
 *
 * @param {String[]} dates
 * @param {String} property
 * @param {string} Operator (a sequelize date operator)
 * @returns an array meant to be folded in an Op.and/Op.or sequelize expression
 */
export function compareDate(
  dates: string[],
  property: string,
  operator: typeof Op.lte | typeof Op.lt | typeof Op.gte | typeof Op.gt,
): WhereOptions[] {
  const boundary = operator === Op.lte || operator === Op.lt ? 'end' : 'start';
  return dates.reduce((acc, date) => {
    const normalized = normalizeDateInput(date, boundary);
    if (!normalized) {
      return acc;
    }

    return [
      ...acc,
      {
        [property]: {
          [operator]: normalized,
        },
      },
    ];
  }, []);
}

/**
 * Takes an array of string date ranges (2020/09/01-2021/10/02, for example)
 * and attempts to turn them into something sequelize can understand
 *
 * @param {String[]} dates
 * @param {String} property
 * @returns an array meant to be folded in an Op.and/Op.or sequelize expression
 */
export function withinDateRange(dates: string[], property: string): WhereOptions[] {
  return dates.reduce((acc, range) => {
    if (!range.split) {
      return acc;
    }

    const [startDate, endDate] = range.split('-');
    if (!startDate || !endDate) {
      return acc;
    }

    const normalizedStartDate = normalizeDateInput(startDate, 'start');
    const normalizedEndDate = normalizeDateInput(endDate, 'end');
    if (!normalizedStartDate || !normalizedEndDate) {
      return acc;
    }

    return [
      ...acc,
      {
        [property]: {
          [Op.gte]: normalizedStartDate,
          [Op.lte]: normalizedEndDate,
        },
      },
    ];
  }, []);
}

export function createFiltersToScopes(filters, topicToQuery, options, userId, validTopics) {
  const validFilters = pickBy(filters, (_query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    if (!(topic in topicToQuery)) {
      return false;
    }
    return condition in topicToQuery[topic];
  });

  return map(validFilters, (query, topicAndCondition) => {
    const [topic, condition] = topicAndCondition.split('.');
    return topicToQuery[topic][condition]([query].flat(), options, userId, validTopics);
  });
}

/**
 *
 *  baseQuery should be a SQL statement up to and including the end of a final where
 *  for example
 *
 * 'SELECT "ActivityReportCollaborators"."activityReportId" FROM "Users"
 *  INNER JOIN "ActivityReportCollaborators"
 *  ON "ActivityReportCollaborators"."userId" = "Users"."id"
 *  WHERE "Users".name'
 *
 * Assuming this is to get all matching reports, when this is passed to
 * reportInSubQuery, it will be transformed and executed as
 *
 * "ActivityReport"."id" IN (
 *    'SELECT "ActivityReportCollaborators"."activityReportId" FROM "Users"
 *     INNER JOIN "ActivityReportCollaborators"
 *     ON "ActivityReportCollaborators"."userId" = "Users"."id"
 *     WHERE "Users".name' ~* "Name")`
 * Where that final name is one of the members of the searchTerms array
 *
 * @param {*} baseQuery a partial sql statement
 * @param {*} searchTerms an array of search terms from the query string
 * @param {*} exclude whether this should exclude or include reports
 * @param {*} comparator default ~*
 * what is used to compare the end of the baseQuery to the searchTerm
 * @returns an object in the style of a sequelize where clause
 */

export function filterAssociation(baseQuery, searchTerms, exclude, callback, comparator = '~*', escape = true) {
  if (exclude) {
    return {
      where: {
        [Op.and]: callback(baseQuery, searchTerms, 'NOT IN', comparator, escape),
      },
    };
  }

  return {
    where: {
      [Op.or]: callback(baseQuery, searchTerms, 'IN', comparator, escape),
    },
  };
}

export const validatedIdArray = (query: string[]): number[] => query
  .map((id) => Number(id))
  .filter((id) => Number.isInteger(id));

/**
 * Extracts the WHERE clause from a Sequelize model's findAll query and replaces the model name
 * with an alias.
 * @param model - The Sequelize model to query.
 * @param alias - The alias to replace the model name with.
 * @param scope - The WHERE options for the query.
 * @returns The modified WHERE clause as a string.
 */
export const scopeToWhere = async (
  model,
  alias: string,
  scope: WhereOptions,
): Promise<string> => {
  let sql = '';
  // The db is not connected for this query as the limit is set to zero, it just returns.
  await model.findAll({
    where: scope,
    limit: 0,
    logging: (x) => { sql = x; },
  });

  // Extract the WHERE clause from the SQL query
  const where = sql
    .substring(sql.indexOf('WHERE') + 'WHERE'.length + 1)
    .replace(/\sLIMIT\s0;$/, '')
    .replace(new RegExp(`"${model.name}"`, 'g'), alias);

  return where;
};

export async function getValidTopicsSet() {
  const rows = await Topic.findAll({ attributes: ['name'], raw: true });
  return new Set(rows.map((r) => r.name));
}
