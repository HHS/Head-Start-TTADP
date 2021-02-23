import join from 'url-join';

const fileUrl = join('/', 'api', 'files');

export default async function uploadFile(data) {
  const res = await fetch(fileUrl, {
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
  const res = await fetch(join(fileUrl, fileId.toString()), {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
};
