import { Op } from 'sequelize';
import { sequelize } from '../../models';
import { dateInputForQuery } from '../utils';

type DateOperator = typeof Op.lte | typeof Op.gte;

function reportDeliveryDateSubquery(whereClauses: string[]) {
  return `(
    SELECT DISTINCT gc.id
    FROM "GrantCitations" gc
    JOIN "Citations" c
      ON c.id = gc."citationId"
    JOIN "DeliveredReviewCitations" drc
      ON drc."citationId" = c.id
    JOIN "DeliveredReviews" dr
      ON dr.id = drc."deliveredReviewId"
      AND dr."deletedAt" IS NULL
    JOIN "GrantDeliveredReviews" gdr
      ON gdr."deliveredReviewId" = dr.id
      AND gdr."grantId" = gc."grantId"
    WHERE ${whereClauses.join(' OR ')}
  )`;
}

function comparisonClauses(dates: string[], operator: DateOperator) {
  const boundary = operator === Op.lte ? 'end' : 'start';
  const sqlOperator = operator === Op.lte ? '<=' : '>=';

  return dates.reduce<string[]>((clauses, date) => {
    const queryDate = dateInputForQuery(date, boundary);
    if (!queryDate) {
      return clauses;
    }

    return [...clauses, `dr.report_delivery_date ${sqlOperator} ${sequelize.escape(queryDate)}`];
  }, []);
}

function rangeClauses(ranges: string[]) {
  return ranges.reduce<string[]>((clauses, range) => {
    if (typeof range !== 'string') {
      return clauses;
    }

    const [startDate, endDate] = range.split('-');
    if (!startDate || !endDate) {
      return clauses;
    }

    const startDateForQuery = dateInputForQuery(startDate, 'start');
    const endDateForQuery = dateInputForQuery(endDate, 'end');
    if (!startDateForQuery || !endDateForQuery) {
      return clauses;
    }

    return [
      ...clauses,
      `dr.report_delivery_date >= ${sequelize.escape(startDateForQuery)} AND dr.report_delivery_date <= ${sequelize.escape(endDateForQuery)}`,
    ];
  }, []);
}

function scopeFromClauses(whereClauses: string[]) {
  if (!whereClauses.length) {
    return { id: { [Op.in]: [] } };
  }

  return {
    id: {
      [Op.in]: sequelize.literal(reportDeliveryDateSubquery(whereClauses)),
    },
  };
}

export function beforeReportDeliveryDate(dates: string[]) {
  return scopeFromClauses(comparisonClauses(dates, Op.lte));
}

export function afterReportDeliveryDate(dates: string[]) {
  return scopeFromClauses(comparisonClauses(dates, Op.gte));
}

export function withinReportDeliveryDates(dates: string[]) {
  return scopeFromClauses(rangeClauses(dates));
}
