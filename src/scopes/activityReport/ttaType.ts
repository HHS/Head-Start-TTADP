import { WhereOptions, Op } from 'sequelize';
import { uniq } from 'lodash';
import { sequelize } from '../../models';
import filterArray from './utils';

/**
 *
 * this function is used to expand the ttaType array into a sequelize literal
 * it overrides the default behavior of filterArray because we don't want to use the
 * % operators
 *
 * @param {string} column
 * @param {string[]} searchTerms
 * @param {string} operator
 * @returns {string[]} // this might actually be the sequelize literal type
 */
const expandTypesArrayForQuery = (
  column: string,
  searchTerms: string[],
  operator: string,
) : string[] => searchTerms.map(
  (term) => sequelize.literal(`${column} ${operator} ${sequelize.escape(String(term).trim())}`),
);

const VALID_TTA_TYPES = [
  'technical-assistance',
  'training',
  'training,technical-assistance',
];

/**
 *
 * Since the query can contain essentially any string, we should parse out the valid tta types
 * create a uniq list so they aren't duplicated
 *
 * we join them because the ttaType is an array of strings in the database and we are using the
 * ARRAY_TO_STRING function to convert it to a string for the query. since the valid value for
 * "both" is "training,technical-assistance" we need to join the array with a comma to match the
 * database value
 *
 * @param {string[]} query
 * @returns {string[]}
 */
const calculateTtaType = (query: ['technical-assistance' | 'training' | 'training,technical-assistance']) : string[] => [uniq(query.filter((ttaType) => VALID_TTA_TYPES.includes(ttaType))).join(',')];

/**
 * query for activity reports with a specific tta type
 *
 * @param query an array of string parsed from the query string
 * @returns {WhereOptions} a sequelize where clause
 * @see withTtaType
 * @see calculateTtaType
 */

export function withTtaType(query: ['technical-assistance' | 'training' | 'training,technical-assistance']): WhereOptions {
  return filterArray('ARRAY_TO_STRING("ttaType", \',\')', calculateTtaType(query), false, Op.or, Op.and, expandTypesArrayForQuery);
}

/**
 * query for activity reports without a specific tta type
 * @param query an array of string parsed from the query string
 * @returns {WhereOptions} a sequelize where clause
 * @see withTtaType
 * @see calculateTtaType
 */
export function withoutTtaType(query: ['technical-assistance' | 'training' | 'training,technical-assistance']): WhereOptions {
  return filterArray('ARRAY_TO_STRING("ttaType", \',\')', calculateTtaType(query), true, Op.or, Op.and, expandTypesArrayForQuery);
}
