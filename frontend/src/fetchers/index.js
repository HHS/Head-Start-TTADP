export class HTTPError extends Error {
  constructor(statusCode, message, ...params) {
    super(message, ...params);
    this.name = 'HTTPError';
    this.status = statusCode;
    this.statusText = message;
  }
}

export const get = async (url) => {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
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
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  return res;
};
