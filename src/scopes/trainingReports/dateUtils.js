import moment from 'moment';
import { Op } from 'sequelize';
import { sequelize } from '../../models';

const INPUT_DATE_FORMATS = [
  'YYYY/MM/DD',
  'YYYY-MM-DD',
  'YYYY/M/D',
  'YYYY-M-D',
  'MM/DD/YYYY',
  'M/D/YYYY',
];

export function toIsoFormat(dateStr) {
  const parsed = moment(dateStr, INPUT_DATE_FORMATS, true);
  if (!parsed.isValid()) {
    return null;
  }

  return parsed.format('YYYY-MM-DD');
}

function toIsoRange(rangeValue) {
  if (typeof rangeValue !== 'string') {
    return null;
  }

  const value = rangeValue.trim();
  if (!value) {
    return null;
  }

  // We support "date-date" ranges where each side can itself contain dashes.
  const candidates = [];
  for (let i = 1; i < value.length; i += 1) {
    if (value[i] !== '-') {
      // eslint-disable-next-line no-continue
      continue;
    }

    const left = value.slice(0, i).trim();
    const right = value.slice(i + 1).trim();
    const startDate = toIsoFormat(left);
    const endDate = toIsoFormat(right);

    if (startDate && endDate) {
      candidates.push([startDate, endDate]);
    }
  }

  if (candidates.length !== 1) {
    return null;
  }

  return candidates[0];
}

function eventReportDateExpression(fieldName) {
  const path = `"EventReportPilot"."data"->>'${fieldName}'`;
  return `(
    CASE
      WHEN NULLIF(${path}, '') IS NULL THEN NULL
      WHEN ${path} ~ '^\\d{4}-\\d{1,2}-\\d{1,2}$'
        AND (
          to_char(to_date(${path}, 'YYYY-MM-DD'), 'YYYY-MM-DD') = ${path}
          OR to_char(to_date(${path}, 'YYYY-MM-DD'), 'YYYY-FMMM-FMDD') = ${path}
        ) THEN to_date(${path}, 'YYYY-MM-DD')
      WHEN ${path} ~ '^\\d{1,2}/\\d{1,2}/\\d{2}$'
        AND (
          to_char(to_date(${path}, 'MM/DD/YY'), 'MM/DD/YY') = ${path}
          OR to_char(to_date(${path}, 'MM/DD/YY'), 'FMMM/FMDD/YY') = ${path}
        ) THEN to_date(${path}, 'MM/DD/YY')
      WHEN ${path} ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$'
        AND (
          to_char(to_date(${path}, 'MM/DD/YYYY'), 'MM/DD/YYYY') = ${path}
          OR to_char(to_date(${path}, 'MM/DD/YYYY'), 'FMMM/FMDD/YYYY') = ${path}
        ) THEN to_date(${path}, 'MM/DD/YYYY')
      ELSE NULL
    END
  )`;
}

export function beforeDateScope(fieldName, date) {
  const converted = toIsoFormat(date[0]);
  if (!converted) {
    return {};
  }

  return {
    [Op.and]: [
      sequelize.literal(
        `${eventReportDateExpression(fieldName)} <= ${sequelize.escape(converted)}::date`
      ),
    ],
  };
}

export function afterDateScope(fieldName, date) {
  const converted = toIsoFormat(date[0]);
  if (!converted) {
    return {};
  }

  return {
    [Op.and]: [
      sequelize.literal(
        `${eventReportDateExpression(fieldName)} >= ${sequelize.escape(converted)}::date`
      ),
    ],
  };
}

export function withinDateScope(fieldName, dates) {
  const [startDate, endDate] = toIsoRange(dates[0]) || [];
  if (!startDate || !endDate) {
    return {};
  }

  return {
    [Op.and]: [
      sequelize.literal(
        `${eventReportDateExpression(fieldName)} BETWEEN ${sequelize.escape(startDate)}::date AND ${sequelize.escape(endDate)}::date`
      ),
    ],
  };
}
