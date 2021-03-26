import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import handleErrors from '../../lib/apiErrorHandler';
import { uploadFile, deleteFileFromS3, getPresignedURL } from '../../lib/s3';
import addToScanQueue from '../../services/scanQueue';
import createFileMetaData, {
  updateStatus, getFileById, deleteFile,
} from '../../services/files';
import ActivityReportPolicy from '../../policies/activityReport';
import { activityReportById } from '../../services/activityReports';
import { userById } from '../../services/users';
import { validateUserAuthForAdmin } from '../../services/accessValidation';
import { auditLogger } from '../../logger';
import { FILE_STATUSES } from '../../constants';

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

export const deleteHandler = async (req, res) => {
  const { reportId, fileId } = req.params;
  if (!reportId || !fileId) {
    res.status(400).send(`Delete requests must contain reportId/fileId got: ${req.path}`);
  }
  const user = await userById(req.session.userId);
  const report = await activityReportById(reportId);
  const authorization = new ActivityReportPolicy(user, report);

  if (!authorization.canUpdate()) {
    res.sendStatus(403);
    return;
  }
  try {
    const file = await getFileById(fileId);
    await deleteFileFromS3(file.key);
    await deleteFile(fileId);
    res.status(204).send();
  } catch (error) {
    handleErrors(req, res, error, logContext);
  }
};

export default async function uploadHandler(req, res) {
  const form = new multiparty.Form();
  await form.parse(req, async (error, fields, files) => {
    const { reportId } = fields;
    if (error) {
      return res.status(500).send(error);
    }
    let buffer;
    let metadata;
    let fileName;
    let type;

    const user = await userById(req.session.userId);
    const report = await activityReportById(reportId);
    const authorization = new ActivityReportPolicy(user, report);

    if (!(authorization.canUpdate() || (await validateUserAuthForAdmin(req.session.userId)))) {
      return res.sendStatus(403);
    }

    try {
      if (!files.file) {
        return res.status(400).send({ error: 'file required' });
      }
      const { path, originalFilename, size } = files.file[0];
      if (!size) {
        return res.status(400).send({ error: 'fileSize required' });
      }
      if (!reportId) {
        return res.status(400).send({ error: 'reportId required' });
      }
      buffer = fs.readFileSync(path);
      type = await fileType.fromFile(path);
      if (!type) {
        return res.status(400).send('Could not determine file type');
      }
      fileName = `${uuidv4()}.${type.ext}`;
      metadata = await createFileMetaData(
        originalFilename,
        fileName,
        reportId,
        size,
      );
    } catch (err) {
      return handleErrors(req, res, err, logContext);
    }
    try {
      const uploadedFile = await uploadFile(buffer, fileName, type);
      const url = getPresignedURL(uploadedFile.key);
      await updateStatus(metadata.id, UPLOADED);
      res.status(200).send({ id: metadata.id, url });
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
  });
}
