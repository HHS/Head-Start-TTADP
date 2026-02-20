import { Op } from 'sequelize';
import moment from 'moment';
import { sequelize } from '../../models';

const INPUT_DATE_FORMATS = [
  'YYYY/MM/DD', 'YYYY-MM-DD', 'YYYY/M/D', 'YYYY-M-D',
  'MM/DD/YYYY', 'M/D/YYYY',
];

/**
 * Converts input date to ISO format (YYYY-MM-DD) for PostgreSQL comparison.
 * Dates are stored in the JSONB column as MM/DD/YYYY, but we use TO_DATE
 * in PostgreSQL to properly compare dates chronologically.
 */
function toIsoFormat(dateStr) {
  const parsed = moment(dateStr, INPUT_DATE_FORMATS, true);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.format('YYYY-MM-DD');
}

export function beforeStartDate(date) {
  const converted = toIsoFormat(date[0]);
  if (!converted) return {};
  // Use TO_DATE to convert stored MM/DD/YYYY to a proper date for comparison
  return {
    [Op.and]: [
      sequelize.literal(
        `TO_DATE("EventReportPilot"."data"->>'startDate', 'MM/DD/YYYY') <= ${sequelize.escape(converted)}::date`,
      ),
    ],
  };
}

export function afterStartDate(date) {
  const converted = toIsoFormat(date[0]);
  if (!converted) return {};
  // Use TO_DATE to convert stored MM/DD/YYYY to a proper date for comparison
  return {
    [Op.and]: [
      sequelize.literal(
        `TO_DATE("EventReportPilot"."data"->>'startDate', 'MM/DD/YYYY') >= ${sequelize.escape(converted)}::date`,
      ),
    ],
  };
}

export function withinStartDates(dates) {
  const splitDates = dates[0].split('-');
  if (splitDates.length !== 2) {
    return {};
  }
  const startDate = toIsoFormat(splitDates[0]);
  const endDate = toIsoFormat(splitDates[1]);
  if (!startDate || !endDate) {
    return {};
  }
  // Use TO_DATE to convert stored MM/DD/YYYY to a proper date for comparison
  return {
    [Op.and]: [
      sequelize.literal(
        `TO_DATE("EventReportPilot"."data"->>'startDate', 'MM/DD/YYYY') BETWEEN ${sequelize.escape(startDate)}::date AND ${sequelize.escape(endDate)}::date`,
      ),
    ],
  };
}
