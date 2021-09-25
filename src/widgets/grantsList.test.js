import db, {
  User, Grantee, Grant, ActivityReport, ActivityRecipient, NextStep,
} from '../models';
import determineFiltersToScopes from '../scopes';
import { REPORT_STATUSES } from '../constants';
import grantsList from './grantsList';

const GRANTEE_ID = 102370;
const GRANT_ID_ONE = 881037;
const GRANT_ID_TWO = 999812;
const GRANT_ID_THREE = 999825;

const mockUser = {
  id: 22938400,
  homeRegionId: 1,
  name: 'user22938400',
  hsesUsername: 'user22938400',
  hsesUserId: '22938400',
};

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
};

const submittedReport = {
  ...reportObject,
  status: REPORT_STATUSES.SUBMITTED,
  approvingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: [
    'Early Head Start (ages 0-3)',
    'Head Start (ages 3-5)',
    'EHS-CCP'],
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};

describe('Grant list widget', () => {
  beforeAll(async () => {
    await User.create(mockUser);
    await Grantee.create({ name: 'grantee', id: GRANTEE_ID });
    await Grant.bulkCreate([{
      id: GRANT_ID_ONE, number: GRANT_ID_ONE, granteeId: GRANTEE_ID, regionId: 8, status: 'Active', startDate: '01/15/2021', endDate: '01/20/2021',
    },
    {
      id: GRANT_ID_TWO, number: GRANT_ID_TWO, granteeId: GRANTEE_ID, regionId: 8, status: 'Inactive', startDate: '02/01/2021', endDate: '02/10/2021',
    },
    {
      id: GRANT_ID_THREE, number: GRANT_ID_THREE, granteeId: GRANTEE_ID, regionId: 7, status: 'Inactive', startDate: '03/05/2021', endDate: '03/15/2021',
    }]);

    const reportOne = await ActivityReport.create(submittedReport);
    await ActivityRecipient.create({
      activityReportId: reportOne.id,
      grantId: GRANT_ID_ONE,
      granteeId: GRANTEE_ID,
    });

    await ActivityRecipient.create({
      activityReportId: reportOne.id,
      grantId: GRANT_ID_TWO,
      granteeId: GRANTEE_ID,
    });
  });
  afterAll(async () => {
    const reports = await ActivityReport
      .findAll({ where: { userId: [mockUser.id] } });
    const ids = reports.map((report) => report.id);
    await NextStep.destroy({ where: { activityReportId: ids } });
    await ActivityRecipient.destroy({ where: { activityReportId: ids } });
    await ActivityReport.destroy({ where: { id: ids } });
    await User.destroy({ where: { id: [mockUser.id] } });
    await Grant.destroy({ where: { id: [GRANT_ID_ONE, GRANT_ID_TWO, GRANT_ID_THREE] } });
    await Grantee.destroy({ where: { id: GRANTEE_ID } });
    await db.sequelize.close();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('retrieves grants list for specified grantee', async () => {
    const query = { 'region.in': ['8'], 'grantee.in': [GRANTEE_ID], 'startDate.win': '2021/01/01-2021/02/28' };
    const scopes = determineFiltersToScopes('grantee', query);
    const res = await grantsList(scopes, query);

    // Grant 1.
    expect(res.length).toBe(2);
    expect(res[0].id).toBe(GRANT_ID_ONE);
    expect(res[0].status).toBe('Active');
    expect(res[0].regionId).toBe(8);

    // Grant 1 Program Types.
    expect(res[0].programTypes.length).toBe(3);
    expect(res[0].programTypes[0]).toBe('Early Head Start (ages 0-3)');
    expect(res[0].programTypes[1]).toBe('Head Start (ages 3-5)');
    expect(res[0].programTypes[2]).toBe('EHS-CCP');

    // Grant 2.
    expect(res[1].id).toBe(GRANT_ID_TWO);
    expect(res[1].status).toBe('Inactive');
    expect(res[1].regionId).toBe(8);

    // Grant 2 Program Types.
    expect(res[1].programTypes.length).toBe(3);
    expect(res[1].programTypes[0]).toBe('Early Head Start (ages 0-3)');
    expect(res[1].programTypes[1]).toBe('Head Start (ages 3-5)');
    expect(res[1].programTypes[2]).toBe('EHS-CCP');
  });
  it('does not retrieve grants list when outside of range and region', async () => {
    const query = { 'region.in': ['8'], 'grantee.in': [GRANTEE_ID], 'startDate.win': '2021/03/01-2021/03/31' };
    const scopes = determineFiltersToScopes('grantee', query);
    const res = await grantsList(scopes, query);
    expect(res.length).toBe(0);
  });
});
