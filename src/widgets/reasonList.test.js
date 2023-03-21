import db, {
  ActivityReport,
  User,
  Recipient,
  Grant,
  ActivityReportCollaborator,
  UserRole,
} from '../models';
import filtersToScopes from '../scopes';
import reasonList from './reasonList';
import { REPORT_STATUSES, REASONS } from '../constants';
import { createOrUpdate } from '../services/activityReports';
import { destroyReport } from '../testUtils';

const RECIPIENT_ID = 462034;
const GRANT_ID_ONE = 107863;
const GRANT_ID_TWO = 204628;

const mockUser = {
  id: 5426861,
  homeRegionId: 1,
  name: 'user5426861',
  hsesUsername: 'user5426861',
  hsesUserId: '54268610',
};

const reportObject = {
  activityRecipientType: 'recipient',
  approval: {
    submissionStatus: REPORT_STATUSES.SUBMITTED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
  },
  owner: { userId: mockUser.id },
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANT_ID_ONE },
    { activityRecipientId: GRANT_ID_TWO },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['technical-assistance'],
};

const regionOneReportA = {
  ...reportObject,
  regionId: 8,
  duration: 1,
  reason: ['Below Competitive Threshold (CLASS)'],
  startDate: '2021-01-01T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
};

const regionOneReportB = {
  ...reportObject,
  regionId: 8,
  duration: 2,
  reason: ['Below Competitive Threshold (CLASS)', 'Below Quality Threshold (CLASS)'],
  startDate: '2021-02-01T12:00:00Z',
  endDate: '2021-02-15T12:00:00Z',
};

const regionOneReportC = {
  ...reportObject,
  regionId: 8,
  duration: 3,
  reason: [
    'Below Competitive Threshold (CLASS)',
    'Below Quality Threshold (CLASS)',
    'Change in Scope',
    'Child Incidents',
    'Complaint',
    'COVID-19 response',
    'Full Enrollment',
    'New Recipient',
    'New Director or Management',
    'New Program Option',
    'New Staff / Turnover',
    'Ongoing Quality Improvement',
    'Planning/Coordination (also TTA Plan Agreement)',
    'School Readiness Goals',
  ],
  startDate: '2021-02-01T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
};

const regionOneReportD = {
  ...reportObject,
  regionId: 8,
  duration: 4,
  reason: ['Below Quality Threshold (CLASS)', 'Change in Scope', 'Child Incidents'],
  startDate: '2021-03-01T12:00:00Z',
  endDate: '2021-03-31T12:00:00Z',
};

const regionOneReportE = {
  ...reportObject,
  regionId: 8,
  duration: 5,
  reason: ['Below Quality Threshold (CLASS)'],
  startDate: '2021-04-01T12:00:00Z',
  endDate: '2021-04-30T12:00:00Z',
};

const regionTwoReportA = {
  ...reportObject,
  regionId: 2,
  duration: 6,
  reason: ['Below Competitive Threshold (CLASS)', 'Below Quality Threshold (CLASS)'],
  startDate: '2021-02-01T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
};

const regionOneDraftReport = {
  ...reportObject,
  regionId: 8,
  duration: 7,
  reason: ['Below Competitive Threshold (CLASS)', 'Below Quality Threshold (CLASS)'],
  startDate: '2021-02-01T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
  approval: {
    submissionStatus: REPORT_STATUSES.SUBMITTED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
  },
};

describe('Reason list widget', () => {
  beforeAll(async () => {
    await User.findOrCreate({ where: { ...mockUser } });
    await Recipient.findOrCreate({ where: { name: 'recipient', id: RECIPIENT_ID, uei: 'NNA5N2KHMGN2' } });
    await Grant.bulkCreate([{
      id: GRANT_ID_ONE, number: GRANT_ID_ONE, recipientId: RECIPIENT_ID, regionId: 3, status: 'Active',
    }, {
      id: GRANT_ID_TWO, number: GRANT_ID_TWO, recipientId: RECIPIENT_ID, regionId: 3, status: 'Active',
    }], { validate: true, individualHooks: true });

    const reportOne = await ActivityReport.findOne({ where: { duration: 1, reason: ['Below Competitive Threshold (CLASS)'] } });
    await createOrUpdate(regionOneReportA, reportOne);

    const reportTwo = await ActivityReport.findOne({ where: { duration: 2, reason: ['Below Competitive Threshold (CLASS)', 'Below Quality Threshold (CLASS)'] } });
    await createOrUpdate(regionOneReportB, reportTwo);

    const reportThree = await ActivityReport.findOne({ where: { duration: 3, reason: ['Below Competitive Threshold (CLASS)', 'Below Quality Threshold (CLASS)', 'Change in Scope'] } });
    await createOrUpdate(regionOneReportC, reportThree);

    const reportFour = await ActivityReport.findOne({ where: { duration: 4, reason: ['Below Quality Threshold (CLASS)', 'Change in Scope', 'Child Incidents'] } });
    await createOrUpdate(regionOneReportD, reportFour);

    const reportFive = await ActivityReport.findOne({ where: { duration: 5, reason: ['Below Quality Threshold (CLASS)'] } });
    await createOrUpdate(regionOneReportE, reportFive);

    const reportSix = await ActivityReport.findOne({ where: { duration: 6, reason: ['Below Competitive Threshold (CLASS)', 'Below Quality Threshold (CLASS)'] } });
    await createOrUpdate(regionTwoReportA, reportSix);

    const reportSeven = await ActivityReport.findOne({
      where: {
        duration: 7,
        reason: ['Below Competitive Threshold (CLASS)', 'Below Quality Threshold (CLASS)'],
        '$approval.submissionStatus$': REPORT_STATUSES.DRAFT,
      },
    });
    await createOrUpdate(regionOneDraftReport, reportSeven);
  });

  afterAll(async () => {
    const reports = await ActivityReport.findAll({
      include: [
        {
          model: ActivityReportCollaborator,
          as: 'owner',
          where: { userId: mockUser.id },
          required: true,
        },
      ],
    });

    // eslint-disable-next-line
    for await (const report of reports) {
      await destroyReport(report);
    }

    /* await User.destroy({ where: { id: [mockUser.id] }, individualHooks: true }); */
    await Grant.destroy({ where: { id: [GRANT_ID_ONE, GRANT_ID_TWO] }, individualHooks: true });
    await Recipient.destroy({ where: { id: RECIPIENT_ID }, individualHooks: true });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves reason list within small date range for specified region', async () => {
    const scopes = await filtersToScopes({ 'region.in': ['8'], 'startDate.win': '2021/01/01-2021/02/28' });
    const res = await reasonList(scopes);

    expect(res.length).toBe(17);
    expect(res[0].name).toBe('Below Competitive Threshold (CLASS)');
    expect(res[0].count).toBe(4);
    expect(res[1].name).toBe('Below Quality Threshold (CLASS)');
    expect(res[1].count).toBe(3);
    expect(res[2].name).toBe('Change in Scope');
    expect(res[2].count).toBe(1);
    expect(res[3].name).toBe('Child Incidents');
    expect(res[3].count).toBe(1);
  });

  it('retrieves reason list for longer date range for specified region', async () => {
    const scopes = await filtersToScopes({ 'region.in': ['8'], 'startDate.win': '2021/01/01-2021/03/31' });
    const res = await reasonList(scopes);

    expect(res.length).toBe(17);
    expect(res[0].name).toBe('Below Competitive Threshold (CLASS)');
    expect(res[0].count).toBe(4);
    expect(res[1].name).toBe('Below Quality Threshold (CLASS)');
    expect(res[1].count).toBe(4);
    expect(res[2].name).toBe('Change in Scope');
    expect(res[2].count).toBe(2);
  });

  it('retrieves reason list for later date range for specified region', async () => {
    const scopes = await filtersToScopes({ 'region.in': ['8'], 'startDate.win': '2021/03/01-2021/04/30' });
    const res = await reasonList(scopes);

    expect(res.length).toBe(17);
    expect(res[0].name).toBe('Below Quality Threshold (CLASS)');
    expect(res[0].count).toBe(2);
    expect(res[1].name).toBe('Change in Scope');
    expect(res[1].count).toBe(1);
    expect(res[2].name).toBe('Child Incidents');
    expect(res[2].count).toBe(1);
  });

  it('retreives reason list for longer date range for specified region', async () => {
    const scopes = await filtersToScopes({ 'region.in': ['8'], 'startDate.win': '2021/02/01-2021/04/30' });
    const res = await reasonList(scopes);

    expect(res.length).toBe(17);
    expect(res[0].name).toBe('Below Quality Threshold (CLASS)');
    expect(res[0].count).toBe(5);
    expect(res[1].name).toBe('Below Competitive Threshold (CLASS)');
    expect(res[1].count).toBe(3);
    expect(res[3].name).toBe('Child Incidents');
    expect(res[3].count).toBe(2);
    expect(res[2].name).toBe('Change in Scope');
    expect(res[2].count).toBe(2);
  });

  it('does not retrieve reason list outside of date range for specified region', async () => {
    let scopes = await filtersToScopes({ 'region.in': ['8'], 'startDate.win': '2020/01/01-2020/12/31' });
    let res = await reasonList(scopes);
    expect(res.length).toBe(17);
    REASONS.forEach((reason) => {
      expect(res.some((r) => r.name === reason)).toBe(true);
    });

    scopes = await filtersToScopes({ 'region.in': ['8'], 'startDate.win': '2021/05/01-2021/06/23' });

    res = await reasonList(scopes);
    expect(res.length).toBe(17);
    REASONS.forEach((reason) => {
      expect(res.some((r) => r.name === reason)).toBe(true);
    });
  });
});
