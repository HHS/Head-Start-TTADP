import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  File,
  ActivityReport,
  ActivityReportObjective,
  ActivityReportFile,
  User,
  Grant,
  Goal,
  Objective,
  Recipient,
} from '../../models';
import app from '../../app';
import { deleteFileFromS3, uploadFile } from '../../lib/s3';
import addToScanQueue from '../../services/scanQueue';
import { FILE_STATUSES } from '../../constants';
import ActivityReportPolicy from '../../policies/activityReport';
import * as Files from '../../services/files';
import { validateUserAuthForAdmin } from '../../services/accessValidation';
import { generateRedisConfig } from '../../lib/queue';
import * as s3Queue from '../../services/s3Queue';
import { deleteHandler } from './handlers';
import { userById } from '../../services/users';
import {
  getFileById,
  deleteActivityReportFile,
  deleteFile,
} from '../../services/files';
import { logById } from '../../services/communicationLog';
import { currentUserId } from '../../services/currentUser';
import EventPolicy from '../../policies/event';
import CommunicationLogPolicy from '../../policies/communicationLog';
import Users from '../../policies/user';
import { findSessionById } from '../../services/sessionReports';
import { findEventBySmartsheetIdSuffix } from '../../services/event';

jest.mock('../../services/scanQueue', () => jest.fn());
jest.mock('bull');
jest.mock('../../policies/activityReport');
jest.mock('../../policies/user');
jest.mock('../../policies/objective');
jest.mock('../../services/accessValidation', () => ({
  validateUserAuthForAdmin: jest.fn().mockResolvedValue(false),
  validateUserAuthForAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('axios');
jest.mock('smartsheet');
jest.mock('../../services/users');
jest.mock('../../services/files', () => ({
  ...jest.requireActual('../../services/files'),
  deleteActivityReportFile: jest.fn(),
  deleteFile: jest.fn(),
  deleteSessionFile: jest.fn(),
  deleteCommunicationLogFile: jest.fn(),
  getFileById: jest.fn(),
  deleteSessionSupportingAttachment: jest.fn(),
}));
jest.mock('../../services/sessionReports');
jest.mock('../../services/communicationLog');
jest.mock('../../services/currentUser');
jest.mock('../../policies/event');
jest.mock('../../policies/communicationLog');
jest.mock('../../policies/user');

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
  lastLogin: new Date(),
};

const mockSession = jest.fn();
mockSession.userId = mockUser.id;

jest.spyOn(s3Queue, 'addDeleteFileToQueue').mockImplementation(() => jest.fn());

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  resourcesUsed: 'test',
  regionId: 1,
  version: 2,
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
          as: 'reportFiles',
          required: true,
          where: { activityReportId: report.dataValues.id },
        },
      ],
    });

    await Promise.all(files.map(async (file) => {
      ActivityReportFile.destroy({ where: { fileId: file.id } });
      File.destroy({ where: { id: file.id } });
    }));

    // cleanup any leftovers, like from the lonely file test
    const testFiles = await File.findAll({ where: { originalFileName: 'testfile.pdf' } });
    await Promise.all(
      [
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
        force: true,
      },
    );
    await Goal.destroy({ where: { id: goal.id }, force: true });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true });
    await Recipient.destroy({ where: { id: recipient.id } });
    await User.destroy({ where: { id: user.id } });
    process.env = ORIGINAL_ENV; // restore original env
    jest.clearAllMocks();
    await db.sequelize.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Upload Handlers error handling', () => {
    it('tests a file upload without a report id', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
        reportHasEditableStatus: () => true,
      }));
      await request(app)
        .post('/api/files')
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(400, { error: 'an id of either reportId, reportObjectiveId, objectiveId, objectiveTempleteId, communicationLogId, sessionId, or sessionAttachmentId is required' });
      expect(uploadFile).not.toHaveBeenCalled();
    });
    it('tests a file upload without a file', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
        reportHasEditableStatus: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .expect(400, { error: 'file required' });
      expect(uploadFile).not.toHaveBeenCalled();
    });
    it('tests an unauthorized upload', async () => {
      validateUserAuthForAdmin.mockResolvedValue(false);
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => false,
        reportHasEditableStatus: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(401)
        .then(() => expect(uploadFile).not.toHaveBeenCalled());
    });

    it('tests an incorrect file type', async () => {
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
        reportHasEditableStatus: () => true,
      }));
      uploadFile.mockResolvedValue({ key: 'key' });
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/test.log`)
        .expect(400)
        .then((res) => {
          expect(res.text).toBe('{"error":"Could not determine file type"}');
        });
    });
    it('tests a queuing failure', async () => {
      const updateStatus = jest.spyOn(Files, 'updateStatus');
      addToScanQueue.mockImplementation(() => {
        throw new Error('Scanning failed (mock error)');
      });
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
        reportHasEditableStatus: () => true,
      }));
      uploadFile.mockResolvedValue({ key: 'key' });

      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(200)
        .then(() => {
          expect(uploadFile).toHaveBeenCalled();
          expect(addToScanQueue).toHaveBeenCalled();

          const { calls } = updateStatus.mock;
          const params = calls.flat();
          // it was called twice
          expect(params.length).toBe(4);
          // file uploaded
          expect(params).toContain(FILE_STATUSES.UPLOADED);
          // but failed to queue for scan
          expect(params).toContain(FILE_STATUSES.QUEUEING_FAILED);
          // we also expect two numbers in addition to the statuses
          expect(params.filter((param) => typeof param === 'number')).toHaveLength(2);
        });
    });
    it('tests an upload failure', async () => {
      const updateStatus = jest.spyOn(Files, 'updateStatus');
      uploadFile.mockImplementation(() => {
        throw new Error('Warning! Failed to Upload! System terminating!');
      });
      ActivityReportPolicy.mockImplementation(() => ({
        canUpdate: () => true,
        reportHasEditableStatus: () => true,
      }));
      await request(app)
        .post('/api/files')
        .field('reportId', report.dataValues.id)
        .attach('file', `${__dirname}/testfiles/testfile.pdf`)
        .expect(500)
        .then(() => {
          expect(uploadFile).toHaveBeenCalled();
          expect(updateStatus)
            .toHaveBeenCalledWith(expect.any(Number), FILE_STATUSES.UPLOAD_FAILED);
        });
    });
  });
});

describe('deleteHandler', () => {
  const mockReq = {
    params: {
      reportId: 1,
      fileId: 1,
      eventSessionId: 1,
      communicationLogId: 1,
      sessionAttachmentId: 1,
    },
  };
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    end: jest.fn(),
  };
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const mockUser = { id: 1 };

  beforeEach(() => {
    // jest.clearAllMocks();
    currentUserId.mockResolvedValue(mockUser.id);
    userById.mockResolvedValue(mockUser);
  });

  it('returns 403 if user is not authorized for report', async () => {
    getFileById.mockResolvedValue({ reportFiles: [{ activityReportId: 1 }] });
    jest.spyOn(ActivityReport, 'findOne').mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUpdate: jest.fn().mockReturnValue(false) };
    ActivityReportPolicy.mockImplementation(() => mockPolicy);

    await deleteHandler(mockReq, mockRes);

    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });

  it('deletes activity report file if authorized', async () => {
    getFileById.mockResolvedValue({ reportFiles: [{ activityReportId: 1 }] });
    jest.spyOn(ActivityReport, 'findOne').mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUpdate: jest.fn().mockReturnValue(true) };
    ActivityReportPolicy.mockImplementation(() => mockPolicy);

    await deleteHandler(mockReq, mockRes);

    expect(deleteActivityReportFile).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('returns 403 if user is not authorized for event session', async () => {
    getFileById.mockResolvedValue({ sessionFiles: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/event'), 'findEventBySmartsheetIdSuffix').mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUploadFile: jest.fn().mockReturnValue(false) };
    EventPolicy.mockImplementation(() => mockPolicy);

    await deleteHandler(mockReq, mockRes);

    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });

  it('deletes session file if authorized', async () => {
    getFileById.mockResolvedValue({ sessionFiles: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/event'), 'findEventBySmartsheetIdSuffix').mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUploadFile: jest.fn().mockReturnValue(true) };
    EventPolicy.mockImplementation(() => mockPolicy);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const mockReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: 1,
        communicationLogId: 1,
        sessionAttachmentId: 1,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(Files.deleteSessionFile).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('returns 403 if user is not authorized for communication log', async () => {
    getFileById.mockResolvedValue({ communicationLogFiles: [{ communicationLogId: 1 }] });
    logById.mockResolvedValue({ id: 1 });
    const mockPolicy = { canUploadFileToLog: jest.fn().mockReturnValue(false) };
    CommunicationLogPolicy.mockImplementation(() => mockPolicy);

    await deleteHandler(mockReq, mockRes);

    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });

  it('deletes communication log file if authorized', async () => {
    getFileById.mockResolvedValue({ communicationLogFiles: [{ communicationLogId: 1 }] });
    logById.mockResolvedValue({ id: 1 });
    const mockPolicy = { canUploadFileToLog: jest.fn().mockReturnValue(true) };
    CommunicationLogPolicy.mockImplementation(() => mockPolicy);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const mockReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: undefined,
        communicationLogId: 1,
        sessionAttachmentId: 1,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(Files.deleteCommunicationLogFile).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('returns 403 if user is not authorized for session attachment', async () => {
    getFileById.mockResolvedValue({ supportingAttachments: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/event'), 'findEventBySmartsheetIdSuffix').mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUploadFile: jest.fn().mockReturnValue(false) };
    EventPolicy.mockImplementation(() => mockPolicy);

    await deleteHandler(mockReq, mockRes);

    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });

  it('deletes session attachment file if authorized', async () => {
    getFileById.mockResolvedValue({ supportingAttachments: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/event'), 'findEventBySmartsheetIdSuffix').mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUploadFile: jest.fn().mockReturnValue(true) };
    EventPolicy.mockImplementation(() => mockPolicy);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const mockReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: undefined,
        communicationLogId: undefined,
        sessionAttachmentId: 1,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(Files.deleteSessionSupportingAttachment).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('deletes file from S3 if no associated records', async () => {
    getFileById.mockResolvedValue({
      reports: [],
      reportObjectiveFiles: [],
      objectiveFiles: [],
      objectiveTemplateFiles: [],
      sessionFiles: [],
    });

    await deleteHandler(mockReq, mockRes);

    expect(deleteFileFromS3).toHaveBeenCalled();
    expect(deleteFile).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });
});
