import { isEqual } from 'lodash';
import moment from 'moment';
import {
  DATE_DISPLAY_FORMAT,
  DATEPICKER_VALUE_FORMAT,
} from '../../Constants';

/**
 * compares two objects using lodash "isEqual" and returns the difference
 * @param {*} object
 * @param {*} base
 * @returns {} containing any new keys/values
 */
export const findWhatsChanged = (object, base) => {
  function reduction(accumulator, current) {
    if (current === 'startDate' || current === 'endDate') {
      if (!object[current] || !moment(object[current], 'MM/DD/YYYY').isValid()) {
        delete accumulator[current];
        return accumulator;
      }
    }

    if (current === 'creatorRole' && !object[current]) {
      accumulator[current] = null;
      return accumulator;
    }

    if (!isEqual(base[current], object[current])) {
      accumulator[current] = object[current];
    }

    if (Number.isNaN(accumulator[current])) {
      delete accumulator[current];
    }

    return accumulator;
  }

  // we sort these so they traverse in a particular order
  return Object.keys(object).sort().reduce(reduction, {});
};

export const unflattenResourcesUsed = (array) => {
  if (!array) {
    return [];
  }

  return array.map((value) => ({ value }));
};

export const convertReportToFormData = (fetchedReport) => {
  const endDate = fetchedReport.endDate ? moment(fetchedReport.endDate, DATEPICKER_VALUE_FORMAT).format(DATE_DISPLAY_FORMAT) : '';
  const startDate = fetchedReport.startDate ? moment(fetchedReport.startDate, DATEPICKER_VALUE_FORMAT).format(DATE_DISPLAY_FORMAT) : '';

  return {
    ...fetchedReport,
    endDate,
    startDate,
  };
};
