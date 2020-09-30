import join from 'url-join';

const callApi = async (url) => {
  const res = await fetch(url, {
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
};

export const fetchLogout = async () => {
  await callApi(join('api', 'logout'));
};

export const fetchUser = async () => {
  const res = await callApi(join('api', 'user'));
  return res.json();
};
