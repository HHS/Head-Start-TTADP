//import { Request, Response } from 'express';

export function  testingOnly(req, res, next) {
  const isLocal = process.env.NODE_ENV === 'development';
  const isCircleCI = process.env.CIRCLECI === 'true';

  if (isLocal || isCircleCI) {
    // Allow access for local development or CircleCI
    next();
  } else {
    // Deny access for other environments
    res.status(403).send('Access denied');
  }
}
