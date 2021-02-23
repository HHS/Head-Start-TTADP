import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import handleErrors from '../../lib/apiErrorHandler';
import { File } from '../../models';
import { uploadFile } from '../../lib/s3';
import addToScanQueue from '../../services/scanQueue';

import ActivityReportPolicy from '../../policies/activityReport';
import { activityReportById } from '../../services/activityReports';
import { userById } from '../../services/users';
import { auditLogger } from '../../logger';

const fileType = require('file-type');
const multiparty = require('multiparty');

const namespace = 'SERVICE:FILES';

const ATTACHMENT = 'ATTACHMENT';
const RESOURCE = 'RESOURCE';

const logContext = {
  namespace,
};

const fileStatuses = {
  uploading: 'UPLOADING',
  uploaded: 'UPLOADED',
  uploadFailed: 'UPLOAD_FAILED',
  queued: 'SCANNING_QUEUED',
  queueingFailed: 'QUEUEING_FAILED',
  scanning: 'SCANNING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};

export const createFileMetaData = async (
  originalFileName, s3FileName, reportId, attachmentType, fileSize) => {
  const newFile = {
    activityReportId: reportId,
    originalFileName,
    attachmentType,
    key: s3FileName,
    status: fileStatuses.uploading,
    fileSize,
  };
  let file;
  try {
    file = await File.create(newFile);
    return file.dataValues;
  } catch (error) {
    return error;
  }
};

export const updateStatus = async (fileId, fileStatus) => {
  let file;
  try {
    file = await File.update({ status: fileStatus }, { where: { id: fileId } });
    return file.dataValues;
  } catch (error) {
    return error;
  }
};

export default async function uploadHandler(req, res) {
  const form = new multiparty.Form();
  form.parse(req, async (error, fields, files) => {
    const { reportId, attachmentType } = fields;
    if (error) {
      res.status(500).send(error);
    }
    let buffer;
    let metadata;
    let fileName;
    let type;

    const user = await userById(req.session.userId);
    const report = await activityReportById(reportId);
    const authorization = new ActivityReportPolicy(user, report);

    if (!authorization.canUpdate()) {
      res.sendStatus(403);
      return;
    }

    try {
      if (!files.file) {
        res.status(400).send({ error: 'file required' });
        return;
      }
      const { path, originalFilename, size } = files.file[0];
      if (!size) {
        res.status(400).send({ error: 'fileSize required' });
      }
      if (!reportId) {
        res.status(400).send({ error: 'reportId required' });
        return;
      }
      if (!attachmentType) {
        res.status(400).send({ error: 'attachmentType required' });
        return;
      }
      if (attachmentType[0] !== ATTACHMENT && attachmentType[0] !== RESOURCE) {
        res.status(400).send({ error: `incorrect attachmentType. Wanted: ${ATTACHMENT} or ${RESOURCE}. Got: ${attachmentType[0]}` });
        return;
      }
      buffer = fs.readFileSync(path);
      type = await fileType.fromFile(path);
      if (!type) {
        res.status(400).send('Could not determine file type');
        return;
      }
      fileName = `${uuidv4()}.${type.ext}`;
      metadata = await createFileMetaData(
        originalFilename,
        fileName,
        reportId,
        attachmentType[0],
        size,
      );
    } catch (err) {
      await handleErrors(req, res, err, logContext);
      return;
    }
    try {
      await uploadFile(buffer, fileName, type);
      await updateStatus(metadata.id, fileStatuses.uploaded);
      res.status(200).send({ id: metadata.id });
    } catch (err) {
      if (metadata) {
        await updateStatus(metadata.id, fileStatuses.uploadFailed);
      }
      await handleErrors(req, res, err, logContext);
      return;
    }
    try {
      await addToScanQueue({ key: metadata.key });
      await updateStatus(metadata.id, fileStatuses.queued);
    } catch (err) {
      if (metadata) {
        await updateStatus(metadata.id, fileStatuses.queueingFailed);
        auditLogger.error(`${logContext} Failed to queue ${metadata.originalFileName}. Error: ${err}`);
      }
    }
  });
}
