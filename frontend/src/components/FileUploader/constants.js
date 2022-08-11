import { uploadFile } from '../../fetchers/File';

export const upload = async (file, reportId, objectiveId, setErrorMessage) => {
  let res;

  try {
    const data = new FormData();
    data.append(reportId ? 'reportId' : 'objectiveId', reportId || objectiveId);
    data.append('file', file);
    res = await uploadFile(data);
  } catch (error) {
    setErrorMessage(`${file.name} failed to upload`);
    // eslint-disable-next-line no-console
    console.log(error);
    return null;
  }
  setErrorMessage(null);
  return {
    id: res.id, originalFileName: file.name, fileSize: file.size, status: 'UPLOADED', url: res.url,
  };
};

export const handleDrop = async (e, reportId, objectiveId, id, onChange, setErrorMessage) => {
  if (reportId === 'new') {
    setErrorMessage('Cannot save attachments without a Recipient or Other entity selected');
    return;
  }

  if (typeof objectiveId === 'string') {
    setErrorMessage('A TTA Objective must be entered before adding attachments');
    return;
  }
  const newFiles = e.map((file) => upload(file, reportId, objectiveId, setErrorMessage));
  Promise.all(newFiles).then((values) => {
    onChange(values);
  });
};

export const getStatus = (status) => {
  switch (status) {
    case 'UPLOADING':
      return 'Uploading';
    case 'UPLOADED':
      return 'Uploaded';
    case 'UPLOAD_FAILED':
      return 'Upload Failed';
    case 'SCANNING_QUEUED':
      return 'Scanning';
    case 'QUEUEING_FAILED':
      return 'Upload Failed';
    case 'SCANNING':
      return 'Scanning';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    default:
      break;
  }
  return 'Upload Failed';
};
