import db, {
  ActivityReport, ActivityRecipient, User, Grantee, Grant, Region,
} from '../models';
import filtersToScopes from '../scopes';
import overview from './overview';
import { REPORT_STATUSES } from '../constants';
import { createOrUpdate } from '../services/activityReports';
import { formatQuery } from '../routes/widgets/utils';

const GRANTEE_ID = 84036;
const GRANT_ID_ONE = 109730;
const GRANT_ID_TWO = 276030;

const mockUser = {
  id: 11818461,
  homeRegionId: 1,
  name: 'user11818461',
  hsesUsername: 'user11818461',
  hsesUserId: 'user11818461',
};

const reportObject = {
  activityRecipientType: 'grantee',
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  activityRecipients: [
    { activityRecipientId: GRANT_ID_ONE },
    { activityRecipientId: GRANT_ID_TWO },
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
  regionId: 1717,
};

const regionTwoReport = {
  ...reportObject,
  numberOfParticipants: 8,
  regionId: 1818,
  activityRecipients: [
    { activityRecipientId: GRANT_ID_TWO },
  ],
};

const reportWithNewDate = {
  ...reportObject,
  startDate: '2021-06-01T12:00:00Z',
  endDate: '2021-06-02T12:00:00Z',
  regionId: 1717,
  deliveryMethod: 'method',
};

describe('Dashboard overview widget', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Grantee.create({ name: 'grantee', id: GRANTEE_ID });
    await Region.create({ name: 'office 1717', id: 1717 });
    await Region.create({ name: 'office 1818', id: 1818 });
    await Grant.bulkCreate([{
      id: GRANT_ID_ONE,
      number: GRANT_ID_ONE,
      granteeId: GRANTEE_ID,
      regionId: 1717,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2021/01/02'),
    }, {
      id: GRANT_ID_TWO,
      number: GRANT_ID_TWO,
      granteeId: GRANTEE_ID,
      regionId: 1717,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2021/01/02'),
    }]);

    await createOrUpdate({ ...regionOneReport, duration: 1 });
    await createOrUpdate({ ...regionOneReport, duration: 2, deliveryMethod: 'In-person' });
    await createOrUpdate({ ...regionOneReport, duration: 4 });
    await createOrUpdate({ ...regionOneReport, duration: 5 });
    await createOrUpdate({ ...regionTwoReport, duration: 1.5 });
    await createOrUpdate({ ...reportWithNewDate, duration: 6 });
  });

  afterAll(async () => {
    const reports = await ActivityReport.findAll({ where: { userId: mockUser.id } });
    const ids = reports.map((report) => report.id);
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: mockUser.id } });
    await Grant.destroy({
      where:
      { id: [GRANT_ID_ONE, GRANT_ID_TWO] },
    });
    await Grantee.destroy({ where: { id: GRANTEE_ID } });
    await Region.destroy({ where: { id: [1717, 1818] } });
    await db.sequelize.close();
  });

  it('retrieves data', async () => {
    const query = { 'region.in': [1717], 'startDate.win': '2021/01/01-2021/01/01' };
    const scopes = filtersToScopes(query);
    const data = await overview(scopes, formatQuery(query));

    expect(data.numReports).toBe('4');
    expect(data.numGrants).toBe('2');
    expect(data.inPerson).toBe('4');
    expect(data.sumDuration).toBe('12.0');
    expect(data.numParticipants).toBe('44');
  });

  it('accounts for different date ranges', async () => {
    const query = { 'region.in': [1717], 'startDate.win': '2021/06/01-2021/06/02' };
    const scopes = filtersToScopes(query);
    const data = await overview(scopes, formatQuery(query));

    expect(data.numReports).toBe('1');
    expect(data.numGrants).toBe('2');
    expect(data.inPerson).toBe('0');
    expect(data.sumDuration).toBe('6.0');
    expect(data.numParticipants).toBe('11');
  });

  it('accounts for different regions', async () => {
    const query = { 'region.in': [1818], 'startDate.win': '2021/01/01-2021/01/01' };
    const scopes = filtersToScopes(query);
    const data = await overview(scopes, formatQuery(query));

    expect(data.numReports).toBe('1');
    expect(data.numGrants).toBe('1');
    expect(data.inPerson).toBe('1');
    expect(data.numParticipants).toBe('8');
    expect(data.sumDuration).toBe('1.5');
  });
});
