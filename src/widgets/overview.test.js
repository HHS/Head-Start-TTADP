import db, {
  ActivityReport, ActivityRecipient, User, Grantee, Grant, Region,
} from '../models';
import { filtersToScopes } from '../scopes/activityReport';
import { formatQuery } from '../routes/widgets/utils';
import overview from './overview';
import { REPORT_STATUSES } from '../constants';
import { createOrUpdate } from '../services/activityReports';

const GRANTEE_ID = 109762;
const GRANT_ID_ONE = 1195306;
const GRANT_ID_TWO = 2295306;

const mockUser = {
  id: 71646940,
  homeRegionId: 170,
  name: 'user71646940',
  hsesUsername: 'user71646940',
  hsesUserId: '71646940',
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
  numberOfParticipants: 11,
  deliveryMethod: 'method',
  duration: 1,
  endDate: '2020-09-16T12:00:00Z',
  startDate: '2020-09-15T12:00:00Z',
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
  regionId: 170,
};

const regionTwoReport = {
  ...reportObject,
  regionId: 2,
};

describe('Overview widget', () => {
  beforeAll(async () => {
    await Region.create({ name: 'office 170', id: 170 });
    await User.create(mockUser);
    await Grantee.create({ name: 'grantee', id: GRANTEE_ID });
    await Grant.bulkCreate([{
      id: GRANT_ID_ONE,
      number: GRANT_ID_ONE,
      granteeId: GRANTEE_ID,
      regionId: 170,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2021/01/02'),
    }, {
      id: GRANT_ID_TWO,
      number: GRANT_ID_TWO,
      granteeId: GRANTEE_ID,
      regionId: 170,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date('2021/01/02'),
    }]);
  });

  afterAll(async () => {
    const reports = await ActivityReport.findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Grant.destroy({ where: { id: [GRANT_ID_ONE, GRANT_ID_TWO] } });
    await Grantee.destroy({ where: { id: [GRANTEE_ID] } });
    await Region.destroy({ where: { id: 170 } });
    await db.sequelize.close();
  });

  it('retrieves data by region', async () => {
    await createOrUpdate({ ...regionOneReport, duration: 1 });
    await createOrUpdate({ ...regionOneReport, duration: 2 });
    await createOrUpdate({ ...regionOneReport, duration: 4, ttaType: ['training'] });
    await createOrUpdate({ ...regionOneReport, duration: 5, ttaType: ['training', 'technical-assistance'] });
    // Region two report that should not be returned
    await createOrUpdate({ ...regionTwoReport, duration: 1.5 });
    const query = { 'region.in': ['170'] };
    const scopes = filtersToScopes(query);
    const data = await overview(scopes, formatQuery(query));
    const {
      numReports,
      numGrants,
      numTotalGrants,
      numNonGrantees,
      numParticipants,
      sumDuration,
    } = data;
    expect(numReports).toBe('4');
    expect(numGrants).toBe('2');
    expect(numTotalGrants).toBe('2');
    expect(numNonGrantees).toBe('0');
    expect(numParticipants).toBe('44');
    expect(sumDuration).toBe('12.0');
  });
});
