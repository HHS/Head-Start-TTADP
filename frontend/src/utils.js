import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import htmlToDraft from 'html-to-draftjs';
import { EditorState, ContentState } from 'draft-js';
import { DECIMAL_BASE, REPORT_STATUSES, APPROVER_STATUSES } from '@ttahub/common';
import {
  ECLKC_GOVERNMENT_HOSTNAME_EXTENSION,
  HEAD_START_GOVERNMENT_HOSTNAME_EXTENSION,
  WITHIN,
  QUERY_CONDITIONS,
  DATE_FMT,
  DATE_FORMAT,
  DATE_DISPLAY_FORMAT,
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
  return newUrl.host.endsWith(ECLKC_GOVERNMENT_HOSTNAME_EXTENSION)
    || newUrl.host.endsWith(HEAD_START_GOVERNMENT_HOSTNAME_EXTENSION);
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
 * Check for a valid date otherwise return '...'.
 */
export const checkForDate = (date, format = 'MM/DD/YYYY') => {
  if (date) {
    return moment(date, format).format(DATE_DISPLAY_FORMAT);
  }
  return '---';
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
    const {
      topic, query, condition, id,
    } = filter;
    if (Array.isArray(query)) {
      query.forEach((q) => {
        arr.push({
          id: `${id}-${q}`, // Create unique ID for each expanded filter
          originalFilterId: id, // Store reference to original filter
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

export function decodeQueryParam(param) {
  const query = decodeURIComponent(param);
  if (query.includes(',')) {
    return query.split(',');
  }
  return query;
}

export function queryStringToFilters(queryString) {
  const queries = queryString.split('&');
  const filterMap = new Map();

  queries.forEach((q) => {
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
      // Create a unique key for each topic-condition combination
      const key = `${topic}-${condition}`;

      if (filterMap.has(key)) {
        // Consolidate: add to existing filter's query array
        const existing = filterMap.get(key);
        if (Array.isArray(existing.query)) {
          existing.query.push(decodedQueryParam);
        } else {
          existing.query = [existing.query, decodedQueryParam];
        }
      } else {
        // Create new filter
        filterMap.set(key, {
          id: uuidv4(),
          topic,
          condition,
          // we use is and is not for query parameters
          query: condition === 'is not' || condition === 'is' ? [decodedQueryParam] : decodedQueryParam,
        });
      }
    }
  });

  return Array.from(filterMap.values());
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
    const q = String(filter.query).trim();
    return `${filter.topic}.${con}=${encodeURIComponent(q)}`;
  });

  if (region && !Number.isNaN(parseInt(region, DECIMAL_BASE))) {
    queryFragments.push(`region.in[]=${region}`);
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
  lastThreeMonths: false,
  lastSixMonths: false,
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

  if (format.lastThreeMonths) {
    secondDay = moment();
    firstDay = moment().subtract(3, 'months');
  }

  if (format.lastSixMonths) {
    secondDay = moment();
    firstDay = moment().subtract(6, 'months');
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

export const parseFeedIntoDom = (feed) => {
  if (!feed) {
    return null;
  }

  const parsedDom = new window.DOMParser().parseFromString(feed, 'text/xml');

  if (parsedDom.querySelector('parsererror')) {
    return null;
  }

  return parsedDom;
};

export const checkboxesToIds = (checkboxes) => {
  const selectedRowsStrings = Object.keys(checkboxes).filter((key) => checkboxes[key]);
  // Loop all selected rows and parseInt to an array of integers.
  // If the ID isn't a number, keep it as a string.
  return selectedRowsStrings.map((s) => {
    const parsedInt = parseInt(s, DECIMAL_BASE);
    return s.includes('-') ? s : parsedInt;
  });
};

export const blobToCsvDownload = (blob, fileName) => {
  let url;
  let a;
  try {
    // Check if url exists with the attribute of download
    // and remove it if it does.
    if (document.getElementsByName('download').length > 0) {
      Array.from(document.getElementsByName('download')).forEach((el) => el.remove());
    }

    url = window.URL.createObjectURL(blob);
    a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', fileName);
    document.body.appendChild(a);
    a.click();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  } finally {
    window.URL.revokeObjectURL(url);
    if (a) {
      document.body.removeChild(a);
    }
  }
};
export const getPageInfo = (offset, totalCount, currentPage, perPage) => {
  const from = offset >= totalCount ? 0 : offset + 1;
  const offsetTo = perPage * currentPage;
  let to;
  if (offsetTo > totalCount) {
    to = totalCount;
  } else {
    to = offsetTo;
  }
  return `${from.toLocaleString()}-${to.toLocaleString()} of ${totalCount.toLocaleString()}`;
};

export const SUPPORTED_DATE_FORMATS = [
  'MM/DD/YYYY', 'M/D/YYYY', 'M/DD/YYYY', 'MM/D/YYYY',
  'MM/DD/YY', 'M/D/YY', 'M/DD/YY', 'MM/D/YY',
  'YYYY-MM-DD', 'YYYY-M-D', 'YYYY-M-DD', 'YYYY-MM-D',
  'M.D.YYYY', 'MM.D.YYYY', 'M.DD.YYYY',
  'M.D.YY', 'MM.DD.YY',
];

export function isValidDate(value) {
  if (!value) return null;
  const parsed = SUPPORTED_DATE_FORMATS.find((format) => moment(value, format, true).isValid());
  return parsed ? moment(value, parsed, true) : null;
}

/**
 *
 * @param {number} userId
 * @param {object} report
 * report is like {
 *   author: {
 *    id: number,
 *   },
 *   collaboratingSpecialists: {
 *    id: number,
 *   }[]
 *   calculatedStatus: string,
 *   approvers: {
 *    status: string,
 *    user: { id: number }
 *   }[]
 * }
 */
export function getCollabReportStatusDisplayAndClassnames(
  userId,
  report,
) {
  const {
    calculatedStatus,
    author,
    collaboratingSpecialists = [],
    approvers = [],
  } = report;

  let statusClassName = `smart-hub--table-tag-status smart-hub--status-${calculatedStatus}`;
  let displayStatus = calculatedStatus;

  // Check if user is the report creator or collaborator
  const isCreatorOrCollaborator = (author && userId === author.id)
    || collaboratingSpecialists.some((specialist) => specialist.id === userId);

  // Check if user is an approver
  const userApprover = approvers.find((approver) => approver.user && approver.user.id === userId);
  const isApprover = !!userApprover;

  if (isCreatorOrCollaborator) {
    // if user is report creator or collaborator:
    // -- they see a needs action tag if the report is needs action by one approver
    if (calculatedStatus === REPORT_STATUSES.NEEDS_ACTION) {
      displayStatus = 'Needs action';
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`;
    } else if (
      calculatedStatus === REPORT_STATUSES.SUBMITTED
      && approvers.length > 0
      && approvers.some((a) => a.status === APPROVER_STATUSES.APPROVED)
      && !approvers.every((a) => a.status === APPROVER_STATUSES.APPROVED)
    ) {
      // -- if the report is submitted and the report has been approved by one approver
      // but not by all reviewers, they see "Reviewed"
      displayStatus = 'Reviewed';
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`;
    } else if (calculatedStatus === REPORT_STATUSES.SUBMITTED) {
      // -- else, they see "Submitted" if the report is submitted
      displayStatus = 'Submitted';
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`;
    }
    // -- else, they see the default name and classname that are passed in
  }

  if (isApprover) {
    // Check if the approver has reviewed the report (has a status)
    if (userApprover.status) {
      // If they have reviewed, they always see "Reviewed" regardless of their choice
      displayStatus = 'Reviewed';
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`;
    } else if (calculatedStatus === REPORT_STATUSES.SUBMITTED) {
      // If they haven't reviewed it yet and the report is submitted, they see "Needs action"
      displayStatus = 'Needs action';
      statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`;
    }
    // For other statuses (draft, approved, etc.), fall through to default behavior
  }

  return {
    displayStatus,
    statusClassName,
  };
}

export function getStatusDisplayAndClassnames(
  calculatedStatus,
  approvers = [],
  justSubmitted = false,
) {
  let statusClassName = `smart-hub--table-tag-status smart-hub--status-${calculatedStatus}`;
  let displayStatus = calculatedStatus;

  if (justSubmitted) {
    displayStatus = 'Submitted';
    statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`;
  }

  if (calculatedStatus === REPORT_STATUSES.NEEDS_ACTION) {
    displayStatus = 'Needs action';
    statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`;
  }

  if (
    calculatedStatus !== REPORT_STATUSES.NEEDS_ACTION
      && approvers && approvers.length > 0
      && approvers.some((a) => a.status === APPROVER_STATUSES.APPROVED)
  ) {
    displayStatus = 'Reviewed';
    statusClassName = 'smart-hub--table-tag-status smart-hub--status-reviewed';
  }

  if (
    calculatedStatus !== REPORT_STATUSES.NEEDS_ACTION
      && approvers && approvers.length > 0
      && approvers.some((a) => a.status === APPROVER_STATUSES.NEEDS_ACTION)
  ) {
    displayStatus = 'Needs action';
    statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`;
  }

  if (
    calculatedStatus !== REPORT_STATUSES.APPROVED
      && approvers && approvers.length > 0
      && approvers.every((a) => a.status === APPROVER_STATUSES.APPROVED)
  ) {
    displayStatus = REPORT_STATUSES.APPROVED;
    statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.APPROVED}`;
  }

  return {
    displayStatus,
    statusClassName,
  };
}
