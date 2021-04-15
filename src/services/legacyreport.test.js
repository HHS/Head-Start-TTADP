import reconcileLegacyReports,
{
  reconcileAuthors,
  reconcileCollaborators,
  reconcileApprovingManagers,
} from './legacyreports';
import db, { User, ActivityReport, ActivityReportCollaborator } from '../models';
import { REPORT_STATUSES } from '../constants';
import { activityReportByLegacyId } from './activityReports';

const report1 = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.DRAFT,
  regionId: 1,
  ECLKCResourcesUsed: ['test'],
  legacyId: 'legacy-1',
  imported: {
    manager: 'Manager4099@Test.Gov',
    createdBy: 'user4096@Test.gov',
    otherSpecialists: 'user4097@TEST.gov, user4098@test.gov',
  },
};

const report2 = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.DRAFT,
  regionId: 1,
  ECLKCResourcesUsed: ['test'],
  legacyId: 'legacy-2',
  imported: {
    manager: 'Manager4099@test.gov',
    createdBy: 'user4097@Test.gov',
    otherSpecialists: 'user4096@test.gov',
  },
};

const user1 = {
  id: 4096,
  homeRegionId: 1,
  name: 'user4096',
  hsesUsername: 'user4096',
  hsesUserId: '4096',
  email: 'user4096@test.gov',
};

const user2 = {
  id: 4097,
  homeRegionId: 1,
  name: 'user4097',
  hsesUsername: 'user4097',
  hsesUserId: '4097',
  email: 'user4097@test.gov',
};

const user3 = {
  id: 4098,
  homeRegionId: 1,
  name: 'user4098',
  hsesUsername: 'user4098',
  hsesUserId: '4098',
  email: 'user4098@test.gov',
};

const manager = {
  id: 4099,
  homeRegionId: 1,
  name: 'manager4099',
  hsesUsername: 'manager4099',
  hsesUserId: '4099',
  email: 'manager4099@test.gov',
};

describe('reconcile legacy reports', () => {
  let mockReport1;
  let mockReport2;
  let mockUser1;
  let mockUser2;
  let mockUser3;
  let mockManager;

  beforeAll(async () => {
    try {
      mockReport1 = await ActivityReport.create(report1);
      mockReport2 = await ActivityReport.create(report2);
      mockUser1 = await User.create(user1);
      mockUser2 = await User.create(user2);
      mockUser3 = await User.create(user3);
      mockManager = await User.create(manager);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`Unable to setup tests for legacy reports ${error}`);
    }
  });

  afterAll(async () => {
    await ActivityReportCollaborator.destroy({
      where: { activityReportId: [mockReport1.id, mockReport2.id] },
    });
    await ActivityReport.destroy({ where: { id: [mockReport1.id, mockReport2.id] } });
    await User.destroy({
      where: { id: [mockUser1.id, mockUser2.id, mockUser3.id, mockManager.id] },
    });
    await db.sequelize.close();
  });
  it('adds an author if there is one', async () => {
    await reconcileAuthors(mockReport1);
    const ret = await activityReportByLegacyId(report1.legacyId);
    expect(ret.userId).toBe(mockUser1.id);
  });
  it('adds an approvingManager if there is one', async () => {
    await reconcileApprovingManagers(mockReport1);
    const ret = await activityReportByLegacyId(report1.legacyId);
    expect(ret.approvingManagerId).toBe(manager.id);
  });
  it('adds collaborators', async () => {
    await reconcileCollaborators(mockReport1);
    const collaborators = await ActivityReportCollaborator.findAll({
      where: { activityReportId: mockReport1.id },
    });
    expect(collaborators.length).toBe(2);
  });
  it('tests the reconciliation process', async () => {
    await reconcileLegacyReports();
    const ret = await activityReportByLegacyId(report2.legacyId);
    expect(ret.userId).toBe(user2.id);
    expect(ret.approvingManagerId).toBe(manager.id);
    const collaborators = await ActivityReportCollaborator.findAll({
      where: { activityReportId: ret.id },
    });
    expect(collaborators.length).toBe(1);
  });
});
