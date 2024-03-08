import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import httpCodes from 'http-codes';
import { DECIMAL_BASE, REPORT_STATUSES } from '@ttahub/common';
import handleErrors from '../../lib/apiErrorHandler';
import { uploadFile, deleteFileFromS3, getPresignedURL } from '../../lib/s3';
import addToScanQueue from '../../services/scanQueue';
import {
  deleteFile,
  deleteActivityReportFile,
  deleteObjectiveFile,
  deleteCommunicationLogFile,
  deleteSessionFile,
  deleteSessionSupportingAttachment,
  getFileById,
  updateStatus,
  createActivityReportFileMetaData,
  createActivityReportObjectiveFileMetaData,
  createObjectiveFileMetaData,
  createObjectiveTemplateFileMetaData,
  createObjectivesFileMetaData,
  createCommunicationLogFileMetadata,
  createSessionSupportingAttachmentMetaData,
  createSessionObjectiveFileMetaData,
  deleteSpecificActivityReportObjectiveFile,
} from '../../services/files';
import { ActivityReport, ActivityReportObjective } from '../../models';
import ActivityReportPolicy from '../../policies/activityReport';
import ObjectivePolicy from '../../policies/objective';
import EventPolicy from '../../policies/event';
import CommunicationLogPolicy from '../../policies/communicationLog';
import { activityReportAndRecipientsById } from '../../services/activityReports';
import { userById } from '../../services/users';
import { getObjectiveById } from '../../services/objectives';
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
    objectiveId,
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
    } else if (objectiveId) {
      const objective = await getObjectiveById(objectiveId);
      const objectivePolicy = new ObjectivePolicy(objective, user);
      if (!objectivePolicy.canUpdate()) {
        res.sendStatus(403);
        return;
      }
      const of = file.objectiveFiles.find(
        (r) => r.objectiveId === parseInt(objectiveId, DECIMAL_BASE),
      );
      if (of) {
        await deleteObjectiveFile(of.id);
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
        (r) => r.sessionReportPilotId === parseInt(eventSessionId, DECIMAL_BASE),
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
        (r) => r.sessionReportPilotId === parseInt(sessionAttachmentId, DECIMAL_BASE),
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

// TODO: handle ActivityReportObjectiveFiles, ObjectiveFiles, and ObjectiveTemplateFiles
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

const uploadHandler = async (req, res) => {
  const [fields, files] = await parseFormPromise(req);
  const {
    reportId,
    reportObjectiveId,
    objectiveId,
    objectiveTempleteId,
    sessionId,
    communicationLogId,
    sessionAttachmentId,
  } = fields;
  let buffer;
  let metadata;
  let fileName;
  let fileTypeToUse;

  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  try {
    if (!files.file) {
      return res.status(400).send({ error: 'file required' });
    }
    const { path, originalFilename, size } = files.file[0];
    if (!size) {
      return res.status(400).send({ error: 'fileSize required' });
    }
    if (!uploadHandlerRequiredFields(fields)) {
      return res.status(400).send({ error: 'an id of either reportId, reportObjectiveId, objectiveId, objectiveTempleteId, communicationLogId, sessionId, or sessionAttachmentId is required' });
    }
    buffer = fs.readFileSync(path);

    fileTypeToUse = await determineFileTypeFromPath(path);
    if (!fileTypeToUse) {
      return res.status(400).send('Could not determine file type');
    }

    fileName = `${uuidv4()}${fileTypeToUse.ext}`;
    if (reportId) {
      const isAdmin = await validateUserAuthForAdmin(userId);
      const editable = await reportIsInAnEditableState(user, reportId);

      if (isAdmin && !editable) {
        return res.sendStatus(403);
      }

      if (!(await hasReportAuthorization(user, reportId)) && !isAdmin) {
        return res.sendStatus(403);
      }

      metadata = await createActivityReportFileMetaData(
        originalFilename,
        fileName,
        reportId,
        size,
      );
    } else if (reportObjectiveId) {
      const activityReportObjective = ActivityReportObjective.findOne(
        { where: { id: reportObjectiveId } },
      );
      if (!(await hasReportAuthorization(
        user,
        activityReportObjective.activityReportId,
      )
      || (await validateUserAuthForAdmin(userId)))) {
        return res.sendStatus(403);
      }
      metadata = await createActivityReportObjectiveFileMetaData(
        originalFilename,
        fileName,
        reportId,
        size,
      );
    } else if (objectiveId) {
      const objective = await getObjectiveById(objectiveId);
      const objectivePolicy = new ObjectivePolicy(objective, user);
      if (!(objectivePolicy.canUpload()
      || (await validateUserAuthForAdmin(userId)))) {
        return res.sendStatus(403);
      }
      metadata = await createObjectiveFileMetaData(
        originalFilename,
        fileName,
        objectiveId,
        size,
      );
    } else if (objectiveTempleteId) {
      // TODO: Determine how to handle permissions for objective templates.
      metadata = await createObjectiveTemplateFileMetaData(
        originalFilename,
        fileName,
        reportId,
        size,
      );
    } else if (sessionId) {
      const session = await findSessionById(sessionId);
      const event = await findEventBySmartsheetIdSuffix(session.eventId);

      const eventPolicy = new EventPolicy(user, event);

      if (!eventPolicy.canUploadFile()) {
        return res.sendStatus(403);
      }

      metadata = await createSessionObjectiveFileMetaData(
        originalFilename,
        fileName,
        sessionId,
        size,
      );
    } else if (communicationLogId) {
      const communicationLog = await logById(communicationLogId);
      const logPolicy = new CommunicationLogPolicy(user, 0, communicationLog);

      if (!logPolicy.canUploadFileToLog()) {
        return res.sendStatus(403);
      }

      metadata = await createCommunicationLogFileMetadata(
        originalFilename,
        fileName,
        communicationLogId,
        size,
      );
    } else if (sessionAttachmentId) {
      const session = await findSessionById(sessionAttachmentId);
      const event = await findEventBySmartsheetIdSuffix(session.eventId);

      const eventPolicy = new EventPolicy(user, event);

      if (!eventPolicy.canUploadFile()) {
        return res.sendStatus(403);
      }

      metadata = await createSessionSupportingAttachmentMetaData(
        originalFilename,
        fileName,
        sessionAttachmentId,
        size,
      );
    }
  } catch (err) {
    return handleErrors(req, res, err, logContext);
  }
  try {
    const uploadedFile = await uploadFile(buffer, fileName, fileTypeToUse);
    const url = getPresignedURL(uploadedFile.Key);
    await updateStatus(metadata.id, UPLOADED);
    res.status(200).send({ ...metadata, url });
  } catch (err) {
    if (metadata) {
      await updateStatus(metadata.id, UPLOAD_FAILED);
    }
    return handleErrors(req, res, err, logContext);
  }
  try {
    await addToScanQueue({ key: metadata.key });
    return await updateStatus(metadata.id, QUEUED);
  } catch (err) {
    auditLogger.error(`${logContext} ${logContext.namespace}:uploadHander Failed to queue ${metadata.originalFileName}. Error: ${err}`);
    return updateStatus(metadata.id, QUEUEING_FAILED);
  }
};

const uploadObjectivesFile = async (req, res) => {
  const [fields, files] = await parseFormPromise(req);
  let { objectiveIds } = fields;

  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  objectiveIds = JSON.parse(objectiveIds);
  const scanQueue = [];

  if (!objectiveIds || !objectiveIds.length) {
    return res.status(400).send({ error: 'objective ids are required' });
  }
  try {
    if (!files.file) {
      return res.status(400).send({ error: 'file required' });
    }
    await Promise.all(files.file.map(async (f) => {
      const { path, originalFilename, size } = f;
      if (!size) {
        return res.status(400).send({ error: 'fileSize required' });
      }
      const buffer = fs.readFileSync(path);
      const fileTypeToUse = await determineFileTypeFromPath(path);
      if (!fileTypeToUse) {
        return res.status(400).send('Could not determine file type');
      }
      const fileName = `${uuidv4()}${fileTypeToUse.ext}`;
      const authorizations = await Promise.all(objectiveIds.map(async (objectiveId) => {
        const objective = await getObjectiveById(objectiveId);
        const objectivePolicy = new ObjectivePolicy(objective, user);
        if (!objective || !objectivePolicy.canUpload()) {
          const admin = await validateUserAuthForAdmin(userId);
          if (!admin) {
            return false;
          }
        }
        return true;
      }));

      if (!authorizations.every((auth) => auth)) {
        return res.sendStatus(403);
      }

      const data = await createObjectivesFileMetaData(
        originalFilename,
        fileName,
        objectiveIds.filter((i) => i !== 0), // Exclude unsaved objectives.
        size,
      );
      try {
        const uploadedFile = await uploadFile(buffer, fileName, fileTypeToUse);
        const url = getPresignedURL(uploadedFile.key);
        await updateStatus(data.id, UPLOADED);
        scanQueue.push({ ...data, url });

        return data;
      } catch (err) {
        if (data) {
          await updateStatus(data.id, UPLOAD_FAILED);
        }
        return handleErrors(req, res, err, logContext);
      }
    }));
    if (!res.writableEnded) {
      res.status(200).send(scanQueue);
    }
  } catch (err) {
    return handleErrors(req, res, err, logContext);
  }

  return Promise.all(scanQueue.map(async (queueItem) => {
    try {
      if (!queueItem.key || !queueItem.id) {
        throw new Error('Missing key or id for file status update');
      }
      await addToScanQueue({ key: queueItem.key });
      return await updateStatus(queueItem.id, QUEUED);
    } catch (err) {
      auditLogger.error(`${logContext} ${logContext.namespace}:uploadObjectivesFile Failed to queue ${queueItem.originalFileName}. Error: ${err}`);
      return updateStatus(queueItem.id, QUEUEING_FAILED);
    }
  }));
};

const deleteObjectiveFileHandler = async (req, res) => {
  const { fileId } = req.params;
  const { objectiveIds } = req.body;

  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  try {
    let file = await getFileById(parseInt(fileId, DECIMAL_BASE));
    let canUpdate = true;

    await Promise.all(objectiveIds.map(async (objectiveId) => {
      if (!canUpdate) {
        return null;
      }
      const objective = await getObjectiveById(objectiveId);
      const objectivePolicy = new ObjectivePolicy(objective, user);
      if (!objectivePolicy.canUpdate()) {
        canUpdate = false;
        res.sendStatus(403);
        return null;
      }
      const of = file.objectiveFiles.find(
        (r) => r.objectiveId === parseInt(objectiveId, DECIMAL_BASE),
      );
      if (of) {
        return deleteObjectiveFile(of.id);
      }
      return null;
    }));

    file = await getFileById(fileId);
    if (file && file.reports.length
      + file.reportObjectiveFiles.length
      + file.objectiveFiles.length
      + file.objectiveTemplateFiles.length === 0) {
      await deleteFileFromS3(file.key);
      await deleteFile(fileId);
    }
    res.status(204).send();
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
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
  uploadObjectivesFile,
  deleteObjectiveFileHandler,
  deleteActivityReportObjectiveFile,
};
