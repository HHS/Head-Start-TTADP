import faker from 'faker';
import db, {
  ActivityReport,
  ActivityRecipient,
  User,
  Recipient,
  Grant,
  Region,
} from '../models';
import filtersToScopes from '../scopes';
import overview from './overview';
import { REPORT_STATUSES } from '../constants';
import { createOrUpdate } from '../services/activityReports';
import { formatQuery } from '../routes/widgets/utils';

const RECIPIENT_ID = faker.datatype.number();
const RECIPIENT_TWO_ID = faker.datatype.number();
const GRANT_ID_ONE = faker.datatype.number();
const GRANT_ID_TWO = faker.datatype.number();
const GRANT_ID_THREE = faker.datatype.number();
const USER_ID = faker.datatype.number();
const REGION_ONE_ID = faker.datatype.number(100);
const REGION_TWO_ID = faker.datatype.number(100);

const mockUser = {
  id: USER_ID,
  homeRegionId: 1,
  name: 'user11818461',
  hsesUsername: 'user11818461',
  hsesUserId: 'user11818461',
};

const reportObject = {
  activityRecipientType: 'recipient',
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
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['technical-assistance'],
};

const regionOneReport = {
  ...reportObject,
  regionId: REGION_ONE_ID,
};

const regionTwoReport = {
  ...reportObject,
  numberOfParticipants: 8,
  regionId: REGION_TWO_ID,
  activityRecipients: [
    { activityRecipientId: GRANT_ID_TWO },
  ],
};

const reportWithNewDate = {
  ...reportObject,
  startDate: '2021-06-01T12:00:00Z',
  endDate: '2021-06-02T12:00:00Z',
  regionId: REGION_ONE_ID,
  deliveryMethod: 'method',
};

describe('Dashboard overview widget', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Recipient.create({ name: 'recipient', id: RECIPIENT_ID });
    await Recipient.create({ name: 'recipient 2', id: RECIPIENT_TWO_ID });
    await Region.create({ name: 'office 1717', id: REGION_ONE_ID });
    await Region.create({ name: 'office 1818', id: REGION_TWO_ID });
    await Grant.bulkCreate([{
      id: GRANT_ID_ONE,
      number: GRANT_ID_ONE,
      recipientId: RECIPIENT_ID,
      regionId: REGION_ONE_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2022/01/02'),
    }, {
      id: GRANT_ID_TWO,
      number: GRANT_ID_TWO,
      recipientId: RECIPIENT_ID,
      regionId: REGION_ONE_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2022/01/02'),
    },
    {
      id: GRANT_ID_THREE,
      number: GRANT_ID_THREE,
      recipientId: RECIPIENT_ID,
      regionId: REGION_TWO_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2022/01/02'),
    },
    {
      id: RECIPIENT_TWO_ID,
      number: RECIPIENT_TWO_ID,
      recipientId: RECIPIENT_TWO_ID,
      regionId: REGION_ONE_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2022/01/02'),
    },
    ]);

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
    await Recipient.destroy({ where: { id: [RECIPIENT_ID, RECIPIENT_TWO_ID] } });
    await Region.destroy({ where: { id: [REGION_ONE_ID, REGION_TWO_ID] } });
    await db.sequelize.close();
  });

  it('retrieves data', async () => {
    const query = { 'region.in': [REGION_ONE_ID], 'startDate.win': '2021/01/01-2021/01/01' };
    const scopes = filtersToScopes(query);
    const data = await overview(scopes, formatQuery(query));

    expect(data.numReports).toBe('4');
    expect(data.numGrants).toBe('2');
    expect(data.numGrants).toBe('2');
    expect(data.numGrants).toBe('2');
    expect(data.inPerson).toBe('4.0');
    expect(data.sumDuration).toBe('12.0');
    expect(data.numParticipants).toBe('44');
    expect(data.totalRecipients).toBe('2');
    expect(data.recipientPercentage).toBe('50.00%');
  });

  it('accounts for different date ranges', async () => {
    const query = { 'region.in': [REGION_ONE_ID], 'startDate.win': '2021/06/01-2021/06/02' };
    const scopes = filtersToScopes(query);
    const data = await overview(scopes, formatQuery(query));

    expect(data.numReports).toBe('1');
    expect(data.numGrants).toBe('2');
    expect(data.inPerson).toBe('0');
    expect(data.sumDuration).toBe('6.0');
    expect(data.numParticipants).toBe('11');
    expect(data.totalRecipients).toBe('1');
    expect(data.recipientPercentage).toBe('100.00%');
  });

  it('accounts for different regions', async () => {
    const query = { 'region.in': [REGION_TWO_ID], 'startDate.win': '2021/01/01-2021/01/01' };
    const scopes = filtersToScopes(query);
    const data = await overview(scopes, formatQuery(query));

    expect(data.numReports).toBe('1');
    expect(data.numGrants).toBe('1');
    expect(data.inPerson).toBe('1.0');
    expect(data.numParticipants).toBe('8');
    expect(data.sumDuration).toBe('1.5');
    expect(data.totalRecipients).toBe('2');
    expect(data.recipientPercentage).toBe('50.00%');
  });
});
