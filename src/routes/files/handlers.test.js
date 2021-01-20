// import { validate } from 'uuid';
import db, {
  File,
  ActivityReport,
  User,
  Permission,
} from '../../models';
import app from '../../app';
// import * as S3Uploader from '../../lib/s3Uploader';
import * as handlers from './handlers';
import SCOPES from '../../middleware/scopeConstants';

const request = require('supertest');

const mockUser = {
  id: 100,
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
  // const mockS3Uploader = jest.spyOn(S3Uploader, 'default').mockReturnValue();
  const spyCreateFileMetaData = jest.spyOn(handlers, 'createFileMetaData');
  const spyUpdateStatus = jest.spyOn(handlers, 'updateStatus');
  let user;
  let report;
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
    await request(app)
      .post('/api/files')
      .field('reportId', report.dataValues.id)
      .attach('File', `${__dirname}/testfiles/testfile.pdf`)
      .expect(200);
    // expect(mockS3Uploader).toHaveBeenCalled();
    expect(spyCreateFileMetaData).toHaveBeenCalled();
    expect(spyUpdateStatus).toHaveBeenCalled();
  });
});
