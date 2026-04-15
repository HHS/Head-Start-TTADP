import { v4 as uuid } from 'uuid';
import { Op } from 'sequelize';
import reportCountByFindingCategory from './reportCountByFindingCategory';
import {
  createGoal,
  createGrant,
  createRecipient,
  createRegion,
  createReport,
  createUser,
  destroyGoal,
  destroyReport,
} from '../../testUtils';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../../constants';
import db from '../../models';

const {
  Citation,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
} = db;

describe('reportCountByFindingCategory', () => {
  let region;
  let recipient;
  let grant;
  let user;
  let janReport;
  let febReport;
  let goal;
  let objective;
  let janAro;
  let febAro;
  let fiscalCitation;
  let erseaCitation;
  let janFiscalAroc;
  let febFiscalAroc;
  let janErseaAroc;

  beforeAll(async () => {
    const userIdentifier = uuid();
    const citationMfidSeed = Math.floor(Math.random() * 1_000_000_000);
    const grantNumber = `19HP${citationMfidSeed}${Math.floor(Math.random() * 100)}`;

    region = await createRegion({ name: 'Report Count By Category Region' });
    recipient = await createRecipient({ name: 'Report Count By Category Recipient' });
    grant = await createGrant({
      recipientId: recipient.id,
      regionId: region.id,
      number: grantNumber,
      status: 'Active',
    });
    user = await createUser({
      homeRegionId: region.id,
      hsesUserId: `report-count-category-user-${userIdentifier}`,
      hsesUsername: `report-count-category-user-${userIdentifier}`,
      name: 'Report Count Category User',
      email: `report-count-category-user-${userIdentifier}@example.com`,
    });

    janReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      regionId: region.id,
      userId: user.id,
      startDate: '2025-01-10T12:00:00Z',
      endDate: '2025-01-10T13:00:00Z',
    });

    febReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      regionId: region.id,
      userId: user.id,
      startDate: '2025-02-10T12:00:00Z',
      endDate: '2025-02-10T13:00:00Z',
    });

    goal = await createGoal({
      grantId: grant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });

    objective = await Objective.create({
      goalId: goal.id,
      title: 'Objective for report count by finding category widget',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });

    janAro = await ActivityReportObjective.create({
      activityReportId: janReport.id,
      objectiveId: objective.id,
    });

    febAro = await ActivityReportObjective.create({
      activityReportId: febReport.id,
      objectiveId: objective.id,
    });

    fiscalCitation = await Citation.create({
      mfid: citationMfidSeed,
      finding_uuid: uuid(),
      calculated_finding_type: 'Deficiency',
      guidance_category: 'Fiscal',
      reported_date: '2025-01-10',
      initial_report_delivery_date: '2025-01-10',
      active_through: '2025-03-31',
    });

    erseaCitation = await Citation.create({
      mfid: citationMfidSeed + 1,
      finding_uuid: uuid(),
      calculated_finding_type: 'Deficiency',
      guidance_category: 'ERSEA',
      reported_date: '2025-01-10',
      initial_report_delivery_date: '2025-01-10',
      active_through: '2025-03-31',
    });

    janFiscalAroc = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: janAro.id,
      citationId: fiscalCitation.id,
      citation: '1302.12(d)(1)',
      monitoringReferences: [
        {
          findingId: fiscalCitation.finding_uuid,
          grantId: grant.id,
          grantNumber: grant.number,
          reviewName: 'Test Review',
          citation: '1302.12(d)(1)',
          findingType: 'Deficiency',
          findingSource: 'Monitoring',
        },
      ],
      findingId: fiscalCitation.finding_uuid,
      grantId: grant.id,
      grantNumber: grant.number,
      reviewName: 'Test Review',
      findingType: 'Deficiency',
      findingSource: 'Monitoring',
      standardId: 1,
      acro: 'DEF',
      name: 'Fiscal Citation',
      severity: 2,
      reportDeliveryDate: '2025-01-10',
      monitoringFindingStatusName: 'Open',
    });

    febFiscalAroc = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: febAro.id,
      citationId: fiscalCitation.id,
      citation: '1302.12(d)(1)',
      monitoringReferences: [
        {
          findingId: fiscalCitation.finding_uuid,
          grantId: grant.id,
          grantNumber: grant.number,
          reviewName: 'Test Review',
          citation: '1302.12(d)(1)',
          findingType: 'Deficiency',
          findingSource: 'Monitoring',
        },
      ],
      findingId: fiscalCitation.finding_uuid,
      grantId: grant.id,
      grantNumber: grant.number,
      reviewName: 'Test Review',
      findingType: 'Deficiency',
      findingSource: 'Monitoring',
      standardId: 1,
      acro: 'DEF',
      name: 'Fiscal Citation',
      severity: 2,
      reportDeliveryDate: '2025-02-10',
      monitoringFindingStatusName: 'Open',
    });

    janErseaAroc = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: janAro.id,
      citationId: erseaCitation.id,
      citation: '1302.14(b)',
      monitoringReferences: [
        {
          findingId: erseaCitation.finding_uuid,
          grantId: grant.id,
          grantNumber: grant.number,
          reviewName: 'Test Review',
          citation: '1302.14(b)',
          findingType: 'Deficiency',
          findingSource: 'Monitoring',
        },
      ],
      findingId: erseaCitation.finding_uuid,
      grantId: grant.id,
      grantNumber: grant.number,
      reviewName: 'Test Review',
      findingType: 'Deficiency',
      findingSource: 'Monitoring',
      standardId: 2,
      acro: 'ERSEA',
      name: 'ERSEA Citation',
      severity: 1,
      reportDeliveryDate: '2025-01-10',
      monitoringFindingStatusName: 'Open',
    });
  });

  afterAll(async () => {
    const arocIds = [janFiscalAroc?.id, febFiscalAroc?.id, janErseaAroc?.id].filter(Boolean);
    if (arocIds.length) {
      await ActivityReportObjectiveCitation.destroy({
        where: { id: arocIds },
        force: true,
      });
    }
    if (janAro?.id) {
      await ActivityReportObjective.destroy({
        where: { id: janAro.id },
        force: true,
        individualHooks: true,
      });
    }
    if (febAro?.id) {
      await ActivityReportObjective.destroy({
        where: { id: febAro.id },
        force: true,
        individualHooks: true,
      });
    }
    if (objective?.id) {
      await Objective.destroy({
        where: { id: objective.id },
        force: true,
        individualHooks: true,
      });
    }
    const citationIds = [fiscalCitation?.id, erseaCitation?.id].filter(Boolean);
    if (citationIds.length) {
      await Citation.destroy({
        where: { id: citationIds },
        force: true,
      });
    }
    if (goal) {
      await destroyGoal(goal);
    }
    await Promise.all(
      [janReport, febReport].filter(Boolean).map((report) => destroyReport(report)),
    );
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns empty array when no approved reports exist', async () => {
    jest.spyOn(db.ActivityReport, 'findAll').mockResolvedValue([]);
    const data = await reportCountByFindingCategory({ activityReport: [] });
    expect(data).toEqual([]);
  });

  it('aggregates report counts by guidance_category per month', async () => {
    jest.spyOn(db.ActivityReport, 'findAll').mockResolvedValue([
      { id: 101, startDate: '2025-01-10T00:00:00Z' },
      { id: 102, startDate: '2025-02-15T00:00:00Z' },
    ]);
    jest.spyOn(db.sequelize, 'query').mockResolvedValue([
      { guidance_category: 'Fiscal', month_start: '2025-01-01', report_count: 1 },
      { guidance_category: 'Fiscal', month_start: '2025-02-01', report_count: 1 },
      { guidance_category: 'ERSEA', month_start: '2025-01-01', report_count: 1 },
    ]);

    const data = await reportCountByFindingCategory({ activityReport: [] });

    const fiscal = data.find((d) => d.name === 'Fiscal');
    const ersea = data.find((d) => d.name === 'ERSEA');

    expect(fiscal).toEqual({ name: 'Fiscal', months: ['Jan 2025', 'Feb 2025'], counts: [1, 1] });
    expect(ersea).toEqual({ name: 'ERSEA', months: ['Jan 2025', 'Feb 2025'], counts: [1, 0] });
  });

  it('counts a duplicate reportId + category combination only once (via DB COUNT DISTINCT)', async () => {
    jest.spyOn(db.ActivityReport, 'findAll').mockResolvedValue([
      { id: 201, startDate: '2025-03-05T00:00:00Z' },
    ]);
    // DB already deduplicates via COUNT(DISTINCT ar.id)
    jest.spyOn(db.sequelize, 'query').mockResolvedValue([
      { guidance_category: 'Health', month_start: '2025-03-01', report_count: 1 },
    ]);

    const data = await reportCountByFindingCategory({ activityReport: [] });

    const health = data.find((d) => d.name === 'Health');
    expect(health).toEqual({ name: 'Health', months: ['Mar 2025'], counts: [1] });
  });

  it('fills in gap months with 0 count', async () => {
    jest.spyOn(db.ActivityReport, 'findAll').mockResolvedValue([
      { id: 301, startDate: '2025-01-10T00:00:00Z' },
      { id: 302, startDate: '2025-03-10T00:00:00Z' },
    ]);
    jest.spyOn(db.sequelize, 'query').mockResolvedValue([
      { guidance_category: 'Health', month_start: '2025-01-01', report_count: 1 },
      { guidance_category: 'Health', month_start: '2025-03-01', report_count: 1 },
    ]);

    const data = await reportCountByFindingCategory({ activityReport: [] });

    const health = data.find((d) => d.name === 'Health');
    expect(health).toEqual({ name: 'Health', months: ['Jan 2025', 'Feb 2025', 'Mar 2025'], counts: [1, 0, 1] });
  });

  it('groups citations with null guidance_category under "No finding category assigned"', async () => {
    jest.spyOn(db.ActivityReport, 'findAll').mockResolvedValue([
      { id: 401, startDate: '2025-04-10T00:00:00Z' },
    ]);
    // DB COALESCE maps NULL guidance_category to the label
    jest.spyOn(db.sequelize, 'query').mockResolvedValue([
      { guidance_category: 'No finding category assigned', month_start: '2025-04-01', report_count: 1 },
      { guidance_category: 'Fiscal', month_start: '2025-04-01', report_count: 1 },
    ]);

    const data = await reportCountByFindingCategory({ activityReport: [] });

    const noCategory = data.find((d) => d.name === 'No finding category assigned');
    const fiscal = data.find((d) => d.name === 'Fiscal');
    expect(noCategory).toEqual({ name: 'No finding category assigned', months: ['Apr 2025'], counts: [1] });
    expect(fiscal).toEqual({ name: 'Fiscal', months: ['Apr 2025'], counts: [1] });
  });

  it('queries real data and returns monthly counts by guidance_category', async () => {
    const scopes = {
      activityReport: [
        { regionId: region.id },
        { userId: user.id },
        {
          startDate: {
            [Op.gte]: '2025-01-01',
            [Op.lte]: '2025-02-28',
          },
        },
      ],
    };

    const data = await reportCountByFindingCategory(scopes);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const fiscal = data.find((d) => d.name === 'Fiscal');
    const ersea = data.find((d) => d.name === 'ERSEA');

    // Both categories should be present
    expect(fiscal).toBeDefined();
    expect(ersea).toBeDefined();

    // Both entries should span the same two months
    expect(fiscal.months).toEqual(['Jan 2025', 'Feb 2025']);
    expect(ersea.months).toEqual(['Jan 2025', 'Feb 2025']);

    // Fiscal: janReport (Jan) + febReport (Feb) each linked once
    expect(fiscal.counts).toEqual([1, 1]);

    // ERSEA: only janReport (Jan) linked, none in Feb
    expect(ersea.counts).toEqual([1, 0]);
  });
});
