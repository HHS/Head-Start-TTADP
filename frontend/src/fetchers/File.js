import join from 'url-join';

const fileUrl = join('/', 'api', 'files');

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

export const deleteFile = async (fileId, reportId) => {
  const res = await fetch(join(fileUrl, reportId.toString(), fileId.toString()), {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
};
