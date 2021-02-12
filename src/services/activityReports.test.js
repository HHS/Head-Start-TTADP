import db, {
  ActivityReport, ActivityRecipient, User, Grantee, NonGrantee, Grant,
} from '../models';
import {
  createOrUpdate, activityReportById,
} from './activityReports';

const mockUser = {
  id: 1000,
  homeRegionId: 1,
  name: 'user',
};

const reportObject = {
  activityRecipientType: 'grantee',
  status: 'draft',
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  resourcesUsed: 'test',
  activityRecipients: [{ activityRecipientId: 100 }],
};

describe('Activity Reports DB service', () => {
  let grantee;

  beforeAll(async () => {
    await User.create(mockUser);
    grantee = await Grantee.create({ id: 100, name: 'grantee' });
    await Grant.create({ id: 100, number: 1, granteeId: grantee.id });
    await NonGrantee.create({ id: 100, name: 'nonGrantee' });
  });

  afterAll(async () => {
    await ActivityRecipient.destroy({ where: {} });
    await ActivityReport.destroy({ where: {} });
    await User.destroy({ where: { id: mockUser.id } });
    await NonGrantee.destroy({ where: { id: 100 } });
    await Grant.destroy({ where: { id: 100 } });
    await Grantee.destroy({ where: { id: 100 } });
    db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdate', () => {
    it('updates an already saved report', async () => {
      const report = await ActivityReport.create(reportObject);
      const newReport = await createOrUpdate({ resourcesUsed: 'updated' }, report);
      expect(newReport.resourcesUsed).toBe('updated');
    });

    it('creates a new report', async () => {
      const beginningARCount = await ActivityReport.count();
      const report = await createOrUpdate(reportObject);
      const endARCount = await ActivityReport.count();
      expect(endARCount - beginningARCount).toBe(1);
      expect(report.activityRecipients[0].grant.id).toBe(100);
    });

    it('creates a new report with non-grantee recipient', async () => {
      const report = await createOrUpdate({ ...reportObject, activityRecipientType: 'non-grantee' });
      expect(report.activityRecipients[0].nonGrantee.id).toBe(100);
    });

    it('handles reports with collaborators', async () => {
      const report = await createOrUpdate({
        ...reportObject,
        collaborators: [{ id: mockUser.id }],
      });
      expect(report.collaborators.length).toBe(1);
      expect(report.collaborators[0].name).toBe('user');
    });
  });

  describe('activityReportById', () => {
    it('retrieves an activity report', async () => {
      const report = await ActivityReport.create(reportObject);

      const foundReport = await activityReportById(report.id);
      expect(foundReport.id).toBe(report.id);
      expect(foundReport.resourcesUsed).toBe('test');
    });
  });
});
