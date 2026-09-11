import type { Transaction } from 'sequelize';
import { sequelize } from '../models';
import approvalRateByDeadline from './approvalRateByDeadline';

// Execute the real widget SQL against an isolated temporary table, without loading
// model hooks or depending on seeded reports. Use the normal test database config.
jest.mock('../models', () => {
  const { Sequelize } = jest.requireActual('sequelize');
  const { test: config } = jest.requireActual('../../config/config');
  return { sequelize: new Sequelize(config.database, config.username, config.password, config) };
});

interface ReportFixture {
  id: number;
  regionId?: number;
  startDate?: string | null;
  endDate?: string | null;
  approvedAt?: string | null;
  timezone?: string | null;
  status?: string;
}

async function insertReports(reports: ReportFixture[]) {
  for (const report of reports) {
    await sequelize.query(
      `
    INSERT INTO "ActivityReports"
      (id, "regionId", "startDate", "endDate", "approvedAt", "approvedAtTimezone", "calculatedStatus")
    VALUES ($id, $regionId, $startDate, $endDate, $approvedAt, $timezone, $status)
  `,
      {
        bind: {
          regionId: 3,
          startDate: '2026-08-01',
          endDate: '2026-08-31',
          approvedAt: '2026-09-08T23:59:59.999999-04:00',
          timezone: 'America/New_York',
          status: 'approved',
          ...report,
        },
      }
    );
  }
}

describe('approvalRateByDeadline holiday deadlines', () => {
  let transaction: Transaction;
  let currentDate: string;

  beforeEach(async () => {
    currentDate = '2026-09-09';
    transaction = undefined;
    transaction = await sequelize.transaction();
    await sequelize.query(
      `
      CREATE TEMPORARY TABLE "ActivityReports" (
        id integer PRIMARY KEY,
        "regionId" integer,
        "startDate" date,
        "endDate" date,
        "approvedAt" timestamptz,
        "approvedAtTimezone" text,
        "calculatedStatus" text
      ) ON COMMIT DROP
    `,
      { transaction }
    );

    const query = sequelize.query.bind(sequelize);
    jest.spyOn(Date, 'now').mockImplementation(() => Date.parse(`${currentDate}T12:00:00Z`));
    jest.spyOn(sequelize, 'query').mockImplementation((sql, options) =>
      query(
        // PostgreSQL's clock is independent of Jest's clock. Freeze only CURRENT_DATE
        // and keep the rest of the production query, binds, and aggregation intact.
        sql.replaceAll('CURRENT_DATE', `DATE '${currentDate}'`),
        { ...options, transaction }
      )
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (transaction) {
      await transaction.rollback();
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('counts September 8 approvals through local end of day for both regional and national rates', async () => {
    await insertReports([
      { id: 1 },
      { id: 2, approvedAt: '2026-09-09T00:00:00-04:00' },
      { id: 3, regionId: 2 },
    ]);

    const result = await approvalRateByDeadline(null, { 'region.in': ['3'] });
    const august = result.records.find((record) => record.month_label === 'Aug 2026');

    expect(result.records).toHaveLength(12);
    expect(august).toMatchObject({
      national_pct: 66.7,
      national_total: 3,
      national_on_time: 2,
      regions: { 3: { pct: 50, total: 2, on_time: 1 } },
    });
    expect(Object.keys(august.regions)).toEqual(['3']);
  });

  it.each([
    ['America/New_York', '-04:00'],
    ['America/Los_Angeles', '-07:00'],
    ['Pacific/Honolulu', '-10:00'],
    ['Pacific/Guam', '+10:00'],
  ])('uses the recorded %s timezone at the deadline boundary', async (timezone, offset) => {
    await insertReports([
      { id: 1, timezone, approvedAt: `2026-09-08T23:59:59.999999${offset}` },
      { id: 2, timezone, approvedAt: `2026-09-09T00:00:00${offset}` },
    ]);

    const result = await approvalRateByDeadline(null, { 'region.in': ['3'] });
    expect(result.records.find((record) => record.month_label === 'Aug 2026').regions[3]).toEqual({
      pct: 50,
      total: 2,
      on_time: 1,
    });
  });

  it.each([
    ['2025-12-01', '2026-01-08', '2026-01-09', 'weekday New Year'],
    ['2026-06-01', '2026-07-08', '2026-07-09', 'Saturday Independence Day observed Friday'],
    ['2027-06-01', '2027-07-08', '2027-07-09', 'Sunday Independence Day observed Monday'],
    ['2022-12-01', '2023-01-09', '2023-01-10', 'Sunday New Year observed Monday'],
    ['2021-12-01', '2022-01-07', '2022-01-08', 'Saturday New Year observed in December'],
    ['2026-08-01', '2026-09-08', '2026-09-09', 'Labor Day on the seventh'],
    ['2025-08-01', '2025-09-08', '2025-09-09', 'Labor Day on the first'],
    ['2024-08-01', '2024-09-09', '2024-09-10', 'Labor Day on the second'],
    ['2026-03-01', '2026-04-07', '2026-04-08', 'month without an early holiday'],
  ])('sets the deadline for %s to %s (%s; %s)', async (serviceDate, deadline, nextDay) => {
    currentDate = nextDay;
    await insertReports(
      [
        {
          id: 1,
          startDate: serviceDate,
          endDate: serviceDate,
          approvedAt: `${deadline}T23:59:59Z`,
        },
        {
          id: 2,
          startDate: serviceDate,
          endDate: serviceDate,
          approvedAt: `${nextDay}T00:00:00Z`,
        },
      ].map((report) => ({ ...report, timezone: 'UTC' }))
    );

    const result = await approvalRateByDeadline(null, { 'region.in': ['3'] });
    const month = result.records.find((record) => record.national_total > 0);
    expect(month).toMatchObject({
      national_pct: 50,
      national_total: 2,
      national_on_time: 1,
      regions: { 3: { pct: 50, total: 2, on_time: 1 } },
    });
  });

  it('covers next-year deadlines and service months crossing the year boundary', async () => {
    currentDate = '2026-12-20';
    await insertReports([
      {
        id: 1,
        startDate: '2026-12-01',
        endDate: '2026-12-01',
        approvedAt: '2027-01-08T23:59:59-05:00',
      },
      {
        id: 2,
        startDate: '2026-12-01',
        endDate: '2026-12-01',
        approvedAt: '2027-01-09T00:00:00-05:00',
      },
    ]);
    let result = await approvalRateByDeadline(null, { 'region.in': ['3'] });
    expect(result.records.find((record) => record.month_label === 'Dec 2026').regions[3]).toEqual({
      pct: 50,
      total: 2,
      on_time: 1,
    });

    currentDate = '2027-01-09';
    result = await approvalRateByDeadline(null, { 'region.in': ['3'] });
    expect(result.records.find((record) => record.month_label === 'Dec 2026').regions[3]).toEqual({
      pct: 50,
      total: 2,
      on_time: 1,
    });
  });

  it('corrects historical rates for holidays in the previous year', async () => {
    currentDate = '2026-01-09';
    await insertReports([
      {
        id: 1,
        startDate: '2025-08-01',
        endDate: '2025-08-31',
        approvedAt: '2025-09-08T23:59:59-04:00',
      },
      {
        id: 2,
        startDate: '2025-08-01',
        endDate: '2025-08-31',
        approvedAt: '2025-09-09T00:00:00-04:00',
      },
    ]);

    const result = await approvalRateByDeadline(null, { 'region.in': ['3'] });
    expect(result.records.find((record) => record.month_label === 'Aug 2025').regions[3]).toEqual({
      pct: 50,
      total: 2,
      on_time: 1,
    });
  });

  it('preserves report eligibility, service-month fallback, and empty-month results', async () => {
    await insertReports([
      { id: 1, endDate: null },
      { id: 2, startDate: '2026-07-01' },
      { id: 3, timezone: null },
      { id: 4, approvedAt: null },
      { id: 5, status: 'submitted' },
      { id: 6, startDate: null, endDate: null },
      { id: 7, startDate: '2025-09-01', endDate: '2025-09-30' },
    ]);

    const result = await approvalRateByDeadline(null, { 'region.in': ['3', '2'] });
    const august = result.records.find((record) => record.month_label === 'Aug 2026');
    expect(august).toMatchObject({
      national_total: 2,
      national_on_time: 2,
      regions: {
        3: { pct: 100, total: 2, on_time: 2 },
        2: { pct: 0, total: 0, on_time: 0 },
      },
    });
    expect(result.records.find((record) => record.month_label === 'Jul 2026')).toMatchObject({
      national_pct: 0,
      national_total: 0,
      national_on_time: 0,
    });
  });

  it('returns no records without a valid requested region', async () => {
    expect(await approvalRateByDeadline(null, { 'region.in': ['invalid'] })).toEqual({
      records: [],
    });
    expect(await approvalRateByDeadline(null, {})).toEqual({ records: [] });
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
