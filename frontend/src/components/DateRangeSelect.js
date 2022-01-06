/* eslint-disable import/prefer-default-export */
import moment from 'moment';
import { DATE_FMT as DATETIME_DATE_FORMAT, DATE_FORMAT } from '../Constants';

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
  const selectedFormat = format.forDateTime ? DATETIME_DATE_FORMAT : DATE_FORMAT;

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
      firstDay = moment(dates[0], DATETIME_DATE_FORMAT);
      secondDay = moment(dates[1], DATETIME_DATE_FORMAT);
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
