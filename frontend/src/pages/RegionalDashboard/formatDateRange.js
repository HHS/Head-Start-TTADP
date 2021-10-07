import moment from 'moment';
import { DATETIME_DATE_FORMAT, DATE_FORMAT } from './constants';

export default function formatDateRange(format = {
  lastThirtyDays: false, withSpaces: false, forDateTime: false, sep: '-', string: '',
}) {
  const selectedFormat = format.forDateTime ? DATETIME_DATE_FORMAT : DATE_FORMAT;

  let { sep } = format;

  if (!format.sep) {
    sep = '-';
  }
  if (format.lastThirtyDays) {
    const today = moment();
    const thirtyDaysAgo = moment().subtract(30, 'days');

    if (format.withSpaces) {
      return `${thirtyDaysAgo.format(selectedFormat)} ${sep} ${today.format(selectedFormat)}`;
    }

    return `${thirtyDaysAgo.format(selectedFormat)}${sep}${today.format(selectedFormat)}`;
  }

  if (format.string) {
    const dates = format.string.split('-');

    if (dates && dates.length > 1) {
      if (format.withSpaces) {
        return `${moment(dates[0], DATETIME_DATE_FORMAT).format(selectedFormat)} ${sep} ${moment(dates[1], DATETIME_DATE_FORMAT).format(selectedFormat)}`;
      }

      return `${moment(dates[0], DATETIME_DATE_FORMAT).format(selectedFormat)}${sep}${moment(dates[1], DATETIME_DATE_FORMAT).format(selectedFormat)}`;
    }
  }

  return '';
}
