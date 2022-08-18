import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import handleErrors from '../../lib/apiErrorHandler';
import { uploadFile, deleteFileFromS3, getPresignedURL } from '../../lib/s3';
import addToScanQueue from '../../services/scanQueue';
import {
  deleteFile,
  deleteActivityReportFile,
  deleteActivityReportObjectiveFile,
  deleteObjectiveFile,
  deleteObjectiveTemplateFile,
  getFileById,
  updateStatus,
  createActivityReportFileMetaData,
  createActivityReportObjectiveFileMetaData,
  createObjectiveFileMetaData,
  createObjectiveTemplateFileMetaData,
  createFileMetaData,
  createObjectivesFileMetaData,
} from '../../services/files';
import { ActivityReportObjective } from '../../models';
import ActivityReportPolicy from '../../policies/activityReport';
import ObjectivePolicy from '../../policies/objective';
import { activityReportAndRecipientsById } from '../../services/activityReports';
import { userById } from '../../services/users';
import { getObjectiveById } from '../../services/objectives';
import { validateUserAuthForAdmin } from '../../services/accessValidation';
import { auditLogger } from '../../logger';
import { FILE_STATUSES, DECIMAL_BASE } from '../../constants';
import Users from '../../policies/user';

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

const deleteOnlyFile = async (req, res) => {
  const { fileId } = req.params;

  const user = await userById(req.session.userId);
  const policy = new Users(user);
  if (!policy.canWriteInAtLeastOneRegion) {
    return res.status(400).send({ error: 'Write permissions required' });
  }

  try {
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
    reportObjectiveId,
    objectiveId,
    objectiveTemplateId,
    fileId,
  } = req.params;

  const user = await userById(req.session.userId);

  try {
    let file = await getFileById(fileId);

    if (reportId) {
      if (!await hasReportAuthorization(user, reportId)) {
        res.sendStatus(403);
        return;
      }
      const rf = file.reportFiles.find((r) => r.reportId === reportId);
      if (rf) {
        await deleteActivityReportFile(rf.id);
      }
    } else if (reportObjectiveId) {
      const activityReportObjective = ActivityReportObjective.findOne(
        { where: { id: reportObjectiveId } },
      );
      if (!await hasReportAuthorization(
        user,
        activityReportObjective.activityReportId,
      )
      ) {
        res.sendStatus(403);
        return;
      }
      const rof = file.reportObjectiveFiles.find((r) => r.reportObjectiveId === reportObjectiveId);
      if (rof) {
        await deleteActivityReportObjectiveFile(rof.id);
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
    } else if (objectiveTemplateId) {
      // TODO: Determine how to handle permissions for objective templates.
      const otf = file.objectiveTemplateFiles
        .find((r) => r.objectiveTempleteId === objectiveTemplateId);
      if (otf) {
        await deleteObjectiveTemplateFile(otf.id);
      }
    }
    file = await getFileById(fileId);
    if (file.reports.length
      + file.reportObjectiveFiles.length
      + file.objectiveFiles.length
      + file.objectiveTemplateFiles.length === 0) {
      await deleteFileFromS3(file.key);
      await deleteFile(fileId);
    }
    res.status(204).send();
  } catch (error) {
    handleErrors(req, res, error, logContext);
  }
};

const linkHandler = async (req, res) => {
  const {
    reportId,
    reportObjectiveId,
    objectiveId,
    objectiveTempleteId,
    fileId,
  } = req.params;

  const user = await userById(req.session.userId);
  const [report] = await activityReportAndRecipientsById(reportId);
  const authorization = new ActivityReportPolicy(user, report);

  if (!authorization.canUpdate()) {
    res.sendStatus(403);
    return;
  }
  try {
    const file = await getFileById(fileId);
    if (reportId
      && !(reportId in file.reportFiles.map((r) => r.activityReportId))) {
      createActivityReportFileMetaData(
        file.originalFilename,
        file.fileName,
        reportId,
        file.size,
      );
    } else if (reportObjectiveId
      && !(reportObjectiveId in file.reportObjectiveFiles.map((aro) => aro.reportObjectiveId))) {
      createActivityReportObjectiveFileMetaData(
        file.originalFilename,
        file.fileName,
        reportObjectiveId,
        file.size,
      );
    } else if (objectiveId
      && !(objectiveId in file.objectiveFiles.map((r) => r.objectiveId))) {
      createObjectiveFileMetaData(
        file.originalFilename,
        file.fileName,
        reportId,
        file.size,
      );
    } else if (objectiveTempleteId
      && !(objectiveTempleteId in file.objectiveTemplateFiles.map((r) => r.objectiveTempleteId))) {
      createObjectiveTemplateFileMetaData(
        file.originalFilename,
        file.fileName,
        objectiveTempleteId,
        file.size,
      );
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

const onlyFileUploadHandler = async (req, res) => {
  const [, files] = await parseFormPromise(req);
  let buffer;
  let metadata;
  let fileName;
  let fileTypeToUse;

  try {
    const user = await userById(req.session.userId);

    const policy = new Users(user);
    if (!policy.canWriteInAtLeastOneRegion) {
      return res.status(400).send({ error: 'Write permissions required' });
    }

    if (!files.file) {
      return res.status(400).send({ error: 'file required' });
    }
    const { path, originalFilename, size } = files.file[0];
    if (!size) {
      return res.status(400).send({ error: 'fileSize required' });
    }
    buffer = fs.readFileSync(path);
    /*
      * NOTE: file-type: https://github.com/sindresorhus/file-type
      * This package is for detecting binary-based file formats,
      * !NOT text-based formats like .txt, .csv, .svg, etc.
      * We need to handle TXT and CSV in our code.
      */

    fileTypeToUse = await determineFileTypeFromPath(path);
    if (!fileTypeToUse) {
      return res.status(500).send('Could not determine file type');
    }
    fileName = `${uuidv4()}${fileTypeToUse.ext}`;

    metadata = await createFileMetaData(originalFilename, fileName, size);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }

  try {
    const uploadedFile = await uploadFile(buffer, fileName, fileTypeToUse);
    const url = getPresignedURL(uploadedFile.key);
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
    return updateStatus(metadata.id, QUEUED);
  } catch (err) {
    auditLogger.error(`${logContext} Failed to queue ${metadata.originalFileName}. Error: ${err}`);
    await updateStatus(metadata.id, QUEUEING_FAILED);
    return handleErrors(req, res, err, logContext);
  }
};

const uploadHandler = async (req, res) => {
  const [fields, files] = await parseFormPromise(req);
  const {
    reportId,
    reportObjectiveId,
    objectiveId,
    objectiveTempleteId,
  } = fields;
  let buffer;
  let metadata;
  let fileName;
  let fileTypeToUse;

  const user = await userById(req.session.userId);

  try {
    if (!files.file) {
      return res.status(400).send({ error: 'file required' });
    }
    const { path, originalFilename, size } = files.file[0];
    if (!size) {
      return res.status(400).send({ error: 'fileSize required' });
    }
    if (!reportId && !reportObjectiveId && !objectiveId && !objectiveTempleteId) {
      return res.status(400).send({ error: 'an id of either reportId, reportObjectiveId, objectiveId, or objectiveTempleteId is required' });
    }
    buffer = fs.readFileSync(path);

    fileTypeToUse = await determineFileTypeFromPath(path);
    if (!fileTypeToUse) {
      return res.status(500).send('Could not determine file type');
    }

    fileName = `${uuidv4()}${fileTypeToUse.ext}`;
    if (reportId) {
      if (!(await hasReportAuthorization(user, reportId)
        || (await validateUserAuthForAdmin(req.session.userId)))) {
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
      || (await validateUserAuthForAdmin(req.session.userId)))) {
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
      if (!(objectivePolicy.canUpdate()
      || (await validateUserAuthForAdmin(req.session.userId)))) {
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
    }
  } catch (err) {
    return handleErrors(req, res, err, logContext);
  }
  try {
    const uploadedFile = await uploadFile(buffer, fileName, fileTypeToUse);
    const url = getPresignedURL(uploadedFile.key);
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
    return updateStatus(metadata.id, QUEUED);
  } catch (err) {
    auditLogger.error(`${logContext} Failed to queue ${metadata.originalFileName}. Error: ${err}`);
    return updateStatus(metadata.id, QUEUEING_FAILED);
  }
};

const uploadObjectivesFile = async (req, res) => {
  const [fields, files] = await parseFormPromise(req);
  let {
    objectiveIds,
  } = fields;
  let buffer;
  let metadata;
  let fileName;
  let fileTypeToUse;

  const user = await userById(req.session.userId);

  try {
    if (!files.file) {
      return res.status(400).send({ error: 'file required' });
    }
    const { path, originalFilename, size } = files.file[0];
    if (!size) {
      return res.status(400).send({ error: 'fileSize required' });
    }

    objectiveIds = JSON.parse(objectiveIds);

    if (!objectiveIds || !objectiveIds.length) {
      return res.status(400).send({ error: 'objective ids are required' });
    }
    buffer = fs.readFileSync(path);

    fileTypeToUse = await determineFileTypeFromPath(path);
    if (!fileTypeToUse) {
      return res.status(400).send('Could not determine file type');
    }

    fileName = `${uuidv4()}${fileTypeToUse.ext}`;

    const authorizations = await Promise.all(objectiveIds.map(async (objectiveId) => {
      const objective = await getObjectiveById(objectiveId);
      const objectivePolicy = new ObjectivePolicy(objective, user);
      if (!objectivePolicy.canUpdate()) {
        const admin = await validateUserAuthForAdmin(req.session.userId);
        if (!admin) {
          return false;
        }
      }
      return true;
    }));

    if (!authorizations.every((auth) => auth)) {
      return res.sendStatus(403);
    }

    metadata = await createObjectivesFileMetaData(
      originalFilename,
      fileName,
      objectiveIds,
      size,
    );
  } catch (err) {
    return handleErrors(req, res, err, logContext);
  }

  try {
    const uploadedFile = await uploadFile(buffer, fileName, fileTypeToUse);
    const url = getPresignedURL(uploadedFile.key);
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
    return updateStatus(metadata.id, QUEUED);
  } catch (err) {
    auditLogger.error(`${logContext} Failed to queue ${metadata.originalFileName}. Error: ${err}`);
    return updateStatus(metadata.id, QUEUEING_FAILED);
  }
};

export {
  deleteHandler,
  linkHandler,
  uploadHandler,
  onlyFileUploadHandler,
  deleteOnlyFile,
  uploadObjectivesFile,
};
