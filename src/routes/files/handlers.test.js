import { validate } from 'uuid';
import db, {
  File,
  ActivityReport,
  User,
  Permission,
} from '../../models';
import app from '../../app';
import s3Uploader, { deleteFileFromS3 } from '../../lib/s3Uploader';
import * as queue from '../../services/queue';
import SCOPES from '../../middleware/scopeConstants';
import { REPORT_STATUSES } from '../../constants';
import ActivityReportPolicy from '../../policies/activityReport';

jest.mock('../../policies/activityReport');

const request = require('supertest');

const ORIGINAL_ENV = process.env;

jest.mock('../../lib/s3Uploader');

const mockUser = {
  id: 100,
  homeRegionId: 1,
  permissions: [
    {
      userId: 100,
      regionId: 5,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    },
    {
      userId: 100,
      regionId: 6,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    },
    {
      userId: 100,
      regionId: 14,
      scopeId: SCOPES.SITE_ACCESS,
    },
  ],
};

const mockSession = jest.fn();
mockSession.userId = mockUser.id;
const mockAddToScanQueue = jest.spyOn(queue, 'default').mockImplementation(() => jest.fn());

const reportObject = {
  activityRecipientType: 'grantee',
  status: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  resourcesUsed: 'test',
  regionId: 1,
};

describe('File Upload', () => {
  let user;
  let report;
  let fileId;
  beforeAll(async () => {
    user = await User.create(mockUser, { include: [{ model: Permission, as: 'permissions' }] });
    report = await ActivityReport.create(reportObject);
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'true';
    process.env.CURRENT_USER_ID = 100;
  });
  afterAll(async () => {
    await File.destroy({ where: {} });
    await ActivityReport.destroy({ where: { } });
    await User.destroy({ where: { id: user.id } });
    process.env = ORIGINAL_ENV; // restore original env
    db.sequelize.close();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('File Upload Handlers happy path', () => {
    beforeEach(() => {
      s3Uploader.mockReset();
    });
    it('tests a file upload', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .field('attachmentType', 'ATTACHMENT')
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(200)
        .then((res) => {
          fileId = res.body.id;
          expect(s3Uploader).toHaveBeenCalled();
        });
      expect(mockAddToScanQueue).toHaveBeenCalled();
    });
    it('checks the metadata was uploaded to the database', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      const file = await File.findOne({ where: { id: fileId } });
      const uuid = file.dataValues.key.slice(0, -4);
      expect(file.dataValues.id).toBe(fileId);
      expect(file.dataValues.status).not.toBe(null);
      expect(file.dataValues.originalFileName).toBe('testfile.pdf');
      expect(file.dataValues.activityReportId).toBe(report.dataValues.id);
      expect(validate(uuid)).toBe(true);
    });
    it('deletes a file', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      const file = await File.findOne({ where: { id: fileId } });
      await request(app)
        .delete(`/api/files/${fileId}`)
        .expect(204);
      expect(deleteFileFromS3).toHaveBeenCalledWith(file.dataValues.key);
      const noFile = await File.findOne({ where: { id: fileId } });
      expect(noFile).toBe(null);
    });
  });

  describe('File Upload Handlers error handling', () => {
    it('tests a file upload without a report id', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('attachmentType', 'ATTACHMENT')
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(400, { error: 'reportId required' })
        .then(() => expect(s3Uploader).not.toHaveBeenCalled());
    });
    it('tests a file upload without a file', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .field('attachmentType', 'ATTACHMENT')
        .expect(400, { error: 'file required' })
        .then(() => expect(s3Uploader).not.toHaveBeenCalled());
    });
    it('tests a file upload without a attachment', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(400, { error: 'attachmentType required' })
        .then(() => expect(s3Uploader).not.toHaveBeenCalled());
    });
    it('tests a file upload with an incorrect attachment value', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .field('attachmentType', 'FAKE')
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(400, { error: 'incorrect attachmentType. Wanted: ATTACHMENT or RESOURCE. Got: FAKE' })
        .then(() => expect(s3Uploader).not.toHaveBeenCalled());
    });
    it('tests an unauthorized upload', async () => {
      jest.clearAllMocks();
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => false,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .field('attachmentType', 'ATTACHMENT')
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(403)
        .then(() => expect(s3Uploader).not.toHaveBeenCalled());
    });
  });
});
