import db, {
  User,
  Recipient,
  Grant,
  Region,
} from '../models';
import filtersToScopes from '../scopes';
import overview from './overview';
import { REPORT_STATUSES } from '../constants';
import { formatQuery } from '../routes/widgets/utils';
import { createReport, destroyReport } from '../testUtils';

const RECIPIENT_ID = 93898;
const RECIPIENT_TWO_ID = 93899;
const GRANT_ID_ONE = 93898;
const GRANT_ID_TWO = 93899;
const GRANT_ID_THREE = 93900;
const GRANT_ID_FOUR = 93901;
const USER_ID = 767876;
const REGION_ONE_ID = 1717;
const REGION_TWO_ID = 1818;

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
    { grantId: GRANT_ID_ONE },
    { grantId: GRANT_ID_TWO },
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

let regionTwoReport = {
  ...reportObject,
  numberOfParticipants: 8,
  regionId: REGION_TWO_ID,
  activityRecipients: [
    { grantId: GRANT_ID_TWO },
  ],
};

let reportWithNewDate = {
  ...reportObject,
  startDate: '2021-06-01T12:00:00Z',
  endDate: '2021-06-02T12:00:00Z',
  regionId: REGION_ONE_ID,
  deliveryMethod: 'method',
};

let regionOneReportOne;
let regionOneReportTwo;
let regionOneReportThree;
let regionOneReportFour;

describe('Dashboard overview widget', () => {
  beforeAll(async () => {
    let results = await User.create(mockUser);
    results = await Recipient.create({ name: 'recipient', id: RECIPIENT_ID });
    results = await Recipient.create({ name: 'recipient 2', id: RECIPIENT_TWO_ID });
    results = await Region.create({ name: 'office 1717', id: REGION_ONE_ID });
    results = await Region.create({ name: 'office 1818', id: REGION_TWO_ID });
    results = await Promise.all([
      Grant.create(
        {
          id: GRANT_ID_ONE,
          number: GRANT_ID_ONE,
          recipientId: RECIPIENT_ID,
          regionId: REGION_ONE_ID,
          status: 'Active',
          startDate: new Date('2021/01/01'),
          endDate: new Date('2022/01/02'),
        },
      ),
      Grant.create(
        {
          id: GRANT_ID_TWO,
          number: GRANT_ID_TWO,
          recipientId: RECIPIENT_ID,
          regionId: REGION_ONE_ID,
          status: 'Active',
          startDate: new Date('2021/06/01'),
          endDate: new Date('2022/06/02'),
        },
      ),
      Grant.create(
        {
          id: GRANT_ID_THREE,
          number: GRANT_ID_THREE,
          recipientId: RECIPIENT_ID,
          regionId: REGION_TWO_ID,
          status: 'Active',
          startDate: new Date('2021/01/01'),
          endDate: new Date('2022/01/02'),
        },
      ),
      Grant.create(
        {
          id: GRANT_ID_FOUR,
          number: GRANT_ID_FOUR,
          recipientId: RECIPIENT_TWO_ID,
          regionId: REGION_ONE_ID,
          status: 'Active',
          startDate: new Date('2021/01/01'),
          endDate: new Date('2022/01/02'),
        },
      )]);

    if (results.length) {
      regionOneReportOne = await createReport({ ...regionOneReport, duration: 1 });
      regionOneReportTwo = await createReport({ ...regionOneReport, duration: 2, deliveryMethod: 'In-person' });
      regionOneReportThree = await createReport({ ...regionOneReport, duration: 4 });
      regionOneReportFour = await createReport({ ...regionOneReport, duration: 5 });
      regionTwoReport = await createReport({ ...regionTwoReport, duration: 1.5 });
      reportWithNewDate = await createReport({ ...reportWithNewDate, duration: 6 });
    }
  });

  afterAll(async () => {
    await destroyReport(regionOneReportOne);
    await destroyReport(regionOneReportTwo);
    await destroyReport(regionOneReportThree);
    await destroyReport(regionOneReportFour);
    await destroyReport(regionTwoReport);
    await destroyReport(reportWithNewDate);

    await Grant.destroy({
      where:
      { id: [GRANT_ID_ONE, GRANT_ID_TWO, GRANT_ID_THREE, GRANT_ID_FOUR] },
    });
    await Recipient.destroy({ where: { id: [RECIPIENT_ID, RECIPIENT_TWO_ID] } });
    await Region.destroy({ where: { id: [REGION_ONE_ID, REGION_TWO_ID] } });
    await User.destroy({ where: { id: mockUser.id } });
    await db.sequelize.close();
  });

  it('retrieves data', async () => {
    const query = { 'region.in': [REGION_ONE_ID], 'startDate.win': '2021/01/01-2021/01/01' };
    const scopes = filtersToScopes(query);
    const data = await overview(scopes, formatQuery(query));

    expect(data.numReports).toBe('4');
    expect(data.numGrants).toBe('2');
    expect(data.inPerson).toBe('4.0');
    expect(data.sumDuration).toBe('12.0');
    expect(data.numParticipants).toBe('44');
    expect(data.numRecipients).toBe('1');
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
    expect(data.numRecipients).toBe('1');
    expect(data.totalRecipients).toBe('2');
    expect(data.recipientPercentage).toBe('50.00%');
  });

  it('accounts for different regions', async () => {
    const query = { 'region.in': [REGION_TWO_ID] };
    const scopes = filtersToScopes(query);
    const data = await overview(scopes, formatQuery(query));

    expect(data.numReports).toBe('1');
    expect(data.numGrants).toBe('1');
    expect(data.inPerson).toBe('1.0');
    expect(data.numParticipants).toBe('8');
    expect(data.sumDuration).toBe('1.5');
    expect(data.totalRecipients).toBe('1');
    expect(data.numRecipients).toBe('1');
    expect(data.recipientPercentage).toBe('100.00%');
  });
});
