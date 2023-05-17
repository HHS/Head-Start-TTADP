// import { Request, Response } from 'express';

export default function testingOnly(req, res, next) {
  const isLocal = process.env.NODE_ENV === 'development'
    || process.env.NODE_ENV === 'test';
  const isCircleCI = process.env.CIRCLECI_AUTH_TOKEN !== undefined
    && process.env.CIRCLECI_AUTH_TOKEN !== null;

  if (isLocal || isCircleCI) {
    // Allow access for local development or CircleCI
    next();
  } else {
    // Deny access for other environments
    res.status(403).send('Access denied');
  }
}
