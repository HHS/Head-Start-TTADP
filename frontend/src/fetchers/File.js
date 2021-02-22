import join from 'url-join';

const activityReportUrl = join('/', 'api', 'files');

export default async function uploadFile(data) {
  const res = await fetch(activityReportUrl, {
    method: 'POST',
    credentials: 'same-origin',
    body: data,
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
}

export const deleteFile = async (fileId) => {
  const res = await fetch(join(activityReportUrl,fileId), {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
}