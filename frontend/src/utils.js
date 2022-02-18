import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import htmlToDraft from 'html-to-draftjs';
import { EditorState, ContentState } from 'draft-js';
import {
  GOVERNMENT_HOSTNAME_EXTENSION,
  REPORT_STATUSES,
  WITHIN,
  QUERY_CONDITIONS,
  DECIMAL_BASE,
  DATE_FMT,
  DATE_FORMAT,
} from './Constants';

/**
 * Given a potential url, verify that it is a valid url with http(s) scheme.
 */
export const isValidURL = (url) => {
  try {
    const potential = new URL(url);
    // Verify that its only http(s)
    return ['https:', 'http:'].includes(potential.protocol);
  } catch (err) {
    return false;
  }
};

/**
 * Decide if given url is internal goverment link.
 * Internal gov link is defined as any host name that does not
 * end with `GOVERNMENT_HOSTNAME_EXTENSION`

 * Assumes url passed in is valid.
 */
export const isInternalGovernmentLink = (url) => {
  const newUrl = new URL(url);
  return newUrl.host.endsWith(GOVERNMENT_HOSTNAME_EXTENSION);
};

/**
 * Decide if a given url is external or not. Assumes, url is already valid.
 * Definition of external is anything not matching the current host name
 * *OR*
 * Any host name that does not end with `GOVERNMENT_HOSTNAME_EXTENSION`
 */
export const isExternalURL = (url) => {
  const newUrl = new URL(url);
  const currentHost = window.location;

  if (isInternalGovernmentLink(url)) {
    return false;
  }

  return (newUrl.host !== currentHost.host);
};

export const reportIsEditable = (status) => status === REPORT_STATUSES.DRAFT
  || status === REPORT_STATUSES.NEEDS_ACTION;

/**
 * Given an html string.
 * Return an `EditorState` object that is used for the Rich Editor Text Box.
 *
 */

export const getEditorState = (name) => {
  const { contentBlocks, entityMap } = htmlToDraft(name || '');
  const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);
  return EditorState.createWithContent(contentState);
};

export const getDistinctSortedArray = (arr) => {
  let distinctList = arr.filter(((a) => a !== null));
  distinctList = [...new Set(distinctList)];
  distinctList = distinctList.sort();
  return distinctList;
};

/**
 * Express expects arrays in queries like
 * &filter.is[]=1&filter.is[]=2
 * rather than &filter.is[]=1,2
 *
 * @param {Array} filters
 * @returns array of filters
 */

export function expandFilters(filters) {
  const arr = [];

  filters.forEach((filter) => {
    const { topic, query, condition } = filter;
    if (Array.isArray(query)) {
      query.forEach((q) => {
        arr.push({
          topic,
          condition,
          query: q,
        });
      });
    } else {
      arr.push(filter);
    }
  });

  return arr;
}

function decodeQueryParam(param) {
  const query = decodeURIComponent(param);
  if (query.includes(',')) {
    return query.split(',');
  }
  return query;
}

export function queryStringToFilters(queryString) {
  const queries = queryString.split('&');
  return queries.map((q) => {
    const [topicAndCondition, query] = q.split('=');
    const [topic, searchCondition] = topicAndCondition.split('.');

    const queryKeys = Object.keys(QUERY_CONDITIONS);
    const queryConditions = Object.values(QUERY_CONDITIONS);

    const decodedQueryParam = decodeQueryParam(query);

    const findCondition = (queryCondition) => {
      const decoded = decodeURIComponent(searchCondition);
      return decoded === queryCondition;
    };

    const index = queryConditions.findIndex(findCondition);

    const condition = queryKeys[index];

    if (topic && condition && query) {
      return {
        id: uuidv4(),
        topic,
        condition,
        // we use is and is not for query parameters
        query: condition === 'Is not' || condition === 'Is' ? [decodedQueryParam] : decodedQueryParam,
      };
    }

    return null;
  }).filter((query) => query);
}

export function filtersToQueryString(filters, region) {
  const filtersWithValues = filters.filter((f) => {
    if (f.condition === WITHIN) {
      const [startDate, endDate] = f.query.split('-');
      return moment(startDate, DATE_FMT).isValid() && moment(endDate, DATE_FMT).isValid();
    }
    return f.query !== '';
  });
  const queryFragments = filtersWithValues.map((filter) => {
    const con = QUERY_CONDITIONS[filter.condition];
    return `${filter.topic}.${con}=${encodeURIComponent(filter.query)}`;
  });
  if (region && (parseInt(region, DECIMAL_BASE) !== -1)) {
    queryFragments.push(`region.in[]=${parseInt(region, DECIMAL_BASE)}`);
  }

  return queryFragments.join('&');
}

/**
 * This function accepts a configuration object, the keys of which are all optional
 *
 *  if either of these are true, the function will return the date string for that automatically
 *  lastThirtyDays
 *  yearToDate
 *
 *  (Logically, if they are both true, that doesn't make sense,
 *   but last thirty days will be returned)
 *
 *   withSpaces - Should there be spaces in between the two dates and the seperator
 *
 *   sep - what character or string should seperate the two dates
 *
 *   forDateTime: returns the string in DATETIME_DATE_FORMAT, otherwise DATE_FORMAT is used
 *
 *   string - the string to be parsed to return a formatted date
 *   It's expected to be in DATETIME_DATE_FORMAT
 *
 * @param {Object} format
 * @returns a date string
 */
export function formatDateRange(format = {
  lastThirtyDays: false,
  yearToDate: false,
  withSpaces: false,
  forDateTime: false,
  sep: '-',
  string: '',
}) {
  const selectedFormat = format.forDateTime ? DATE_FMT : DATE_FORMAT;

  let { sep } = format;

  if (!format.sep) {
    sep = '-';
  }

  let firstDay;
  let secondDay;

  if (format.lastThirtyDays) {
    secondDay = moment();
    firstDay = moment().subtract(30, 'days');
  }

  if (format.yearToDate) {
    secondDay = moment();
    firstDay = moment().startOf('year');
  }

  if (format.string) {
    const dates = format.string.split('-');

    if (dates && dates.length > 1) {
      firstDay = moment(dates[0], DATE_FMT);
      secondDay = moment(dates[1], DATE_FMT);
    }
  }

  if (firstDay && secondDay) {
    if (format.withSpaces) {
      return `${firstDay.format(selectedFormat)} ${sep} ${secondDay.format(selectedFormat)}`;
    }

    return `${firstDay.format(selectedFormat)}${sep}${secondDay.format(selectedFormat)}`;
  }

  return '';
}
