import { validate } from 'uuid';
import waitFor from 'wait-for-expect';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  File,
  ActivityReport,
  ActivityReportFile,
  ObjectiveFile,
  User,
  Grant,
  Goal,
  Objective,
  Recipient,
} from '../../models';
import app from '../../app';
import { uploadFile, deleteFileFromS3, getPresignedURL } from '../../lib/s3';
import * as scanQueue from '../../services/scanQueue';
import { FILE_STATUSES } from '../../constants';
import ActivityReportPolicy from '../../policies/activityReport';
import ObjectivePolicy from '../../policies/objective';
import * as Files from '../../services/files';
import { validateUserAuthForAdmin } from '../../services/accessValidation';
import { generateRedisConfig } from '../../lib/queue';
// import { s3Queue } from '../../services/s3Queue';
import * as s3Queue from '../../services/s3Queue';

jest.mock('bull');
jest.mock('../../policies/activityReport');
jest.mock('../../policies/user');
jest.mock('../../policies/objective');
jest.mock('../../services/accessValidation', () => ({
  validateUserAuthForAdmin: jest.fn().mockResolvedValue(false),
  validateUserAuthForAccess: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');

const ORIGINAL_ENV = process.env;

jest.mock('../../lib/s3');
jest.mock('../../lib/queue');
jest.mock('../../services/s3Queue');

const mockUser = {
  id: 2046,
  hsesUserId: '2046',
  hsesUsername: '2046',
  homeRegionId: 1,
};

const mockSession = jest.fn();
mockSession.userId = mockUser.id;

const mockAddToScanQueue = jest.spyOn(scanQueue, 'default').mockImplementation(() => jest.fn());
jest.spyOn(s3Queue, 'addDeleteFileToQueue').mockImplementation(() => jest.fn());

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  resourcesUsed: 'test',
  regionId: 1,
};

const mockGrant = {
  id: 43259435,
  number: '99CH3499',
  regionId: 2,
  status: 'Active',
  startDate: new Date('2022-07-19T15:13:00.000Z'),
  endDate: new Date('2022-07-19T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  anualFundingMonth: 'October',
};

const goalObject = { name: 'sample goal for obj file' };
const objectiveObject = { title: 'sample obj for files' };

const mockRecipient = {
  id: 654925,
  name: 'Sample Obj File Recipient',
  recipientType: 'Community Action Agency (CAA)',
};

describe('File Upload', () => {
  let user;
  let report;
  let fileId;
  let goal;
  let objective;
  let secondTestObjective;
  let grant;
  let recipient;

  beforeAll(async () => {
    user = await User.create(mockUser);
    report = await ActivityReport.create(reportObject);
    recipient = await Recipient.create({ ...mockRecipient });
    grant = await Grant.create({ ...mockGrant, recipientId: recipient.id });
    goal = await Goal.create({ ...goalObject, grantId: grant.id });
    objective = await Objective.create(objectiveObject);
    secondTestObjective = await Objective.create({ title: 'objective for lonely file test' });

    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'true';
    process.env.CURRENT_USER_ID = '2046';

    generateRedisConfig.mockReturnValue({
      uri: 'redis://localhost:6379',
      tlsEnabled: false,
    });
  });
  afterAll(async () => {
    const files = await File.findAll({
      include: [
        {
          model: ActivityReportFile,
          as: 'activityReportFiles',
          required: true,
          where: { activityReportId: report.dataValues.id },
        },
      ],
    });

    const objectiveFiles = await File.findAll({
      include: [
        {
          model: ObjectiveFile,
          as: 'objectiveFiles',
          required: true,
          where: { objectiveId: [objective.dataValues.id, secondTestObjective.dataValues.id] },
        },
      ],
    });

    await Promise.all(files.map(async (file) => {
      ActivityReportFile.destroy({ where: { fileId: file.id } });
      File.destroy({ where: { id: file.id } });
    }));

    await Promise.all(objectiveFiles.map(async (objFile) => {
      ObjectiveFile.destroy({ where: { fileId: objFile.id } });
      File.destroy({ where: { id: objFile.id } });
    }));

    // cleanup any leftovers, like from the lonely file test
    const testFiles = await File.findAll({ where: { originalFileName: 'testfile.pdf' } });
    await Promise.all(
      [
        ObjectiveFile.destroy({
          where: {
            fileId: testFiles.map((file) => file.id),
          },
        }),
        ActivityReportFile.destroy({
          where: {
            fileId: testFiles.map((file) => file.id),
          },
        }),
      ],
    );
    await File.destroy({ where: { originalFileName: 'testfile.pdf' } });

    await ActivityReport.destroy({ where: { id: report.dataValues.id } });
    await Objective.destroy(
      {
        where: {
          id: [
            objective.dataValues.id, secondTestObjective.dataValues.id,
          ],
        },
      },
    );
    await Goal.destroy({ where: { id: goal.id } });
    await Grant.destroy({ where: { id: grant.id } });
    await Recipient.destroy({ where: { id: recipient.id } });
    await User.destroy({ where: { id: user.id } });
    process.env = ORIGINAL_ENV; // restore original env
    jest.clearAllMocks();
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
      let file;

      await waitFor(async () => {
        file = await File.findOne({ where: { id: fileId } });
        expect(file).not.toBeNull();
      });
      const uuid = file.dataValues.key.slice(0, -3);
      expect(file.dataValues.id).toBe(fileId);
      expect(file.dataValues.status).not.toBe(null);
      expect(file.dataValues.originalFileName).toBe('testfile.pdf');
      const arf = await ActivityReportFile.findOne({ where: { fileId } });
      expect(arf.activityReportId).toBe(report.dataValues.id);
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
      let file;

      await waitFor(async () => {
        file = await File.findOne({ where: { id: fileId } });
        expect(file).not.toBeNull();
      });

      const uuid = file.dataValues.key.slice(0, -3);
      expect(file.dataValues.id).toBe(fileId);
      expect(file.dataValues.status).not.toBe(null);
      expect(file.dataValues.originalFileName).toBe('testfile.pdf');
      const arf = await ActivityReportFile.findOne({ where: { fileId } });
      expect(arf.activityReportId).toBe(report.dataValues.id);
      expect(validate(uuid)).toBe(true);
    });
    it('tests an unauthorized delete', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => false,
      }));
      await request(app)
        .delete(`/api/files/r/${report.dataValues.id}/1`)
        .expect(403)
        .then(() => expect(deleteFileFromS3).not.toHaveBeenCalled());
    });
    it('tests an improper delete', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .delete(`/api/files/r/${report.dataValues.id}/`)
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
        .delete(`/api/files/r/${report.dataValues.id}/${file.id}`)
        .expect(204);
      expect(deleteFileFromS3).toHaveBeenCalledWith(file.dataValues.key);
      const noFile = await File.findOne({ where: { id: file.id } });
      expect(noFile).toBe(null);
    });

    it('tests a objective file upload', async () => {
      ObjectivePolicy.mockImplementation(() => ({
        canUpload: () => true,
      }));
      uploadFile.mockResolvedValue({ key: 'key' });
      let response;
      try {
        response = await request(app)
          .post('/api/files')
          .field('objectiveId', objective.dataValues.id)
          .attach('file', `${__dirname}/testfiles/testfile.pdf`)
          .expect(200);
      } catch (e) {
        //
      }
      fileId = response.body.id;
      expect(uploadFile).toHaveBeenCalled();
      expect(mockAddToScanQueue).toHaveBeenCalled();
      let file;

      await waitFor(async () => {
        file = await File.findOne({ where: { id: fileId } });
        expect(file).not.toBeNull();
      });
      const uuid = file.dataValues.key.slice(0, -3);
      expect(file.dataValues.id).toBe(fileId);
      expect(file.dataValues.status).not.toBe(null);
      expect(file.dataValues.originalFileName).toBe('testfile.pdf');
      const of = await ObjectiveFile.findOne({ where: { fileId } });
      expect(of.objectiveId).toBe(objective.dataValues.id);
      expect(validate(uuid)).toBe(true);
    });

    it('allows an admin to upload a objective file', async () => {
      ObjectivePolicy.mockImplementation(() => ({
        canUpload: () => false,
      }));
      validateUserAuthForAdmin.mockResolvedValue(true);
      uploadFile.mockResolvedValue({ key: 'key' });
      const response = await request(app)
        .post('/api/files')
        .field('objectiveId', objective.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(200);
      fileId = response.body.id;
      expect(uploadFile).toHaveBeenCalled();
      expect(mockAddToScanQueue).toHaveBeenCalled();
      let file;

      await waitFor(async () => {
        file = await File.findOne({ where: { id: fileId } });
        expect(file).not.toBeNull();
      });

      const uuid = file.dataValues.key.slice(0, -3);
      expect(file.dataValues.id).toBe(fileId);
      expect(file.dataValues.status).not.toBe(null);
      expect(file.dataValues.originalFileName).toBe('testfile.pdf');
      const of = await ObjectiveFile.findOne({ where: { fileId } });
      expect(of.objectiveId).toBe(objective.dataValues.id);
      expect(validate(uuid)).toBe(true);
    });

    it('deletes a objective file', async () => {
      ObjectivePolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      const file = await File.create({
        objectiveId: objective.dataValues.id,
        originalFileName: 'name',
        key: 'key',
        status: 'UPLOADING',
        fileSize: 0,
      });
      await request(app)
        .delete(`/api/files/o/${objective.dataValues.id}/${file.id}`)
        .expect(204);
      expect(deleteFileFromS3).toHaveBeenCalledWith(file.dataValues.key);
      const noFile = await File.findOne({ where: { id: file.id } });
      expect(noFile).toBe(null);
    });

    it('tests an unauthorized objective file delete', async () => {
      ObjectivePolicy.mockImplementation(() => ({
        canUpdate: () => false,
      }));
      await request(app)
        .delete(`/api/files/o/${objective.dataValues.id}/1`)
        .expect(403)
        .then(() => expect(deleteFileFromS3).not.toHaveBeenCalled());
    });
  });

  describe('File Upload Handlers error handling', () => {
    // eslint-disable-next-line jest/no-disabled-tests
    it('tests a file upload without a report id', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .post('/api/files')
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(400, { error: 'an id of either reportId, reportObjectiveId, objectiveId, or objectiveTempleteId is required' });
      await expect(uploadFile).not.toHaveBeenCalled();
    });
    it('tests a file upload without a file', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .expect(400, { error: 'file required' });
      await expect(uploadFile).not.toHaveBeenCalled();
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

    it('tests an unauthorized objective file upload', async () => {
      validateUserAuthForAdmin.mockResolvedValue(false);
      ObjectivePolicy.mockImplementation(() => ({
        canUpload: () => false,
      }));
      await request(app)
        .post('/api/files')
        .field('objectiveId', objective.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(403)
        .then(() => {
          expect(uploadFile).not.toHaveBeenCalled();
        });
    });

    it('tests an incorrect file type', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
      }));
      uploadFile.mockResolvedValue({ key: 'key' });
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/test.log`)
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
