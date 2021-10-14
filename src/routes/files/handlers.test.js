import { validate } from 'uuid';
import db, {
  File,
  ActivityReport,
  User,
} from '../../models';
import app from '../../app';
import { uploadFile, deleteFileFromS3, getPresignedURL } from '../../lib/s3';
import * as queue from '../../services/scanQueue';
import { REPORT_STATUSES, FILE_STATUSES } from '../../constants';
import ActivityReportPolicy from '../../policies/activityReport';
import * as Files from '../../services/files';
import { validateUserAuthForAdmin } from '../../services/accessValidation';

jest.mock('../../policies/activityReport');
jest.mock('../../services/accessValidation', () => ({
  validateUserAuthForAdmin: jest.fn().mockResolvedValue(false),
  validateUserAuthForAccess: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');

const ORIGINAL_ENV = process.env;

jest.mock('../../lib/s3');

const mockUser = {
  id: 2046,
  hsesUserId: '2046',
  hsesUsername: '2046',
  homeRegionId: 1,
};

const mockSession = jest.fn();
mockSession.userId = mockUser.id;
const mockAddToScanQueue = jest.spyOn(queue, 'default').mockImplementation(() => jest.fn());

const reportObject = {
  activityRecipientType: 'grantee',
  submissionStatus: REPORT_STATUSES.DRAFT,
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
    user = await User.create(mockUser);
    report = await ActivityReport.create(reportObject);
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'true';
    process.env.CURRENT_USER_ID = '2046';
  });
  afterAll(async () => {
    await File.destroy({ where: { activityReportId: report.dataValues.id } });
    await ActivityReport.destroy({ where: { id: report.dataValues.id } });
    await User.destroy({ where: { id: user.id } });
    process.env = ORIGINAL_ENV; // restore original env
    await db.sequelize.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Upload Handlers happy path', () => {
    beforeEach(() => {
      uploadFile.mockReset();
      getPresignedURL.mockReset();
    });
    it('tests a file upload', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      uploadFile.mockResolvedValue({ key: 'key' });
      const response = await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(200);
      fileId = response.body.id;
      expect(uploadFile).toHaveBeenCalled();
      expect(mockAddToScanQueue).toHaveBeenCalled();
      const file = await File.findOne({ where: { id: fileId } });
      const uuid = file.dataValues.key.slice(0, -4);
      expect(file.dataValues.id).toBe(fileId);
      expect(file.dataValues.status).not.toBe(null);
      expect(file.dataValues.originalFileName).toBe('testfile.pdf');
      expect(file.dataValues.activityReportId).toBe(report.dataValues.id);
      expect(validate(uuid)).toBe(true);
    });
    it('allows an admin to upload a file', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => false,
      }));
      validateUserAuthForAdmin.mockResolvedValue(true);
      uploadFile.mockResolvedValue({ key: 'key' });
      const response = await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(200);
      fileId = response.body.id;
      expect(uploadFile).toHaveBeenCalled();
      expect(mockAddToScanQueue).toHaveBeenCalled();
      const file = await File.findOne({ where: { id: fileId } });
      const uuid = file.dataValues.key.slice(0, -4);
      expect(file.dataValues.id).toBe(fileId);
      expect(file.dataValues.status).not.toBe(null);
      expect(file.dataValues.originalFileName).toBe('testfile.pdf');
      expect(file.dataValues.activityReportId).toBe(report.dataValues.id);
      expect(validate(uuid)).toBe(true);
    });
    it('tests an unauthorized delete', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => false,
      }));
      await request(app)
        .delete(`/api/files/${report.dataValues.id}/1`)
        .expect(403)
        .then(() => expect(deleteFileFromS3).not.toHaveBeenCalled());
    });
    it('tests an improper delete', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .delete(`/api/files/${report.dataValues.id}/`)
        .expect(400)
        .then(() => expect(deleteFileFromS3).not.toHaveBeenCalled());
    });
    it('deletes a file', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      const file = await File.create({
        activityReportId: report.dataValues.id,
        originalFileName: 'name',
        key: 'key',
        status: 'UPLOADING',
        fileSize: 0,
      });
      await request(app)
        .delete(`/api/files/${report.dataValues.id}/${file.id}`)
        .expect(204);
      expect(deleteFileFromS3).toHaveBeenCalledWith(file.dataValues.key);
      const noFile = await File.findOne({ where: { id: file.id } });
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
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(400, { error: 'reportId required' });
      await expect(uploadFile).not.toHaveBeenCalled();
    });
    it('tests a file upload without a file', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .expect(400, { error: 'file required' })
        .then(() => {
          expect(uploadFile).not.toHaveBeenCalled();
        });
    });
    it('tests an unauthorized upload', async () => {
      validateUserAuthForAdmin.mockResolvedValue(false);
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => false,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(403)
        .then(() => expect(uploadFile).not.toHaveBeenCalled());
    });
    it('tests an incorrect file type', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      uploadFile.mockResolvedValue({ key: 'key' });
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/test.txt`)
        .expect(400)
        .then((res) => {
          expect(res.text).toBe('Could not determine file type');
        });
    });
    it('tests a queuing failure', async () => {
      const updateStatus = jest.spyOn(Files, 'updateStatus');
      mockAddToScanQueue.mockImplementationOnce(() => Promise.reject());
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      uploadFile.mockResolvedValue({ key: 'key' });
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(200)
        .then(() => {
          expect(uploadFile).toHaveBeenCalled();
          expect(mockAddToScanQueue).toHaveBeenCalled();
          expect(updateStatus)
            .toHaveBeenCalledWith(expect.any(Number), FILE_STATUSES.QUEUEING_FAILED);
        });
    });
    it('tests an upload failure', async () => {
      const updateStatus = jest.spyOn(Files, 'updateStatus');
      uploadFile.mockImplementationOnce(() => Promise.reject());
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(500)
        .then(async () => {
          expect(uploadFile).toHaveBeenCalled();
          expect(updateStatus)
            .toHaveBeenCalledWith(expect.any(Number), FILE_STATUSES.UPLOAD_FAILED);
        });
    });
  });
});
