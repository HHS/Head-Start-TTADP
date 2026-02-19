import { Op } from 'sequelize';
import moment from 'moment';

const INPUT_DATE_FORMATS = [
  'YYYY/MM/DD', 'YYYY-MM-DD', 'YYYY/M/D', 'YYYY-M-D',
  'MM/DD/YYYY', 'M/D/YYYY',
];

function toStoredFormat(dateStr) {
  const parsed = moment(dateStr, INPUT_DATE_FORMATS, true);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.format('MM/DD/YYYY');
}

export function beforeStartDate(date) {
  const converted = toStoredFormat(date[0]);
  if (!converted) return {};
  return {
    [Op.and]: {
      'data.startDate': {
        [Op.lte]: converted,
      },
    },
  };
}

export function afterStartDate(date) {
  const converted = toStoredFormat(date[0]);
  if (!converted) return {};
  return {
    [Op.and]: {
      'data.startDate': {
        [Op.gte]: converted,
      },
    },
  };
}

export function withinStartDates(dates) {
  const splitDates = dates[0].split('-');
  if (splitDates.length !== 2) {
    return {};
  }
  const startDate = toStoredFormat(splitDates[0]);
  const endDate = toStoredFormat(splitDates[1]);
  if (!startDate || !endDate) {
    return {};
  }
  return {
    [Op.and]: {
      'data.startDate': {
        [Op.between]: [startDate, endDate],
      },
    },
  };
}
