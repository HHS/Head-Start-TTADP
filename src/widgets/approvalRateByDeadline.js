import { QueryTypes } from 'sequelize';
import { sequelize } from '../models';

const MONTHS_BACK = 11;

// Business rules:
// - Service month is based on report endDate/startDate.
// - Deadline is the 5th working day of the following month.
// - approvedAtTimezone is required to interpret approvedAt in the approver's timezone.
// - Regional series uses only requested regions; national series uses all regions.
const SQL = `
WITH params AS (
  SELECT
    date_trunc('month', CURRENT_DATE) - interval '1 month' * $monthsBack AS start_month,
    date_trunc('month', CURRENT_DATE) AS end_month
),
months AS (
  SELECT generate_series(
    (SELECT start_month FROM params),
    (SELECT end_month FROM params),
    interval '1 month'
  )::date AS month_start
),
regions AS (
  SELECT unnest($regionIds::int[]) AS region_id
),
reports AS (
  SELECT
    ar.id,
    ar."regionId" AS region_id,
    date_trunc('month', COALESCE(ar."endDate", ar."startDate"))::date AS service_month,
    ar."approvedAt" AS approved_at,
    ar."approvedAtTimezone" AS tz
  FROM "ActivityReports" ar, params
  WHERE ar."approvedAt" IS NOT NULL
    AND ar."approvedAtTimezone" IS NOT NULL
    AND ar."calculatedStatus" = 'approved'
    AND COALESCE(ar."endDate", ar."startDate") IS NOT NULL
    AND date_trunc('month', COALESCE(ar."endDate", ar."startDate")) >= params.start_month
    AND date_trunc('month', COALESCE(ar."endDate", ar."startDate")) <= params.end_month
),
reports_with_deadline AS (
  SELECT
    r.*,
    deadline.deadline_date,
    (r.approved_at AT TIME ZONE r.tz)::date AS approved_local_date,
    ((r.approved_at AT TIME ZONE r.tz)::date <= deadline.deadline_date) AS on_time
  FROM reports r
  CROSS JOIN LATERAL (
    SELECT (
      SELECT d::date
      FROM generate_series(
        (r.service_month + interval '1 month')::date,
        (r.service_month + interval '1 month')::date + interval '14 days',
        interval '1 day'
      ) d
      WHERE EXTRACT(ISODOW FROM d) <= 5
      ORDER BY d
      OFFSET 4
      LIMIT 1
    ) AS deadline_date
  ) AS deadline
),
region_agg AS (
  SELECT
    service_month AS month_start,
    region_id,
    count(*) AS total_reports,
    sum(CASE WHEN on_time THEN 1 ELSE 0 END)::int AS on_time_reports
  FROM reports_with_deadline
  WHERE region_id = ANY($regionIds)
  GROUP BY service_month, region_id
),
national_agg AS (
  SELECT
    service_month AS month_start,
    count(*) AS total_reports,
    sum(CASE WHEN on_time THEN 1 ELSE 0 END)::int AS on_time_reports
  FROM reports_with_deadline
  GROUP BY service_month
),
joined AS (
  SELECT
    m.month_start,
    rg.region_id,
    COALESCE(r.total_reports, 0) AS region_total,
    COALESCE(r.on_time_reports, 0) AS region_on_time,
    COALESCE(n.total_reports, 0) AS national_total,
    COALESCE(n.on_time_reports, 0) AS national_on_time
  FROM months m
  CROSS JOIN regions rg
  LEFT JOIN region_agg r ON r.month_start = m.month_start AND r.region_id = rg.region_id
  LEFT JOIN national_agg n ON n.month_start = m.month_start
)
SELECT
  month_start,
  to_char(month_start, 'Mon YYYY') AS month_label,
  region_id,
  CASE WHEN region_total > 0
    THEN round((region_on_time::numeric / region_total::numeric) * 100, 1)
    ELSE 0
  END AS region_pct,
  CASE WHEN national_total > 0
    THEN round((national_on_time::numeric / national_total::numeric) * 100, 1)
    ELSE 0
  END AS national_pct,
  region_total,
  region_on_time,
  national_total,
  national_on_time
FROM joined
ORDER BY month_start, region_id;
`;

export default async function approvalRateByDeadline(_scopes, query) {
  const regionIds = Array.isArray(query['region.in'])
    ? query['region.in'].map((regionId) => parseInt(regionId, 10)).filter((id) => !Number.isNaN(id))
    : [];

  if (!regionIds.length) {
    return { records: [] };
  }

  const rows = await sequelize.query(SQL, {
    type: QueryTypes.SELECT,
    bind: {
      monthsBack: MONTHS_BACK,
      regionIds,
    },
  });

  const recordsByMonth = new Map();
  rows.forEach((row) => {
    const key = row.month_label;
    if (!recordsByMonth.has(key)) {
      recordsByMonth.set(key, {
        month_start: row.month_start,
        month_label: row.month_label,
        national_pct: Number(row.national_pct),
        national_total: Number(row.national_total),
        national_on_time: Number(row.national_on_time),
        regions: {},
      });
    }
    const record = recordsByMonth.get(key);
    record.regions[row.region_id] = {
      pct: Number(row.region_pct),
      total: Number(row.region_total),
      on_time: Number(row.region_on_time),
    };
  });

  const records = Array.from(recordsByMonth.values());
  return { regions: regionIds, records };
}
