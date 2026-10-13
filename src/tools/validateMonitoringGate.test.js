import { REPORT_STATUSES } from '@ttahub/common';
import { v4 as uuidv4 } from 'uuid';
import {
  GOAL_STATUS,
  VALIDATION_ALERT_SEVERITY,
  VALIDATION_PROCESS,
  VALIDATION_RUN_STATUS,
} from '../constants';
import {
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
  Citation,
  MonitoringFinding,
  MonitoringFindingLink,
  MonitoringFindingStatus,
  MonitoringFindingStatusLink,
  Objective,
  sequelize,
  ValidationAlert,
  ValidationRun,
} from '../models';
import {
  createGoal,
  createGrant,
  createRegion,
  createReport,
  destroyGoal,
  destroyReport,
} from '../testUtils';
import validateMonitoringGate from './validateMonitoringGate';
import { resolveGateHalt } from './validation/gateHaltPolicy';

jest.mock('../logger');
// The gate resolves an import cycle for its run; give it a fixed one (the resolver
// itself is tested in monitoringImportCycle.test.js). Without this the test DB has
// no processed import and the run would have no data version.
jest.mock('./validation/monitoringImportCycle', () => ({
  getMonitoringImportCycle: jest.fn().mockResolvedValue({
    import_id: 95000,
    source_updated_at: new Date('2026-08-01T00:00:00.000Z'),
  }),
}));

// A status the seeded findings can reference. High id to avoid colliding with
// seed data (shared test database).
const FINDING_STATUS_ID = 91001;

const now = new Date();
const timestamps = {
  sourceCreatedAt: now,
  sourceUpdatedAt: now,
  sourceDeletedAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};
const linkTimestamps = { createdAt: now, updatedAt: now };

// 120 findings (> the check's 100-finding minimum-denominator guard), all
// source-deleted with no surviving row, so the fraction "gone" is 100% -
// unambiguously past any threshold the check might later be tuned to. The thread
// therefore asserts the gate MECHANISM end to end (check SQL -> critical severity
// -> run result -> alert row), not the specific 25%/50% numbers, so it stays
// green when the thresholds are tuned against real data.
const GONE_FINDING_IDS = Array.from({ length: 120 }, () => uuidv4());

// The first 20 (the open_ar_findings_gone min-denominator) get cited on an open
// AR below, so that check fires too: all 20 are gone, unambiguously past its 20%
// critical threshold, same reasoning as GONE_FINDING_IDS above.
const OPEN_AR_FINDING_IDS = GONE_FINDING_IDS.slice(0, 20);

// This is a thread: one setup, then a sequence of steps that walk the gate from a
// recorded run through the critical verdict that pauses the import.
describe('validateMonitoringGate', () => {
  let firstResult;
  let openReport;
  let openGoal;
  let openObjective;
  let openAro;
  let openCitation;

  beforeAll(async () => {
    await MonitoringFindingStatusLink.findOrCreate({
      where: { statusId: FINDING_STATUS_ID },
      defaults: linkTimestamps,
    });
    await MonitoringFindingStatus.findOrCreate({
      where: { statusId: FINDING_STATUS_ID },
      defaults: { statusId: FINDING_STATUS_ID, name: 'Active', ...timestamps },
    });
    await MonitoringFindingLink.bulkCreate(
      GONE_FINDING_IDS.map((findingId) => ({ findingId, ...linkTimestamps })),
      { ignoreDuplicates: true }
    );
    await MonitoringFinding.bulkCreate(
      GONE_FINDING_IDS.map((findingId) => ({
        findingId,
        statusId: FINDING_STATUS_ID,
        findingType: 'Deficiency',
        source: 'FA-1',
        name: 'Gate test finding',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
        // fully removed at the source, so no live row remains for this findingId
        sourceDeletedAt: now,
      }))
    );

    // open_ar_findings_gone: cite OPEN_AR_FINDING_IDS (already source-deleted
    // above) on an open (draft) Activity Report, so the check's join chain
    // (ActivityReportObjectiveCitations -> ActivityReportObjectives ->
    // ActivityReports) finds them and its MonitoringFindings liveness check
    // marks all 20 gone.
    //
    // Use a dedicated region rather than createGrant's shared default (id 10):
    // destroyReport's teardown deletes the region once nothing it can see still
    // references it, and under CI's parallel workers another suite can still be
    // using the shared default region at that moment, so deleting it would race.
    const openRegion = await createRegion({});
    const openGrant = await createGrant({ regionId: openRegion.id });
    openReport = await createReport({
      activityRecipients: [{ grantId: openGrant.id }],
      regionId: openGrant.regionId,
      calculatedStatus: REPORT_STATUSES.DRAFT,
    });
    openGoal = await createGoal({ grantId: openGrant.id, status: GOAL_STATUS.IN_PROGRESS });
    openObjective = await Objective.create({
      goalId: openGoal.id,
      title: 'Gate test open-AR objective',
      status: 'In Progress',
    });
    openAro = await ActivityReportObjective.create({
      activityReportId: openReport.id,
      objectiveId: openObjective.id,
    });
    openCitation = await Citation.create({
      mfid: Math.floor(Math.random() * 1_000_000_000),
      finding_uuid: uuidv4(),
      calculated_finding_type: 'Deficiency',
      reported_date: '2025-01-10',
      initial_report_delivery_date: '2025-01-10',
    });
    await ActivityReportObjectiveCitation.bulkCreate(
      OPEN_AR_FINDING_IDS.map((findingId) => ({
        activityReportObjectiveId: openAro.id,
        citationId: openCitation.id,
        citation: '1302.12(d)(1)',
        findingId,
        grantId: openGrant.id,
        grantNumber: openGrant.number,
        reviewName: 'Gate test open-AR review',
        standardId: 1,
        findingType: 'Deficiency',
        acro: 'DEF',
        name: 'Gate test open-AR citation',
        severity: 2,
        reportDeliveryDate: '2025-01-10',
        monitoringFindingStatusName: 'Active',
        createdAt: now,
        updatedAt: now,
      }))
    );
  });

  afterAll(async () => {
    const runIds = (
      await ValidationRun.findAll({
        where: { process_name: VALIDATION_PROCESS.MONITORING_GATE },
        attributes: ['id'],
        raw: true,
      })
    ).map((r) => r.id);
    await ValidationAlert.destroy({ where: { run_id: runIds }, force: true });
    await ValidationRun.destroy({ where: { id: runIds }, force: true });
    await MonitoringFinding.destroy({ where: { findingId: GONE_FINDING_IDS }, force: true });
    await MonitoringFindingLink.destroy({ where: { findingId: GONE_FINDING_IDS }, force: true });
    await MonitoringFindingStatus.destroy({ where: { statusId: FINDING_STATUS_ID }, force: true });
    await MonitoringFindingStatusLink.destroy({
      where: { statusId: FINDING_STATUS_ID },
      force: true,
    });

    await ActivityReportObjectiveCitation.destroy({
      where: { activityReportObjectiveId: openAro.id },
      force: true,
    });
    await ActivityReportObjective.destroy({ where: { id: openAro.id }, force: true });
    await Objective.destroy({
      where: { id: openObjective.id },
      force: true,
      individualHooks: true,
    });
    await destroyGoal(openGoal);
    await Citation.destroy({ where: { id: openCitation.id }, force: true });
    await destroyReport(openReport);

    await sequelize.close();
  });

  it('runs the gate and records a successful monitoring_gate run', async () => {
    firstResult = await validateMonitoringGate();

    const run = await ValidationRun.findByPk(firstResult.runId);
    expect(run.process_name).toBe(VALIDATION_PROCESS.MONITORING_GATE);
    expect(run.status).toBe(VALIDATION_RUN_STATUS.SUCCESS);
    expect(run.completed_at).not.toBeNull();
  });

  it('raises a critical alert when findings have been massively source-deleted', async () => {
    const alert = await ValidationAlert.findOne({
      where: { run_id: firstResult.runId, check_name: 'findings_mass_source_deletion' },
    });
    expect(alert).not.toBeNull();
    expect(alert.severity).toBe(VALIDATION_ALERT_SEVERITY.CRITICAL);
  });

  it('returns a critical verdict, which is what the halt policy acts on', async () => {
    // The runner only reports; the caller decides. validateMonitoringGateCLI feeds
    // this verdict to resolveGateHalt (below) to decide whether to exit nonzero and
    // block update_fact_tables.
    expect(firstResult.criticalCount).toBeGreaterThan(0);
    expect(firstResult.alerts.map((a) => a.check_name)).toContain('findings_mass_source_deletion');
  });

  it('is report-only by default, so the critical does not block the fact-table refresh', () => {
    // MONITORING_GATE_HALT_CHECKS unset -> the real critical is surfaced but not
    // enforced. See docs/monitoring-data-validation.md ("Enforcement controls").
    const decision = resolveGateHalt(firstResult.alerts, undefined);
    expect(decision.mode).toBe('none');
    expect(decision.shouldHalt).toBe(false);
    expect(decision.criticalChecks).toContain('findings_mass_source_deletion');
    expect(decision.haltingChecks).toEqual([]);
  });

  it('blocks when MONITORING_GATE_HALT_CHECKS opts the critical in', () => {
    // The exact check name halts, as does 'all' appearing anywhere in a list.
    expect(resolveGateHalt(firstResult.alerts, 'findings_mass_source_deletion').shouldHalt).toBe(
      true
    );
    expect(resolveGateHalt(firstResult.alerts, 'open_ar_findings_gone, all').mode).toBe('all');
  });

  it('raises a critical alert when findings cited on open ARs are gone from the import', async () => {
    // OPEN_AR_FINDING_IDS are cited on openReport (an open/draft AR) above, and are
    // among the source-deleted GONE_FINDING_IDS, so all 20 are "gone" - unambiguously
    // past the check's 20% critical threshold.
    const alert = await ValidationAlert.findOne({
      where: { run_id: firstResult.runId, check_name: 'open_ar_findings_gone' },
    });
    expect(alert).not.toBeNull();
    expect(alert.severity).toBe(VALIDATION_ALERT_SEVERITY.CRITICAL);
  });

  it('keeps only the latest run’s alerts when the gate runs again', async () => {
    const second = await validateMonitoringGate();
    expect(second.runId).not.toBe(firstResult.runId);

    // monitoringGateChecks deletes the process's prior alerts first, so the first
    // run's alerts are gone and only the new run's remain.
    const staleAlerts = await ValidationAlert.count({ where: { run_id: firstResult.runId } });
    expect(staleAlerts).toBe(0);

    const freshCritical = await ValidationAlert.count({
      where: { run_id: second.runId, severity: VALIDATION_ALERT_SEVERITY.CRITICAL },
    });
    expect(freshCritical).toBeGreaterThan(0);
  });
});
