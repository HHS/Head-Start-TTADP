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
//TODO: handle ActivityReportObjectiveFiles, ObjectiveFiles, and ObjectiveTemplateFiles

export const deleteHandler = async (req, res) => {
  const { reportId, objectiveId, fileId } = req.params;
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

//TODO: handle ActivityReportObjectiveFiles, ObjectiveFiles, and ObjectiveTemplateFiles
const parseFormPromise = (req) => new Promise((resolve, reject) => {
  const form = new multiparty.Form();
  form.parse(req, (err, fields, files) => {
    if (err) {
      return reject(err);
    }
    return resolve([fields, files]);
  });
});

export default async function uploadHandler(req, res) {
  const [fields, files] = await parseFormPromise(req);
  const { reportId } = fields;
  let buffer;
  let metadata;
  let fileName;
  let fileTypeToUse;

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
    /*
      * NOTE: file-type: https://github.com/sindresorhus/file-type
      * This package is for detecting binary-based file formats,
      * !NOT text-based formats like .txt, .csv, .svg, etc.
      * We need to handle TXT and CSV in our code.
      */
    const type = await fileType.fromFile(path);
    let altFileType;
    if (!type) {
      const matchingAltType = altFileTypes.filter((t) => path.endsWith(t.ext));
      if (!matchingAltType || !matchingAltType.length > 0) {
        return res.status(400).send('Could not determine file type');
      }
      altFileType = { ext: matchingAltType[0].ext, mime: matchingAltType[0].mime };
    }
    fileTypeToUse = altFileType || type;
    fileName = `${uuidv4()}.${fileTypeToUse.ext}`;
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
    const uploadedFile = await uploadFile(buffer, fileName, fileTypeToUse);
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
}
