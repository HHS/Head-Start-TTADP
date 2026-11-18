import { DECIMAL_BASE, REPORT_STATUSES } from '@ttahub/common';
import { fileTypeFromFile } from 'file-type';
import * as fs from 'fs';
import httpCodes from 'http-codes';
import { v4 as uuidv4 } from 'uuid';
import { FILE_STATUSES } from '../../constants';
import handleErrors from '../../lib/apiErrorHandler';
import { getSignedDownloadUrl, uploadFile } from '../../lib/s3';
import { auditLogger, logger } from '../../logger';
import { ActivityReport, ActivityReportObjective } from '../../models';
import ActivityReportPolicy from '../../policies/activityReport';
import CommunicationLogPolicy from '../../policies/communicationLog';
import EventPolicy from '../../policies/event';
import { validateUserAuthForAdmin } from '../../services/accessValidation';
import { activityReportAndRecipientsById } from '../../services/activityReports';
import { logById } from '../../services/communicationLog';
import { currentUserId } from '../../services/currentUser';
import { findEventBySmartsheetId } from '../../services/event';
import {
  createActivityReportFileMetaData,
  createActivityReportObjectiveFileMetaData,
  createCommunicationLogFileMetadata,
  createSessionObjectiveFileMetaData,
  createSessionSupportingAttachmentMetaData,
  deleteActivityReportFile,
  deleteCommunicationLogFile,
  deleteFile,
  deleteSessionFile,
  deleteSessionSupportingAttachment,
  deleteSpecificActivityReportObjectiveFile,
  fileHasReferences,
  getFileById,
  markFilesQueuedForScan,
  queueFilesForScan,
  updateStatus,
} from '../../services/files';
import { addDeleteFileToQueue } from '../../services/s3Queue';
import { findSessionById } from '../../services/sessionReports';
import { userById } from '../../services/users';
import { onTransactionCommitted } from '../transactionWrapper';

const multiparty = require('multiparty');

const namespace = 'SERVICE:FILES';

const logContext = {
  namespace,
};

const { UPLOADED, UPLOAD_FAILED } = FILE_STATUSES;

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

const reportIsApproved = async (reportId) => {
  const report = await ActivityReport.findOne({
    where: { id: reportId },
    attributes: ['calculatedStatus'],
  });
  return report?.calculatedStatus === REPORT_STATUSES.APPROVED;
};

const reportIsInAnEditableState = async (user, reportId) => {
  const report = await ActivityReport.findOne({
    where: { id: reportId },
    attributes: ['calculatedStatus', 'submissionStatus'],
  });
  const authorization = new ActivityReportPolicy(user, report);
  return authorization.reportHasEditableStatus();
};

/**
 * Deletes the file if nothing references it any more. The file is reloaded so references
 * removed earlier in this transaction aren't counted. The S3 object is only queued for
 * deletion once the transaction commits, so a rollback can't leave a File row whose S3
 * object is gone.
 */
const removeFileIfOrphaned = async (req, fileId) => {
  const file = await getFileById(fileId);
  if (!file || fileHasReferences(file)) {
    return;
  }

  await deleteFile(file.id);

  const { id, key } = file;
  onTransactionCommitted(req, async () => {
    try {
      await addDeleteFileToQueue(id, key);
    } catch (err) {
      auditLogger.error(
        `${logContext.namespace}:removeFileIfOrphaned Failed to queue S3 delete for file ${id}: ${err.message}`
      );
    }
  });
};

// Each parent branch checks the user's access to the parent, then requires that parent to
// link to the file. Without that link the user's access says nothing about the file, so the
// request is refused with a 404 and nothing is unlinked or cleaned up.
const deleteHandler = async (req, res) => {
  const { reportId, fileId, eventSessionId, communicationLogId, sessionAttachmentId } = req.params;

  if (!reportId && !eventSessionId && !communicationLogId && !sessionAttachmentId) {
    res.status(httpCodes.BAD_REQUEST).send({ error: 'A recognized parent id is required' });
    return;
  }

  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  try {
    const file = await getFileById(fileId);
    if (!file) {
      res.status(httpCodes.NOT_FOUND).send({ error: 'File not found' });
      return;
    }

    if (reportId) {
      if (!(await hasReportAuthorization(user, reportId))) {
        res.sendStatus(403);
        return;
      }
      // The ActivityReportFile beforeDestroy hook enforced this; unlinking now skips hooks.
      if (await reportIsApproved(reportId)) {
        res
          .status(httpCodes.BAD_REQUEST)
          .send({ error: 'File cannot be removed from approved report' });
        return;
      }
      const rf = (file.reportFiles || []).find(
        (r) => r.activityReportId === parseInt(reportId, DECIMAL_BASE)
      );
      if (!rf) {
        res.status(httpCodes.NOT_FOUND).send({ error: 'File is not attached to this parent' });
        return;
      }
      await deleteActivityReportFile(rf.id);
    } else if (eventSessionId) {
      const session = await findSessionById(eventSessionId);
      const event = await findEventBySmartsheetId(session.eventId);

      const eventPolicy = new EventPolicy(user, event);

      if (!eventPolicy.canUploadFile()) {
        res.sendStatus(403);
        return;
      }

      const sof = (file.sessionFiles || []).find(
        (r) => r.sessionReportPilotId === parseInt(eventSessionId, DECIMAL_BASE)
      );
      if (!sof) {
        res.status(httpCodes.NOT_FOUND).send({ error: 'File is not attached to this parent' });
        return;
      }
      await deleteSessionFile(sof.id);
    } else if (communicationLogId) {
      const communicationLog = await logById(communicationLogId);
      const logPolicy = new CommunicationLogPolicy(user, 0, communicationLog);

      if (!logPolicy.canUploadFileToLog()) {
        res.sendStatus(httpCodes.UNAUTHORIZED);
        return;
      }

      const clf = (file.communicationLogFiles || []).find(
        (r) => r.communicationLogId === parseInt(communicationLogId, DECIMAL_BASE)
      );
      if (!clf) {
        res.status(httpCodes.NOT_FOUND).send({ error: 'File is not attached to this parent' });
        return;
      }
      await deleteCommunicationLogFile(clf.id);
    } else if (sessionAttachmentId) {
      // Session Supporting Attachments.
      const session = await findSessionById(sessionAttachmentId);
      const event = await findEventBySmartsheetId(session.eventId);
      const eventPolicy = new EventPolicy(user, event);

      if (!eventPolicy.canUploadFile()) {
        res.sendStatus(httpCodes.UNAUTHORIZED);
        return;
      }

      const sof = (file.supportingAttachments || []).find(
        (r) => r.sessionReportPilotId === parseInt(sessionAttachmentId, DECIMAL_BASE)
      );
      if (!sof) {
        res.status(httpCodes.NOT_FOUND).send({ error: 'File is not attached to this parent' });
        return;
      }
      await deleteSessionSupportingAttachment(sof.id);
    }

    await removeFileIfOrphaned(req, fileId);

    res.status(204).send();
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

const parseFormPromise = (req) =>
  new Promise((resolve, reject) => {
    const form = new multiparty.Form();
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      return resolve([fields, files]);
    });
  });

const determineFileTypeFromPath = async (filePath) => {
  const type = await fileTypeFromFile(filePath);
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
const uploadHandlerRequiredFields = (fields) =>
  [
    'reportId',
    'reportObjectiveId',
    'objectiveId',
    'objectiveTempleteId',
    'sessionId',
    'communicationLogId',
    'sessionAttachmentId',
  ].some((field) => fields[field]);

const getAuthorizationAndMetadataFn = async (user, fields) => {
  const { reportId, objectiveIds, sessionId, communicationLogId, sessionAttachmentId } = fields;

  const userId = user.id;

  let error;
  let status;
  const activityReportObjectives = [];
  if (reportId && objectiveIds) {
    const parsedObjectiveIds = JSON.parse(objectiveIds);
    const parsedReportId = parseInt(reportId, DECIMAL_BASE);

    if (
      !(
        (await hasReportAuthorization(user, parsedReportId)) ||
        (await validateUserAuthForAdmin(userId))
      )
    ) {
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
      metadataFn: async (originalFileName, fileName, size) =>
        createActivityReportObjectiveFileMetaData(
          originalFileName,
          fileName,
          activityReportObjectiveIds,
          size
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
      metadataFn: async (originalFileName, fileName, size) =>
        createActivityReportFileMetaData(originalFileName, fileName, reportId, size),
    };
  }

  if (sessionId) {
    const session = await findSessionById(sessionId);
    const event = await findEventBySmartsheetId(session.eventId);

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
      metadataFn: async (originalFileName, fileName, size) =>
        createSessionObjectiveFileMetaData(originalFileName, fileName, sessionId, size),
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
      metadataFn: async (originalFileName, fileName, size) =>
        createCommunicationLogFileMetadata(originalFileName, fileName, communicationLogId, size),
    };
  }
  if (sessionAttachmentId) {
    const session = await findSessionById(sessionAttachmentId);
    const event = await findEventBySmartsheetId(session.eventId);

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
      metadataFn: async (originalFileName, fileName, size) =>
        createSessionSupportingAttachmentMetaData(
          originalFileName,
          fileName,
          sessionAttachmentId,
          size
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
    return res.status(httpCodes.BAD_REQUEST).send({
      error:
        'an id of either reportId, reportObjectiveId, objectiveId, objectiveTempleteId, communicationLogId, sessionId, or sessionAttachmentId is required',
    });
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

  await Promise.all(
    files.file.map(async (file) => {
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

      const ext = fileTypeToUse.ext.startsWith('.') ? fileTypeToUse.ext : `.${fileTypeToUse.ext}`;
      const fileName = `${uuidv4()}${ext}`;

      try {
        metadata = await metadataFn(originalFilename, fileName, size);
        const uploadedFile = await uploadFile(buffer, fileName, fileTypeToUse);
        auditLogger.info(
          `${logContext.namespace}:uploadHandler Uploaded file ${originalFilename} as ${uploadedFile.Key}`
        );
        const url = getSignedDownloadUrl(uploadedFile.Key);
        await updateStatus(metadata.id, UPLOADED);
        fileResponse.push({ ...metadata, url });
      } catch (err) {
        if (metadata) {
          await updateStatus(metadata.id, UPLOAD_FAILED);
        }
        await handleErrors(req, res, err, logContext);
      }
    })
  );

  // Set QUEUED inside the transaction, before any scan job exists.
  await markFilesQueuedForScan(fileResponse);

  // Respond and queue scans only once the File rows are committed. The scan worker looks
  // files up by key, and the client shouldn't get IDs for rows that might be rolled back.
  onTransactionCommitted(req, async () => {
    if (!res.headersSent) {
      if (error) {
        res.status(status).send({ error });
      } else {
        res.status(httpCodes.OK).send(fileResponse);
      }
    }
    await queueFilesForScan(fileResponse);
  });
  return undefined;
};

async function deleteActivityReportObjectiveFile(req, res) {
  const { fileId, reportId } = req.params;
  const { objectiveIds } = req.body;

  try {
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const [report] = await activityReportAndRecipientsById(parseInt(reportId, DECIMAL_BASE));
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

export { deleteActivityReportObjectiveFile, deleteHandler, uploadHandler };
