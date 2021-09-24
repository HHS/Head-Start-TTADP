import db, {
  ActivityReport, ActivityRecipient, User, Grantee, NonGrantee, Grant, NextStep, Region,
} from '../models';
import { filtersToScopes } from '../scopes/activityReport';
import reasonList from './reasonList';
import { REPORT_STATUSES } from '../constants';
import { createOrUpdate } from '../services/activityReports';

const GRANTEE_ID = 30;
const GRANTEE_ID_TWO = 31;

const mockUser = {
  id: 1001,
  homeRegionId: 1,
  name: 'user1001',
  hsesUsername: 'user1001',
  hsesUserId: '1001',
};

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANTEE_ID },
    { activityRecipientId: GRANTEE_ID_TWO },
  ],
  approvingManagerId: 1,
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['technical-assistance'],
};

const regionOneReportA = {
  ...reportObject,
  regionId: 1,
  duration: 1,
  reason: ['First Reason'],
  startDate: '2021-01-01T12:00:00Z',
  endDate: '2021-01-31T12:00:00Z',
};

const regionOneReportB = {
  ...reportObject,
  regionId: 1,
  duration: 2,
  reason: ['First Reason', 'Second Reason'],
  startDate: '2021-02-01T12:00:00Z',
  endDate: '2021-02-15T12:00:00Z',
};

const regionOneReportC = {
  ...reportObject,
  regionId: 1,
  duration: 3,
  reason: [
    'First Reason',
    'Second Reason',
    'Third Reason',
    'Fourth Reason',
    'Fifth Reason',
    'Sixth Reason',
    'Seventh Reason',
    'Eighth Reason',
    'Ninth Reason',
    'Tenth Reason',
    'Eleventh Reason',
    'Twelth Reason',
    'Thirteenth Reason',
    'Fourteenth Reason',
  ],
  startDate: '2021-02-01T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
};

const regionOneReportD = {
  ...reportObject,
  regionId: 1,
  duration: 4,
  reason: ['Second Reason', 'Third Reason', 'Fourth Reason'],
  startDate: '2021-03-01T12:00:00Z',
  endDate: '2021-03-31T12:00:00Z',
};

const regionOneReportE = {
  ...reportObject,
  regionId: 1,
  duration: 5,
  reason: ['Second Reason'],
  startDate: '2021-04-01T12:00:00Z',
  endDate: '2021-04-30T12:00:00Z',
};

const regionTwoReportA = {
  ...reportObject,
  regionId: 2,
  duration: 6,
  reason: ['First Reason', 'Second Reason'],
  startDate: '2021-02-01T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
};

const regionOneDraftReport = {
  ...reportObject,
  regionId: 1,
  duration: 7,
  reason: ['First Reason', 'Second Reason'],
  startDate: '2021-02-01T12:00:00Z',
  endDate: '2021-02-28T12:00:00Z',
  status: REPORT_STATUSES.DRAFT,
};

describe('Reason list widget', () => {
  beforeAll(async () => {
    await User.findOrCreate({ where: mockUser });
    await Grantee.findOrCreate({ where: { name: 'grantee', id: GRANTEE_ID } });
    await Region.create({ name: 'office 17', id: 17 });
    await Region.create({ name: 'office 18', id: 18 });
    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID, number: '1', granteeId: GRANTEE_ID, regionId: 17, status: 'Active',
      },
    });
    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID_TWO, number: '2', granteeId: GRANTEE_ID, regionId: 18, status: 'Active',
      },
    });
    await NonGrantee.findOrCreate({ where: { id: GRANTEE_ID, name: 'nonGrantee' } });

    const reportOne = await ActivityReport.findOne({ where: { duration: 1, reason: ['First Reason'] } });
    await createOrUpdate(regionOneReportA, reportOne);

    const reportTwo = await ActivityReport.findOne({ where: { duration: 2, reason: ['First Reason', 'Second Reason'] } });
    await createOrUpdate(regionOneReportB, reportTwo);

    const reportThree = await ActivityReport.findOne({ where: { duration: 3, reason: ['First Reason', 'Second Reason', 'Third Reason'] } });
    await createOrUpdate(regionOneReportC, reportThree);

    const reportFour = await ActivityReport.findOne({ where: { duration: 4, reason: ['Second Reason', 'Third Reason', 'Fourth Reason'] } });
    await createOrUpdate(regionOneReportD, reportFour);

    const reportFive = await ActivityReport.findOne({ where: { duration: 5, reason: ['Second Reason'] } });
    await createOrUpdate(regionOneReportE, reportFive);

    const reportSix = await ActivityReport.findOne({ where: { duration: 6, reason: ['First Reason', 'Second Reason'] } });
    await createOrUpdate(regionTwoReportA, reportSix);

    const reportSeven = await ActivityReport.findOne({ where: { duration: 7, reason: ['First Reason', 'Second Reason'], status: REPORT_STATUSES.DRAFT } });
    await createOrUpdate(regionOneDraftReport, reportSeven);
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id] } });
    await NonGrantee.destroy({ where: { id: GRANTEE_ID } });
    await Grant.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_TWO] } });
    await Grantee.destroy({ where: { id: [GRANTEE_ID, GRANTEE_ID_TWO] } });
    await Region.destroy({ where: { id: 17 } });
    await Region.destroy({ where: { id: 18 } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves reason list within small date range for specified region', async () => {
    const scopes = filtersToScopes({ 'region.in': ['1'], 'startDate.win': '2021/01/01-2021/02/28' });
    const res = await reasonList(scopes);

    expect(res.length).toBe(14);
    expect(res[0].name).toBe('First Reason');
    expect(res[0].count).toBe(3);
    expect(res[1].name).toBe('Second Reason');
    expect(res[1].count).toBe(2);
    expect(res[2].name).toBe('Eighth Reason');
    expect(res[2].count).toBe(1);
    expect(res[3].name).toBe('Eleventh Reason');
    expect(res[3].count).toBe(1);
  });

  it('retrieves reason list for longer date range for specified region', async () => {
    const scopes = filtersToScopes({ 'region.in': ['1'], 'startDate.win': '2021/01/01-2021/03/31' });
    const res = await reasonList(scopes);
    expect(res.length).toBe(14);
    expect(res[0].name).toBe('First Reason');
    expect(res[0].count).toBe(3);
    expect(res[1].name).toBe('Second Reason');
    expect(res[1].count).toBe(3);
    expect(res[2].name).toBe('Fourth Reason');
    expect(res[2].count).toBe(2);
  });

  it('retrieves reason list for later date range for specified region', async () => {
    const scopes = filtersToScopes({ 'region.in': ['1'], 'startDate.win': '2021/03/01-2021/04/30' });
    const res = await reasonList(scopes);
    expect(res.length).toBe(3);

    expect(res[0].name).toBe('Second Reason');
    expect(res[0].count).toBe(2);
    expect(res[1].name).toBe('Fourth Reason');
    expect(res[1].count).toBe(1);
    expect(res[2].name).toBe('Third Reason');
    expect(res[2].count).toBe(1);
  });

  it('retreives reason list for longer date range for specified region', async () => {
    const scopes = filtersToScopes({ 'region.in': ['1'], 'startDate.win': '2021/02/01-2021/04/30' });
    const res = await reasonList(scopes);
    expect(res.length).toBe(14);
    expect(res[0].name).toBe('Second Reason');
    expect(res[0].count).toBe(4);
    expect(res[1].name).toBe('First Reason');
    expect(res[1].count).toBe(2);
    expect(res[3].name).toBe('Third Reason');
    expect(res[3].count).toBe(2);
    expect(res[2].name).toBe('Fourth Reason');
    expect(res[2].count).toBe(2);
  });
  it('does not retrieve reason list outside of date range for specified region', async () => {
    let scopes = filtersToScopes({ 'region.in': ['1'], 'startDate.win': '2020/01/01-2020/12/31' });
    let res = await reasonList(scopes);
    expect(res.length).toBe(0);

    scopes = filtersToScopes({ 'region.in': ['1'], 'startDate.win': '2021/05/01-2021/06/23' });

    res = await reasonList(scopes);
    expect(res.length).toBe(0);
  });
});
