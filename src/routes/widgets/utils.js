import { DECIMAL_BASE } from '@ttahub/common';
import { topicToQuery as activityReportTopicsToQuery } from '../../scopes/activityReport';
import { topicToQuery as citationTopicsToQuery } from '../../scopes/citation';
import { topicToQuery as collabReportTopicsToQuery } from '../../scopes/collabReports';
import { topicToQuery as communicaionLogTopicsToQuery } from '../../scopes/communicationLog';
import { topicToQuery as deliveredReviewTopicsToQuery } from '../../scopes/deliveredReview';
import { topicToQuery as goalTopicsToQuery } from '../../scopes/goals';
import { topicToQuery as grantCitationTopicsToQuery } from '../../scopes/grantCitation';
import { topicToQuery as grantsTopicsToQuery } from '../../scopes/grants';
import { topicToQuery as sessionReportTopicsToQuery } from '../../scopes/sessionReports';
import { topicToQuery as trainingReportTopicsToQuery } from '../../scopes/trainingReports';

const topicToQuery = {
  ...activityReportTopicsToQuery,
  ...citationTopicsToQuery,
  ...collabReportTopicsToQuery,
  ...communicaionLogTopicsToQuery,
  ...deliveredReviewTopicsToQuery,
  ...goalTopicsToQuery,
  ...grantCitationTopicsToQuery,
  ...grantsTopicsToQuery,
  ...sessionReportTopicsToQuery,
  ...trainingReportTopicsToQuery,
};

/**
 *
 * @returns an array of string representing every possible supported scope
 */
function getAllowedKeys() {
  const allowedKeys = [];
  const conditions = Object.keys(topicToQuery);
  /**
   *
   *   topicToQuery is an object that looks like this
   *   {
   *        condition (i.e reportId, region): {
   *            operator (i.e in, nin, win): (query) => function(query),
   *            another operator: (query) => function(query),
   *        },
   *    }
   *
   *   and we want to return something like this
   *   ['operator.in', 'operator.nin' ...]
   *   an array that covers all the allowed url params
   *
   *
   * */

  conditions.forEach((condition) => {
    const operators = Object.keys(topicToQuery[condition]);
    operators.forEach((operator) => allowedKeys.push(`${condition}.${operator}`));
  });

  // also allow sorting/pagination keys
  return [
    ...allowedKeys,
    'offset',
    'sortBy',
    'direction',
    'perPage',
    'includeAllGoalIds',
    'format',
  ];
}

/**
 *
 * @param {*} query a query object, already containing only allowed keys
 * @returns query with any additional parameters that need to be passed in
 */

export function formatQuery(query) {
  /**
   * if
   * - region.in is in the query
   * - region.in is an array
   * - and there is a first element in the array
   *
   * return the parsed int form of that first element
   *
   * else
   *
   * return 0
   *
   */

  const region =
    'region.in' in query && Array.isArray(query['region.in']) && query['region.in'][0]
      ? parseInt(query['region.in'][0], DECIMAL_BASE)
      : 0;

  return {
    ...query,
    region,
  };
}

/**
 *
 * @param {*} query the req.query object created by express from the URL
 * @returns the query, but with only the keys supported by the scopes
 */
export function onlyAllowedKeys(query) {
  const allowedKeys = getAllowedKeys();

  const sanitizedQuery = {};

  allowedKeys.forEach((key) => {
    if (query[key]) {
      sanitizedQuery[key] = query[key];
    }
  });

  return sanitizedQuery;
}
