import { Op } from 'sequelize';
import { v4 as uuid } from 'uuid';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../../constants';
import db from '../../models';
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
import activeDeficientCitationsWithTtaSupport from './activeDeficientCitationsWithTtaSupport';

const {
  Citation,
  GrantCitation,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
} = db;

describe('activeDeficientCitationsWithTtaSupport', () => {
  let region;
  let recipient;
  let grant;
  let user;
  let febReport;
  let aprReport;
  let goal;
  let objective;
  let aro;
  let aroCitation;
  let citationWithTta;
  let citationWithoutTta;
  let grantCitationWithTta;
  let grantCitationWithoutTta;

  const mockReport = ({ id, startDate, activityRecipients }) => ({
    getDataValue: (key) => {
      if (key === 'id') return id;
      if (key === 'startDate') return startDate;
      if (key === 'activityRecipients') return activityRecipients;
      return null;
    },
  });

  beforeAll(async () => {
    const userIdentifier = uuid();
    const citationMfidSeed = Math.floor(Math.random() * 1_000_000_000);
    const grantNumber = `19HP${citationMfidSeed}${Math.floor(Math.random() * 100)}`;

    region = await createRegion({ name: 'Monitoring Widget Region' });
    recipient = await createRecipient({ name: 'Monitoring Widget Recipient' });
    grant = await createGrant({
      recipientId: recipient.id,
      regionId: region.id,
      number: grantNumber,
      status: 'Active',
    });
    user = await createUser({
      homeRegionId: region.id,
      hsesUserId: `monitoring-widget-user-${userIdentifier}`,
      hsesUsername: `monitoring-widget-user-${userIdentifier}`,
      name: 'Monitoring Widget User',
      email: `monitoring-widget-user-${userIdentifier}@example.com`,
    });

    febReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      regionId: region.id,
      userId: user.id,
      startDate: '2025-02-10T12:00:00Z',
      endDate: '2025-02-10T13:00:00Z',
    });

    aprReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      regionId: region.id,
      userId: user.id,
      startDate: '2025-04-10T12:00:00Z',
      endDate: '2025-04-10T13:00:00Z',
    });

    goal = await createGoal({
      grantId: grant.id,
      status: GOAL_STATUS.IN_PROGRESS,
    });

    objective = await Objective.create({
      goalId: goal.id,
      title: 'Objective for monitoring widget',
      status: OBJECTIVE_STATUS.IN_PROGRESS,
    });

    aro = await ActivityReportObjective.create({
      activityReportId: febReport.id,
      objectiveId: objective.id,
    });

    citationWithTta = await Citation.create({
      mfid: citationMfidSeed,
      finding_uuid: uuid(),
      calculated_finding_type: 'Deficiency',
      reported_date: '2025-01-10',
      initial_report_delivery_date: '2025-01-10',
      active_through: '2025-03-31',
    });

    citationWithoutTta = await Citation.create({
      mfid: citationMfidSeed + 1,
      finding_uuid: uuid(),
      calculated_finding_type: 'Deficiency',
      reported_date: '2025-01-15',
      initial_report_delivery_date: '2025-01-15',
      active_through: '2025-02-28',
    });

    grantCitationWithTta = await GrantCitation.create({
      grantId: grant.id,
      citationId: citationWithTta.id,
      region_id: region.id,
      recipient_id: recipient.id,
      recipient_name: recipient.name,
    });

    grantCitationWithoutTta = await GrantCitation.create({
      grantId: grant.id,
      citationId: citationWithoutTta.id,
      region_id: region.id,
      recipient_id: recipient.id,
      recipient_name: recipient.name,
    });

    aroCitation = await ActivityReportObjectiveCitation.create({
      activityReportObjectiveId: aro.id,
      citationId: citationWithTta.id,
      citation: '1302.12(d)(1)',
      monitoringReferences: [
        {
          findingId: citationWithTta.finding_uuid,
          grantId: grant.id,
          grantNumber: grant.number,
          reviewName: 'Monitoring Widget Review',
          citation: '1302.12(d)(1)',
          findingType: 'Deficiency',
          findingSource: 'Monitoring',
        },
      ],
      findingId: citationWithTta.finding_uuid,
      grantId: grant.id,
      grantNumber: grant.number,
      reviewName: 'Monitoring Widget Review',
      findingType: 'Deficiency',
      findingSource: 'Monitoring',
      standardId: 1,
      acro: 'DEF',
      name: 'Monitoring Widget Citation',
      severity: 2,
      reportDeliveryDate: '2025-01-10',
      monitoringFindingStatusName: 'Open',
    });
  });

  afterAll(async () => {
    if (aroCitation?.id) {
      await ActivityReportObjectiveCitation.destroy({
        where: { id: aroCitation.id },
        force: true,
      });
    }
    if (aro?.id) {
      await ActivityReportObjective.destroy({
        where: { id: aro.id },
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
    if (grantCitationWithTta?.id || grantCitationWithoutTta?.id) {
      await GrantCitation.destroy({
        where: { id: [grantCitationWithTta?.id, grantCitationWithoutTta?.id].filter(Boolean) },
        force: true,
      });
    }
    if (citationWithTta?.id || citationWithoutTta?.id) {
      await Citation.destroy({
        where: { id: [citationWithTta?.id, citationWithoutTta?.id].filter(Boolean) },
        force: true,
      });
    }
    if (goal) {
      await destroyGoal(goal);
    }
    await Promise.all(
      [febReport, aprReport].filter(Boolean).map((report) => destroyReport(report))
    );
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns empty traces when no approved reports exist and enforces non-null startDate in query', async () => {
    const findAllSpy = jest.spyOn(db.ActivityReport, 'findAll').mockResolvedValue([]);
    const querySpy = jest.spyOn(db.sequelize, 'query');

    const data = await activeDeficientCitationsWithTtaSupport({ activityReport: [] });
    const findAllQuery = findAllSpy.mock.calls[0][0];

    expect(querySpy).not.toHaveBeenCalled();
    expect(findAllQuery.where[Op.and]).toEqual(
      expect.arrayContaining([{ startDate: { [Op.not]: null } }])
    );
    const [activityRecipientsInclude] = findAllQuery.include;
    const [grantInclude] = activityRecipientsInclude.include;
    const [grantCitationsInclude] = grantInclude.include;

    expect(activityRecipientsInclude.required).toBe(true);
    expect(grantInclude.required).toBe(true);
    expect(grantCitationsInclude.required).toBe(true);
    expect(grantInclude.as).toBe('grant');
    expect(grantCitationsInclude.as).toBe('grantCitations');
    expect(data).toEqual([
      {
        name: 'Active deficiencies with TTA support',
        x: [],
        y: [],
        month: [],
        id: 'active-deficiencies-with-tta-support',
        trace: 'circle',
      },
      {
        name: 'All active deficiencies',
        x: [],
        y: [],
        month: [],
        id: 'all-active-deficiencies',
        trace: 'triangle',
      },
    ]);
  });

  it('returns zero-filled traces when approved reports have no grant IDs', async () => {
    jest.spyOn(db.ActivityReport, 'findAll').mockResolvedValue([
      mockReport({
        id: 1002,
        startDate: '2025-01-15',
        activityRecipients: [],
      }),
      mockReport({
        id: 1003,
        startDate: '2025-02-02',
        activityRecipients: [],
      }),
    ]);
    const querySpy = jest.spyOn(db.sequelize, 'query');

    const data = await activeDeficientCitationsWithTtaSupport({ activityReport: [] });

    expect(querySpy).not.toHaveBeenCalled();
    expect(data).toEqual([
      {
        name: 'Active deficiencies with TTA support',
        x: ['Jan 2025', 'Feb 2025'],
        y: [0, 0],
        month: ['', ''],
        id: 'active-deficiencies-with-tta-support',
        trace: 'circle',
      },
      {
        name: 'All active deficiencies',
        x: ['Jan 2025', 'Feb 2025'],
        y: [0, 0],
        month: ['', ''],
        id: 'all-active-deficiencies',
        trace: 'triangle',
      },
    ]);
  });

  it('creates the monthly query range from approved report start dates', async () => {
    const querySpy = jest.spyOn(db.sequelize, 'query').mockResolvedValue([
      {
        month_start: '2025-01-01',
        deficiencies_with_tta: 1,
        total_active_deficiencies: 2,
      },
      {
        month_start: '2025-02-01',
        deficiencies_with_tta: 0,
        total_active_deficiencies: 1,
      },
      {
        month_start: '2025-03-01',
        deficiencies_with_tta: 1,
        total_active_deficiencies: 1,
      },
    ]);
    jest.spyOn(db.ActivityReport, 'findAll').mockResolvedValue([
      mockReport({
        id: 1004,
        startDate: '2025-01-10T00:00:00Z',
        activityRecipients: [{ grantId: grant.id }],
      }),
      mockReport({
        id: 1005,
        startDate: '2025-03-20T00:00:00Z',
        activityRecipients: [{ grantId: grant.id }],
      }),
    ]);

    const data = await activeDeficientCitationsWithTtaSupport({ activityReport: [] });
    const queryText = querySpy.mock.calls[0][0];
    const queryOptions = querySpy.mock.calls[0][1];

    expect(queryText).toContain('"ActivityReportObjectiveCitations"');
    expect(queryText).not.toContain('"ActivityReportObjectiveCitationLinks"');
    expect(queryText).not.toContain('"monitoringReferences"');
    expect(queryText).not.toContain('COALESCE(citation_match.id, aroc."citationId")');
    expect(queryText).not.toContain('aroc."citationId" IS NULL');
    expect(queryText).not.toContain('aroc."findingId"');
    expect(queryOptions.replacements.monthStarts).toEqual([
      '2025-01-01',
      '2025-02-01',
      '2025-03-01',
    ]);
    expect(data).toEqual([
      {
        name: 'Active deficiencies with TTA support',
        x: ['Jan 2025', 'Feb 2025', 'Mar 2025'],
        y: [1, 0, 1],
        month: ['', '', ''],
        id: 'active-deficiencies-with-tta-support',
        trace: 'circle',
      },
      {
        name: 'All active deficiencies',
        x: ['Jan 2025', 'Feb 2025', 'Mar 2025'],
        y: [2, 1, 1],
        month: ['', '', ''],
        id: 'all-active-deficiencies',
        trace: 'triangle',
      },
    ]);
  });

  it('queries real data and returns monthly counts', async () => {
    const scopes = {
      activityReport: [
        {
          regionId: region.id,
        },
        { userId: user.id },
        {
          startDate: {
            [Op.gte]: '2025-02-01',
            [Op.lte]: '2025-04-30',
          },
        },
      ],
    };

    const data = await activeDeficientCitationsWithTtaSupport(scopes);

    expect(data).toEqual([
      {
        name: 'Active deficiencies with TTA support',
        x: ['Feb 2025', 'Mar 2025', 'Apr 2025'],
        y: [1, 0, 0],
        month: ['', '', ''],
        id: 'active-deficiencies-with-tta-support',
        trace: 'circle',
      },
      {
        name: 'All active deficiencies',
        x: ['Feb 2025', 'Mar 2025', 'Apr 2025'],
        y: [2, 1, 0],
        month: ['', '', ''],
        id: 'all-active-deficiencies',
        trace: 'triangle',
      },
    ]);
  });
});
