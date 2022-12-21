import { isNaN } from 'lodash';
import { LOCAL_STORAGE_IMPERSONATION_KEY } from '../Constants';

export class HTTPError extends Error {
  constructor(statusCode, message, ...params) {
    super(message, ...params);
    this.name = 'HTTPError';
    this.status = statusCode;
    this.statusText = message;
  }
}

const impersonationHeader = () => {
  const impersonationId = localStorage.getItem(LOCAL_STORAGE_IMPERSONATION_KEY);

  if (isNaN(impersonationId) || typeof impersonationId === 'undefined') {
    return {};
  }

  return {
    'Auth-Impersonation-Id': impersonationId,
  };
};

export const get = async (url) => {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...impersonationHeader(),
    },
  });
  if (!res.ok) {
    throw new HTTPError(res.status, res.statusText);
  }
  return res;
};

export const put = async (url, data) => {
  const res = await fetch(url, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...impersonationHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
};

export const post = async (url, data) => {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...impersonationHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
};

/*
 * Note: Due to `delete` being a keyword, we'll settle with `destroy`
 */
export const destroy = async (url, data) => {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...impersonationHeader(),
    },
    body: data ? JSON.stringify(data) : '',
  });

  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
};
