import type { Response } from 'express';

export function serviceError(statusCode: number, message: string, responseBody?: object) {
  return Object.assign(new Error(message), {
    statusCode,
    ...(responseBody ? { responseBody } : {}),
  });
}

export function respondWithServiceError(res: Response, error): boolean {
  if (!Number.isInteger(error?.statusCode) || error.statusCode < 400 || error.statusCode >= 500) {
    return false;
  }

  if (error.responseBody) {
    res.status(error.statusCode).json(error.responseBody);
  } else {
    res.sendStatus(error.statusCode);
  }
  return true;
}
