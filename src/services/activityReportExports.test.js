import db, { ActivityReportGoal, ActivityReportObjective, Objective } from '../models';
import { createGoal, createReport, destroyGoal, destroyReport, getUniqueId } from '../testUtils';
import {
  EXPORT_DATA_SETS,
  ExportCapacityError,
  ExportRequestError,
  isValidDataSet,
  MAX_CONCURRENT_EXPORTS,
  MAX_EXPORT_REPORT_IDS,
  streamActivityReportExportCsv,
} from './activityReportExports';

const ALL_REGIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const NOOP_CALLBACKS = { onStart: () => {}, onChunk: () => {} };

// Drive the streamer and collect everything it emits.
const collect = async (options) => {
  const chunks = [];
  let outputName;
  const { rowCount } = await streamActivityReportExportCsv(options, {
    onStart: (meta) => {
      outputName = meta.outputName;
    },
    onChunk: (chunk) => {
      chunks.push(chunk);
    },
  });
  return { csv: chunks.join(''), rowCount, outputName };
};

describe('activityReportExports', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('isValidDataSet', () => {
    it('accepts the known data sets', () => {
      expect(isValidDataSet('activity-reports')).toBe(true);
      expect(isValidDataSet('goals')).toBe(true);
      expect(isValidDataSet('objectives')).toBe(true);
    });

    it('rejects unknown values and non-strings', () => {
      expect(isValidDataSet('reports')).toBe(false);
      expect(isValidDataSet('')).toBe(false);
      expect(isValidDataSet(undefined)).toBe(false);
      expect(isValidDataSet(3)).toBe(false);
    });
  });

  // All throw during validation, before any transaction opens.
  describe('request validation', () => {
    it('rejects an invalid dataSet with a 400 error', async () => {
      const promise = streamActivityReportExportCsv(
        { dataSet: 'bogus', reportIds: [1], regionIds: ALL_REGIONS },
        NOOP_CALLBACKS
      );
      await expect(promise).rejects.toBeInstanceOf(ExportRequestError);
      await expect(promise).rejects.toHaveProperty('statusCode', 400);
    });

    it('requires reportIds', async () => {
      await expect(
        streamActivityReportExportCsv(
          { dataSet: 'goals', reportIds: undefined, regionIds: ALL_REGIONS },
          NOOP_CALLBACKS
        )
      ).rejects.toThrow(/reportIds is required/);
    });

    it('rejects non-integer reportIds', async () => {
      await expect(
        streamActivityReportExportCsv(
          { dataSet: 'goals', reportIds: ['abc'], regionIds: ALL_REGIONS },
          NOOP_CALLBACKS
        )
      ).rejects.toThrow(/must be a list of integers/);
    });

    it('rejects more report ids than the export limit', async () => {
      const tooMany = Array.from({ length: MAX_EXPORT_REPORT_IDS + 1 }, (_, i) => i + 1);
      await expect(
        streamActivityReportExportCsv(
          { dataSet: 'goals', reportIds: tooMany, regionIds: ALL_REGIONS },
          NOOP_CALLBACKS
        )
      ).rejects.toThrow(new RegExp(`limited to ${MAX_EXPORT_REPORT_IDS} reports`));
    });

    it('rejects an unsupported sort column', async () => {
      await expect(
        streamActivityReportExportCsv(
          {
            dataSet: 'goals',
            reportIds: [1],
            regionIds: ALL_REGIONS,
            sortBy: 'not_a_column',
          },
          NOOP_CALLBACKS
        )
      ).rejects.toThrow(/Unsupported sort column/);
    });

    it('rejects an unsupported sort direction', async () => {
      await expect(
        streamActivityReportExportCsv(
          {
            dataSet: 'goals',
            reportIds: [1],
            regionIds: ALL_REGIONS,
            sortBy: 'region',
            direction: 'sideways',
          },
          NOOP_CALLBACKS
        )
      ).rejects.toThrow(/Unsupported sort direction/);
    });
  });

  // The concurrency cap bounds how many pooled connections exports can hold at
  // once. Hold MAX_CONCURRENT_EXPORTS exports open (parked in onStart, past the
  // slot reservation) and assert the next one is rejected, then let them finish.
  describe('concurrency cap', () => {
    it(`rejects a request beyond ${MAX_CONCURRENT_EXPORTS} concurrent exports with a 429`, async () => {
      const releases = [];
      const started = [];
      const inFlight = [];

      for (let i = 0; i < MAX_CONCURRENT_EXPORTS; i += 1) {
        let release;
        const blocked = new Promise((resolve) => {
          release = resolve;
        });
        releases.push(release);

        let markStarted;
        started.push(
          new Promise((resolve) => {
            markStarted = resolve;
          })
        );

        inFlight.push(
          streamActivityReportExportCsv(
            { dataSet: 'activity-reports', reportIds: [], regionIds: ALL_REGIONS },
            {
              onStart: () => {
                markStarted();
                return blocked; // hold the slot until we release it
              },
              onChunk: () => {},
            }
          )
        );
      }

      // Wait until all of them have reserved their slot.
      await Promise.all(started);

      const overflow = streamActivityReportExportCsv(
        { dataSet: 'activity-reports', reportIds: [], regionIds: ALL_REGIONS },
        NOOP_CALLBACKS
      );
      await expect(overflow).rejects.toBeInstanceOf(ExportCapacityError);
      await expect(overflow).rejects.toHaveProperty('statusCode', 429);

      // Release the held exports and let them complete cleanly.
      releases.forEach((release) => release());
      await Promise.all(inFlight);

      // The slots are freed again, so a fresh export succeeds.
      const { rowCount } = await collect({
        dataSet: 'activity-reports',
        reportIds: [],
        regionIds: ALL_REGIONS,
      });
      expect(rowCount).toBe(0);
    });
  });

  // An empty id set matches no reports, so the full pipeline runs and yields
  // zero rows.
  describe('streaming pipeline', () => {
    it.each(
      Object.keys(EXPORT_DATA_SETS)
    )('runs the %s export end to end for an empty id set', async (dataSet) => {
      const { rowCount, outputName, csv } = await collect({
        dataSet,
        reportIds: [],
        regionIds: ALL_REGIONS,
      });
      expect(rowCount).toBe(0);
      expect(outputName).toEqual(expect.any(String));
      expect(outputName.length).toBeGreaterThan(0);
      expect(csv).toBe('');
    });

    it('accepts a validated custom sort without error', async () => {
      const { rowCount } = await collect({
        dataSet: 'activity-reports',
        reportIds: [],
        regionIds: ALL_REGIONS,
        sortBy: 'start_date',
        direction: 'DESC',
      });
      expect(rowCount).toBe(0);
    });
  });

  // The AR export is one row per approved report, so a bare report exercises
  // real row output, the region guard, and id scoping.
  describe('streaming real rows (activity-reports)', () => {
    const REGION_ID = 20;
    let report;

    beforeAll(async () => {
      report = await createReport({
        regionId: REGION_ID,
        activityRecipients: [{ grantId: getUniqueId() }],
      });
    });

    afterAll(async () => {
      await destroyReport(report);
    });

    it('emits one CSV row for the in-scope report, with a BOM and header', async () => {
      const { csv, rowCount, outputName } = await collect({
        dataSet: 'activity-reports',
        reportIds: [report.id],
        regionIds: [REGION_ID],
      });
      expect(rowCount).toBe(1);
      expect(outputName).toBe('activity_report_export');
      expect(csv.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
      expect(csv).toContain('report_id'); // header
      expect(csv).toContain(`R${REGION_ID}-AR-${report.id}`);
    });

    it('excludes the report when its region is not permitted', async () => {
      const { rowCount } = await collect({
        dataSet: 'activity-reports',
        reportIds: [report.id],
        regionIds: [1],
      });
      expect(rowCount).toBe(0);
    });

    it('excludes reports outside the requested id set', async () => {
      const { rowCount } = await collect({
        dataSet: 'activity-reports',
        reportIds: [report.id + 90_000_000],
        regionIds: [REGION_ID],
      });
      expect(rowCount).toBe(0);
    });
  });

  // The goal and objective exports need the report to carry a goal (via
  // ActivityReportGoal) and an objective (via ActivityReportObjective), so build
  // the full chain: grant -> goal -> objective, linked to an approved report.
  describe('streaming real rows (goals and objectives)', () => {
    const REGION_ID = 20;
    const OBJECTIVE_TITLE = 'export objective marker title';
    let report;
    let goal;
    let objective;
    let aro;

    beforeAll(async () => {
      const grantId = getUniqueId();
      report = await createReport({
        regionId: REGION_ID,
        activityRecipients: [{ grantId }],
      });
      // Pass status explicitly: defaultGoal() in testUtils sets a bad (array) status.
      goal = await createGoal({ grantId, status: 'In Progress' });
      objective = await Objective.create({
        goalId: goal.id,
        title: OBJECTIVE_TITLE,
        status: 'Complete',
      });
      await ActivityReportGoal.create({
        activityReportId: report.id,
        goalId: goal.id,
        status: 'In Progress',
      });
      aro = await ActivityReportObjective.create({
        activityReportId: report.id,
        objectiveId: objective.id,
        title: OBJECTIVE_TITLE,
        ttaProvided: 'export tta text',
        status: 'Complete',
      });
    });

    afterAll(async () => {
      await ActivityReportObjective.destroy({ where: { id: aro.id }, force: true });
      await ActivityReportGoal.destroy({ where: { activityReportId: report.id }, force: true });
      await Objective.destroy({ where: { id: objective.id }, force: true });
      await destroyGoal(goal);
      await destroyReport(report);
    });

    it('emits the goal row for the in-scope report', async () => {
      const { csv, rowCount } = await collect({
        dataSet: 'goals',
        reportIds: [report.id],
        regionIds: [REGION_ID],
      });
      expect(rowCount).toBe(1);
      expect(csv).toContain('goal_id'); // header
      expect(csv).toContain(String(goal.id));
    });

    it('emits the objective row for the in-scope report', async () => {
      const { csv, rowCount } = await collect({
        dataSet: 'objectives',
        reportIds: [report.id],
        regionIds: [REGION_ID],
      });
      expect(rowCount).toBe(1);
      expect(csv).toContain('objective_id'); // header
      expect(csv).toContain(String(objective.id));
      expect(csv).toContain(OBJECTIVE_TITLE);
    });

    it('excludes goal and objective rows when the region is not permitted', async () => {
      const goals = await collect({ dataSet: 'goals', reportIds: [report.id], regionIds: [1] });
      const objectives = await collect({
        dataSet: 'objectives',
        reportIds: [report.id],
        regionIds: [1],
      });
      expect(goals.rowCount).toBe(0);
      expect(objectives.rowCount).toBe(0);
    });
  });
});
