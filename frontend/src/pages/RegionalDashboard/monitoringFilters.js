import moment from 'moment';
import { DATE_FMT, WITHIN } from '../../Constants';
import { formatDateFilterForQuery } from '../../utils';

const MONITORING_DATE_TOPICS = ['startDate', 'completeDate', 'reportDeliveryDate'];

export function formatMonitoringDateForQuery(query) {
  return formatDateFilterForQuery(query);
}

function isValidQueryDate(date) {
  return moment(date, DATE_FMT, true).isValid();
}

function hasValidMonitoringDateQuery(condition, query) {
  const queries = Array.isArray(query) ? query : [query];

  return queries.every((rawQuery) => {
    const formattedQuery = formatMonitoringDateForQuery(rawQuery);

    if (typeof formattedQuery !== 'string') {
      return false;
    }

    if (condition === WITHIN) {
      const dates = formattedQuery.split('-');
      return dates.length === 2 && dates.every(isValidQueryDate);
    }

    return isValidQueryDate(formattedQuery);
  });
}

function formatMonitoringDateFilter(filter) {
  return {
    ...filter,
    query: formatMonitoringDateForQuery(filter.query),
  };
}

function hasMatchingCompleteDateFilter(filters, startDateFilter) {
  return filters.some(
    (filter) =>
      filter.topic === 'completeDate' &&
      filter.condition === startDateFilter.condition &&
      filter.query === startDateFilter.query
  );
}

function completeDateFilterFor(startDateFilter) {
  return {
    ...startDateFilter,
    id: startDateFilter.id ? `${startDateFilter.id}-completeDate` : undefined,
    topic: 'completeDate',
  };
}

export function formatMonitoringFiltersForQuery(filters = [], options = {}) {
  const { includeCompleteDate = false } = options;
  const formattedFilters = [];

  filters.forEach((filter) => {
    if (filter.topic === 'reportDeliveryDate') {
      return;
    }

    if (filter.topic === 'completeDate') {
      return;
    }

    if (!MONITORING_DATE_TOPICS.includes(filter.topic)) {
      formattedFilters.push(filter);
      return;
    }

    if (!hasValidMonitoringDateQuery(filter.condition, filter.query)) {
      return;
    }

    formattedFilters.push(formatMonitoringDateFilter(filter));
  });

  if (includeCompleteDate) {
    const startDateFilters = formattedFilters.filter((filter) => filter.topic === 'startDate');
    startDateFilters.forEach((startDateFilter) => {
      if (!hasMatchingCompleteDateFilter(formattedFilters, startDateFilter)) {
        formattedFilters.push(completeDateFilterFor(startDateFilter));
      }
    });
  }

  return formattedFilters;
}
