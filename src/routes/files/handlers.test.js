// import { validate } from 'uuid';
import db, {
  File,
  ActivityReport,
  User,
  Permission,
} from '../../models';
import app from '../../app';
import s3Uploader from '../../lib/s3Uploader';
import SCOPES from '../../middleware/scopeConstants';

const request = require('supertest');

jest.mock('../../lib/s3Uploader');

const mockUser = {
  id: 200,
  homeRegionId: 1,
  permissions: [
    {
      userId: 200,
      regionId: 5,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    },
    {
      userId: 200,
      regionId: 6,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    },
  ],
};

const mockSession = jest.fn();
mockSession.userId = mockUser.id;

const reportObject = {
  activityRecipientType: 'grantee',
  status: 'draft',
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  resourcesUsed: 'test',
};

describe('File Upload Handlers', () => {
  let user;
  let report;
  let fileId;
  beforeAll(async () => {
    user = await User.create(mockUser, { include: [{ model: Permission, as: 'permissions' }] });
    report = await ActivityReport.create(reportObject);
  });
  afterAll(async () => {
    await File.destroy({ where: {} });
    await ActivityReport.destroy({ where: { } });
    await User.destroy({ where: { id: user.id } });
    db.sequelize.close();
  });
  it('tests a file upload', async () => {
    fileId = await request(app)
      .post('/api/files')
      .field('reportId', report.dataValues.id)
      .attach('File', `${__dirname}/testfiles/testfile.pdf`)
      .expect(200)
      .then((res) => res.body.id);
    expect(s3Uploader.mock.calls.length).toBe(1);
  });
});
