import join from 'url-join';
import {
  destroy,
} from './index';

const fileUrl = join('/', 'api', 'files');

export const uploadOnlyFile = async (data) => {
  const res = await fetch(join(fileUrl, 'upload'), {
    method: 'POST',
    credentials: 'same-origin',
    body: data,
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.json();
};

export const uploadFile = async (data) => {
  const res = await fetch(fileUrl, {
    method: 'POST',
    credentials: 'same-origin',
    body: data,
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.json();
};

export const uploadObjectivesFile = async (data) => {
  const res = await fetch(join(fileUrl, 'objectives'), {
    method: 'POST',
    credentials: 'same-origin',
    body: data,
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res.json();
};

export const deleteObjectiveFile = async (fileId, objectiveIds) => {
  const url = join(
    fileUrl,
    fileId.toString(),
    'objectives',
  );
  const res = await destroy(url, { objectiveIds });
  return res;
};

export const deleteFile = async (fileId) => {
  const url = join(
    fileUrl,
    fileId.toString(),
  );
  const res = await destroy(url);
  return res;
};

export const deleteReportFile = async (fileId, reportId) => {
  const url = join(
    fileUrl,
    'r',
    reportId.toString(),
    fileId.toString(),
  );
  const res = await destroy(url);
  return res;
};

export const removeActivityReportObjectiveFile = async (reportId, fileId, objectiveIds) => {
  const url = join(
    fileUrl,
    'report',
    reportId.toString(),
    'file',
    fileId.toString(),
  );
  const res = await destroy(url, { objectiveIds });
  return res;
};
