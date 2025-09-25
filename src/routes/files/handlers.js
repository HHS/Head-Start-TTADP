import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import httpCodes from 'http-codes';
import { DECIMAL_BASE } from '@ttahub/common';
import handleErrors from '../../lib/apiErrorHandler';
import { uploadFile, deleteFileFromS3, getPresignedURL } from '../../lib/s3';
import addToScanQueue from '../../services/scanQueue';
import {
  deleteFile,
  deleteActivityReportFile,
  deleteCommunicationLogFile,
  deleteSessionFile,
  deleteSessionSupportingAttachment,
  getFileById,
  updateStatus,
  createActivityReportFileMetaData,
  createActivityReportObjectiveFileMetaData,
  createCommunicationLogFileMetadata,
  createSessionSupportingAttachmentMetaData,
  createSessionObjectiveFileMetaData,
  deleteSpecificActivityReportObjectiveFile,
} from '../../services/files';
import { ActivityReport, ActivityReportObjective } from '../../models';
import ActivityReportPolicy from '../../policies/activityReport';
import EventPolicy from '../../policies/event';
import CommunicationLogPolicy from '../../policies/communicationLog';
import { activityReportAndRecipientsById } from '../../services/activityReports';
import { userById } from '../../services/users';
import { validateUserAuthForAdmin } from '../../services/accessValidation';
import { auditLogger } from '../../logger';
import { FILE_STATUSES } from '../../constants';
import Users from '../../policies/user';
import { currentUserId } from '../../services/currentUser';
import { findSessionById } from '../../services/sessionReports';
import { findEventBySmartsheetIdSuffix } from '../../services/event';
import { logById } from '../../services/communicationLog';

const fileType = require('file-type');
const multiparty = require('multiparty');

const namespace = 'SERVICE:FILES';

const logContext = {
  namespace,
};

const {
  UPLOADED,
  UPLOAD_FAILED,
  QUEUED,
  QUEUEING_FAILED,
} = FILE_STATUSES;

const altFileTypes = [
  {
    ext: '.txt',
    mime: 'text/plain',
  },
  {
    ext: '.csv',
    mime: 'text/csv',
  },
];

const hasReportAuthorization = async (user, reportId) => {
  const [report] = await activityReportAndRecipientsById(reportId);
  const authorization = new ActivityReportPolicy(user, report);
  if (!authorization.canUpdate()) {
    return false;
  }
  return true;
};

const reportIsInAnEditableState = async (user, reportId) => {
  const report = await ActivityReport.findOne(
    {
      where: { id: reportId },
      attributes: ['calculatedStatus', 'submissionStatus'],
    },
  );
  const authorization = new ActivityReportPolicy(user, report);
  return authorization.reportHasEditableStatus();
};

const deleteOnlyFile = async (req, res) => {
  const { fileId } = req.params;
  const userId = await currentUserId(req, res);

  const user = await userById(userId);
  const policy = new Users(user);
  if (!policy.canWriteInAtLeastOneRegion()) {
    return res.status(400).send({ error: 'Write permissions required' });
  }

  try {
    //
    const file = await getFileById(fileId);
    if (!file) {
      return res.status(404).send({ error: 'File not found' });
    }
    if (file.reports.length
    + file.reportObjectiveFiles.length
    + file.objectiveFiles.length
    + file.objectiveTemplateFiles.length === 0) {
      await deleteFileFromS3(file.key);
      await deleteFile(fileId);
    }
    return res.status(204).send();
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

const deleteHandler = async (req, res) => {
  const {
    reportId,
    fileId,
    eventSessionId,
    communicationLogId,
    sessionAttachmentId,
  } = req.params;

  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  try {
    const file = await getFileById(fileId);

    if (reportId) {
      if (!await hasReportAuthorization(user, reportId)) {
        res.sendStatus(403);
        return;
      }
      const rf = file.reportFiles.find(
        (r) => r.activityReportId === parseInt(reportId, DECIMAL_BASE),
      );
      if (rf) {
        await deleteActivityReportFile(rf.id);
      }
    } else if (eventSessionId) {
      const session = await findSessionById(eventSessionId);
      const event = await findEventBySmartsheetIdSuffix(session.eventId);

      const eventPolicy = new EventPolicy(user, event);

      if (!eventPolicy.canUploadFile()) {
        res.sendStatus(403);
        return;
      }

      const sof = file.sessionFiles.find(
        (r) => r.sessionReportId === parseInt(eventSessionId, DECIMAL_BASE),
      );
      if (sof) {
        await deleteSessionFile(sof.id);
      }
    } else if (communicationLogId) {
      const communicationLog = await logById(communicationLogId);
      const logPolicy = new CommunicationLogPolicy(user, 0, communicationLog);

      if (!logPolicy.canUploadFileToLog()) {
        res.sendStatus(httpCodes.UNAUTHORIZED);
        return;
      }

      const clf = file.communicationLogFiles.find(
        (r) => r.communicationLogId === parseInt(communicationLogId, DECIMAL_BASE),
      );
      if (clf) {
        await deleteCommunicationLogFile(clf.id);
      }
    } else if (sessionAttachmentId) {
      // Session Supporting Attachments.
      const session = await findSessionById(sessionAttachmentId);
      const event = await findEventBySmartsheetIdSuffix(session.eventId);
      const eventPolicy = new EventPolicy(user, event);

      if (!eventPolicy.canUploadFile()) {
        res.sendStatus(httpCodes.UNAUTHORIZED);
        return;
      }

      const sof = file.supportingAttachments.find(
        (r) => r.sessionReportId === parseInt(sessionAttachmentId, DECIMAL_BASE),
      );
      if (sof) {
        await deleteSessionSupportingAttachment(sof.id);
      }
    }

    const reportLength = file.reports ? file.reports.length : 0;
    const reportObjectiveLength = file.reportObjectiveFiles ? file.reportObjectiveFiles.length : 0;
    const objectiveLength = file.objectiveFiles ? file.objectiveFiles.length : 0;
    const objectiveTemplateFilesLength = file.objectiveTemplateFiles
      ? file.objectiveTemplateFiles.length : 0;
    const sessionLength = file.sessionFiles ? file.sessionFiles.length : 0;

    const canDelete = (reportLength
      + reportObjectiveLength
      + objectiveLength
      + objectiveTemplateFilesLength
      + sessionLength === 0);

    if (canDelete) {
      await deleteFileFromS3(file.key);
      await deleteFile(fileId);
    }

    res.status(204).send();
  } catch (error) {
    handleErrors(req, res, error, logContext);
  }
};

const parseFormPromise = (req) => new Promise((resolve, reject) => {
  const form = new multiparty.Form();
  form.parse(req, (err, fields, files) => {
    if (err) {
      return reject(err);
    }
    return resolve([fields, files]);
  });
});

const determineFileTypeFromPath = async (filePath) => {
  const type = await fileType.fromFile(filePath);
  let altFileType;
  if (!type) {
    const matchingAltType = altFileTypes.filter((t) => filePath.endsWith(t.ext));
    if (!matchingAltType || !matchingAltType.length > 0) {
      return false;
    }
    altFileType = { ext: matchingAltType[0].ext, mime: matchingAltType[0].mime };
  }

  return altFileType || type;
};

// at least one is required
const uploadHandlerRequiredFields = (fields) => [
  'reportId',
  'reportObjectiveId',
  'objectiveId',
  'objectiveTempleteId',
  'sessionId',
  'communicationLogId',
  'sessionAttachmentId',
].some((field) => fields[field]);

const getAuthorizationAndMetadataFn = async (user, fields) => {
  const {
    reportId,
    objectiveIds,
    sessionId,
    communicationLogId,
    sessionAttachmentId,
  } = fields;

  const userId = user.id;

  let error;
  let status;
  const activityReportObjectives = [];
  if (reportId && objectiveIds) {
    const parsedObjectiveIds = JSON.parse(objectiveIds);
    const parsedReportId = parseInt(reportId, DECIMAL_BASE);

    if (!(await hasReportAuthorization(
      user,
      parsedReportId,
    ) || (await validateUserAuthForAdmin(userId)))) {
      error = 'Unauthorized';
      status = httpCodes.UNAUTHORIZED;
    }

    for (let i = 0; i < parsedObjectiveIds.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      let activityReportObjective = await ActivityReportObjective.findOne({
        where: {
          objectiveId: parsedObjectiveIds[i],
          activityReportId: parsedReportId,
        },
      });

      if (!activityReportObjective) {
        // eslint-disable-next-line no-await-in-loop
        activityReportObjective = await ActivityReportObjective.create({
          activityReportId: parsedReportId,
          objectiveId: parsedObjectiveIds[i],
        });
      }

      activityReportObjectives.push(activityReportObjective);
    }

    if (activityReportObjectives.length === 0) {
      return {
        error: 'Bad request',
        status: httpCodes.BAD_REQUEST,
        metadataFn: null,
      };
    }

    if (error) {
      return {
        error: 'Bad request',
        status: httpCodes.BAD_REQUEST,
        metadataFn: null,
      };
    }

    const activityReportObjectiveIds = activityReportObjectives.map((aro) => aro.id);

    return {
      error: null,
      status: null,
      // eslint-disable-next-line max-len
      metadataFn: async (originalFileName, fileName, size) => createActivityReportObjectiveFileMetaData(
        originalFileName,
        fileName,
        activityReportObjectiveIds,
        size,
      ),
    };
  }

  if (reportId) {
    const isAdmin = await validateUserAuthForAdmin(userId);
    const editable = await reportIsInAnEditableState(user, reportId);
    if (isAdmin && !editable) {
      return {
        error: 'Unauthorized',
        status: httpCodes.UNAUTHORIZED,
      };
    }

    if (!(await hasReportAuthorization(user, reportId)) && !isAdmin) {
      return {
        error: 'Unauthorized',
        status: httpCodes.UNAUTHORIZED,
      };
    }

    return {
      error: null,
      status: null,
      // eslint-disable-next-line max-len
      metadataFn: async (originalFileName, fileName, size) => createActivityReportFileMetaData(
        originalFileName,
        fileName,
        reportId,
        size,
      ),
    };
  }

  if (sessionId) {
    const session = await findSessionById(sessionId);
    const event = await findEventBySmartsheetIdSuffix(session.eventId);

    const eventPolicy = new EventPolicy(user, event);

    if (!eventPolicy.canUploadFile()) {
      error = 'Unauthorized';
      status = httpCodes.UNAUTHORIZED;

      if (error) {
        return {
          error,
          status,
        };
      }
    }

    return {
      error: null,
      status: null,
      // eslint-disable-next-line max-len
      metadataFn: async (originalFileName, fileName, size) => createSessionObjectiveFileMetaData(
        originalFileName,
        fileName,
        sessionId,
        size,
      ),
    };
  }

  if (communicationLogId) {
    const communicationLog = await logById(communicationLogId);
    const logPolicy = new CommunicationLogPolicy(user, 0, communicationLog);

    if (!logPolicy.canUploadFileToLog()) {
      error = 'Unauthorized';
      status = httpCodes.UNAUTHORIZED;

      return {
        error,
        status,
      };
    }

    return {
      error: null,
      status: null,
      // eslint-disable-next-line max-len
      metadataFn: async (originalFileName, fileName, size) => createCommunicationLogFileMetadata(
        originalFileName,
        fileName,
        communicationLogId,
        size,
      ),
    };
  }
  if (sessionAttachmentId) {
    const session = await findSessionById(sessionAttachmentId);
    const event = await findEventBySmartsheetIdSuffix(session.eventId);

    const eventPolicy = new EventPolicy(user, event);

    if (!eventPolicy.canUploadFile()) {
      // error = 'Unauthorized';
      // status = httpCodes.UNAUTHORIZED;
      return {
        error: 'Unauthorized',
        status: httpCodes.UNAUTHORIZED,
      };
    }

    return {
      error: null,
      status: null,
      // eslint-disable-next-line max-len
      metadataFn: async (originalFileName, fileName, size) => createSessionSupportingAttachmentMetaData(
        originalFileName,
        fileName,
        sessionAttachmentId,
        size,
      ),
    };
  }

  return {
    error: 'Bad request',
    status: httpCodes.BAD_REQUEST,
  };
};

const uploadHandler = async (req, res) => {
  const [fields, files] = await parseFormPromise(req);

  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  const fileResponse = [];

  if (!files.file) {
    return res.status(httpCodes.BAD_REQUEST).send({ error: 'file required' });
  }

  if (!uploadHandlerRequiredFields(fields)) {
    return res.status(httpCodes.BAD_REQUEST).send({ error: 'an id of either reportId, reportObjectiveId, objectiveId, objectiveTempleteId, communicationLogId, sessionId, or sessionAttachmentId is required' });
  }

  let error;
  let status;
  let metadataFn;

  try {
    const authAndMetadata = await getAuthorizationAndMetadataFn(user, fields);
    error = authAndMetadata.error;
    status = authAndMetadata.status;
    metadataFn = authAndMetadata.metadataFn;
  } catch (err) {
    return handleErrors(req, res, err, logContext);
  }

  if (error) {
    return res.status(status).send({ error });
  }

  for (let index = 0; index < files.file.length; index += 1) {
    const file = files.file[index];
    const { size } = file;
    if (!size) {
      error = httpCodes.BAD_REQUEST;
      status = 'fileSize required';
      break;
    }
  }

  if (error) {
    return res.status(status).send({ error });
  }

  await Promise.all(files.file.map(async (file) => {
    const { path, originalFilename, size } = file;
    let metadata;

    const buffer = fs.readFileSync(path);

    const fileTypeToUse = await determineFileTypeFromPath(path);
    if (!fileTypeToUse) {
      error = 'Could not determine file type';
      status = httpCodes.BAD_REQUEST;
    }

    if (error) {
      return;
    }

    const fileName = `${uuidv4()}${fileTypeToUse.ext}`;

    try {
      metadata = await metadataFn(originalFilename, fileName, size);
      const uploadedFile = await uploadFile(buffer, fileName, fileTypeToUse);
      const url = getPresignedURL(uploadedFile.Key);
      await updateStatus(metadata.id, UPLOADED);
      fileResponse.push({ ...metadata, url });
    } catch (err) {
      if (metadata) {
        await updateStatus(metadata.id, UPLOAD_FAILED);
      }
      await handleErrors(req, res, err, logContext);
    }
  }));

  if (!res.headersSent) {
    if (error) {
      res.status(status).send({ error });
    } else {
      res.status(httpCodes.OK).send(fileResponse);
    }
  }

  return Promise.all(fileResponse.map(async (data) => {
    try {
      addToScanQueue({ key: data.key });
      await updateStatus(data.id, QUEUED);
    } catch (err) {
      auditLogger.error(`${logContext} ${logContext.namespace}:uploadHander Failed to queue ${data.originalFileName}. Error: ${err}`);
      await updateStatus(data.id, QUEUEING_FAILED);
    }
  }));
};

async function deleteActivityReportObjectiveFile(req, res) {
  const { fileId, reportId } = req.params;
  const { objectiveIds } = req.body;

  try {
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const [report] = await activityReportAndRecipientsById(
      parseInt(reportId, DECIMAL_BASE),
    );
    if (!report) {
      res.sendStatus(404);
      return;
    }
    const file = await getFileById(parseInt(fileId, DECIMAL_BASE));

    if (!file) {
      res.sendStatus(404);
      return;
    }

    const reportPolicy = new ActivityReportPolicy(user, report);

    if (!reportPolicy.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    // Delete specific ARO file.
    await deleteSpecificActivityReportObjectiveFile(reportId, fileId, objectiveIds);

    res.status(204).send();
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export {
  deleteHandler,
  uploadHandler,
  deleteOnlyFile,
  deleteActivityReportObjectiveFile,
};
