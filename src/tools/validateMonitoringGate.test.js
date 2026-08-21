import { v4 as uuidv4 } from 'uuid';
import { VALIDATION_ALERT_SEVERITY, VALIDATION_PROCESS, VALIDATION_RUN_STATUS } from '../constants';
import {
  MonitoringFinding,
  MonitoringFindingLink,
  MonitoringFindingStatus,
  MonitoringFindingStatusLink,
  sequelize,
  ValidationAlert,
  ValidationRun,
} from '../models';
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

// This is a thread: one setup, then a sequence of steps that walk the gate from a
// recorded run through the critical verdict that pauses the import.
describe('validateMonitoringGate', () => {
  let firstResult;

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

  // PLACEHOLDER: open_ar_findings_gone is only smoke-covered here. Its SQL runs as
  // part of the gate and correctly emits nothing when there are no qualifying
  // open-AR citations (the seed DB has none, and this thread adds none). A
  // data-driven firing test needs the full open AR -> objective -> citation chain,
  // including the required Citations FK on ActivityReportObjectiveCitations; add
  // one when the final open_ar_findings_gone logic is settled.
  it('runs the open_ar_findings_gone check without firing on empty open-AR data', async () => {
    const alert = await ValidationAlert.findOne({
      where: { run_id: firstResult.runId, check_name: 'open_ar_findings_gone' },
    });
    expect(alert).toBeNull();
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
