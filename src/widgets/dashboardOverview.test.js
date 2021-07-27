import db, {
  ActivityReport, ActivityRecipient, User, Grantee, NonGrantee, Grant, NextStep, Region,
} from '../models';
import { filtersToScopes } from '../scopes/activityReport';
import dashboardOverview from './dashboardOverview';
import { REPORT_STATUSES } from '../constants';
import { createOrUpdate } from '../services/activityReports';
import { formatQuery } from '../routes/widgets/utils';

const GRANTEE_ID = 30;
const GRANTEE_ID_TWO = 31;
const NON_GRANTEE_ID = 34;

const mockUser = {
  id: 1000,
  homeRegionId: 1,
  name: 'user1000',
  hsesUsername: 'user1000',
  hsesUserId: '1000',
};

const mockUserTwo = {
  id: 1002,
  homeRegionId: 1,
  name: 'user1002',
  hsesUserId: 1002,
  hsesUsername: 'Rex',
};

const mockUserThree = {
  id: 1003,
  homeRegionId: 1,
  name: 'user1003',
  hsesUserId: 1003,
  hsesUsername: 'Tex',
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
  deliveryMethod: 'in-person',
  duration: 1,
  endDate: '2021-01-01T12:00:00Z',
  startDate: '2021-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['technical-assistance'],
};

const regionOneReport = {
  ...reportObject,
  regionId: 17,
};

const regionTwoReport = {
  ...reportObject,
  regionId: 18,
  activityRecipients: [
    { activityRecipientId: GRANTEE_ID_TWO },
  ],
};

const reportWithNewDate = {
  ...reportObject,
  startDate: '2021-06-01T12:00:00Z',
  endDate: '2021-06-02T12:00:00Z',
  regionId: 17,
  deliveryMethod: 'method',
};

describe('Dashboard overview widget', () => {
  beforeAll(async () => {
    await User.findOrCreate({ where: mockUser });
    await Grantee.findOrCreate({ where: { name: 'grantee', id: GRANTEE_ID } });
    await Region.create({ name: 'office 17', id: 17 });
    await Region.create({ name: 'office 18', id: 18 });
    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID,
        number: '1',
        granteeId: GRANTEE_ID,
        regionId: 17,
        status: 'Active',
        startDate: new Date('2021/01/01'),
        endDate: new Date('2021/01/02'),
      },
    });
    await Grant.findOrCreate({
      where: {
        id: GRANTEE_ID_TWO,
        number: '2',
        granteeId: GRANTEE_ID,
        regionId: 17,
        status: 'Active',
        startDate: new Date('2021/01/01'),
        endDate: new Date('2021/01/02'),
      },
    });
    await NonGrantee.findOrCreate({ where: { id: NON_GRANTEE_ID, name: 'nonGrantee' } });

    const reportOne = await ActivityReport.findOne({ where: { duration: 1 } });
    await createOrUpdate(regionOneReport, reportOne);

    const reportTwo = await ActivityReport.findOne({ where: { duration: 2 } });
    await createOrUpdate({ ...regionOneReport, duration: 2, deliveryMethod: 'In-person' }, reportTwo);

    const reportFour = await ActivityReport.findOne({ where: { duration: 4 } });
    await createOrUpdate({ ...regionOneReport, duration: 4 }, reportFour);

    const reportFive = await ActivityReport.findOne({ where: { duration: 5 } });
    await createOrUpdate({ ...regionOneReport, duration: 5 }, reportFive);

    const reportOneR2 = await ActivityReport.findOne({ where: { duration: 1.5 } });
    await createOrUpdate({ ...regionTwoReport, duration: 1.5 }, reportOneR2);

    const newDateReport = await ActivityReport.findOne({ where: { duration: 6 } });
    await createOrUpdate({ ...reportWithNewDate, duration: 6 }, newDateReport);
  });

  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id, mockUserTwo.id, mockUserThree.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id, mockUserTwo.id] } });
    await NonGrantee.destroy({ where: { id: [GRANTEE_ID, NON_GRANTEE_ID] } });
    await Grant.destroy({
      where:
      { id: [GRANTEE_ID, GRANTEE_ID_TWO] },
    });
    await Grantee.destroy({
      where:
      { id: [GRANTEE_ID, GRANTEE_ID_TWO] },
    });
    await Region.destroy({ where: { id: 17 } });
    await Region.destroy({ where: { id: 18 } });
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves data', async () => {
    const query = { 'region.in': [17], 'startDate.win': '2021/01/01-2021/01/01' };
    const scopes = filtersToScopes(query);
    const data = await dashboardOverview(scopes, formatQuery(query));

    expect(data.numReports).toBe('4');
    expect(data.numGrants).toBe('2');
    expect(data.inPerson).toBe('4');
    expect(data.sumDuration).toBe('12.0');
    expect(data.nonGrantees).toBe('0');
  });

  it('accounts for different date ranges', async () => {
    const query = { 'region.in': [17], 'startDate.win': '2021/06/01-2021/06/02' };
    const scopes = filtersToScopes(query);
    const data = await dashboardOverview(scopes, formatQuery(query));

    expect(data.numReports).toBe('1');
    expect(data.numGrants).toBe('2');
    expect(data.inPerson).toBe('0');
    expect(data.sumDuration).toBe('6.0');
    expect(data.nonGrantees).toBe('0');
  });
  it('accounts for different regions', async () => {
    const query = { 'region.in': [18], 'startDate.win': '2021/01/01-2021/01/01' };
    const scopes = filtersToScopes(query);
    const data = await dashboardOverview(scopes, formatQuery(query));

    expect(data.numReports).toBe('1');
    expect(data.numGrants).toBe('1');
    expect(data.inPerson).toBe('1');
    expect(data.nonGrantees).toBe('0');
    expect(data.sumDuration).toBe('1.5');
  });
});
