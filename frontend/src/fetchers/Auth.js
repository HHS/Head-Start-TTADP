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
  try {
    await callApi(join('api', 'logout'));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('error logging out, ignoring');
  }
};

export const fetchUser = async () => {
  const res = await callApi(join('/', 'api', 'user'));
  return res.json();
};
