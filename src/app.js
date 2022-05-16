import {} from 'dotenv/config';
import fs from 'fs';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import join from 'url-join';
import { omit } from 'lodash';
import { INTERNAL_SERVER_ERROR } from 'http-codes';
import { CronJob } from 'cron';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import { hsesAuth } from './middleware/authMiddleware';
import { retrieveUserDetails } from './services/currentUser';
import cookieSession from './middleware/sessionMiddleware';
import updateGrantsRecipients from './lib/updateGrantsRecipients';
import { logger, auditLogger, requestLogger } from './logger';

const app = express();

const oauth2CallbackPath = '/oauth2-client/login/oauth2/code/';

app.use(requestLogger);
app.use(express.json({ limit: '2MB' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('hex');
  const cspMiddleware = helmet.contentSecurityPolicy({
    directives: {
      ...omit(helmet.contentSecurityPolicy.getDefaultDirectives(), 'upgrade-insecure-requests', 'block-all-mixed-content', 'script-src', 'img-src', 'default-src'),
      'form-action': ["'self'"],
      scriptSrc: ["'self'", 'https://touchpoints.app.cloud.gov*', '*.googletagmanager.com'],
      scriptSrcElem: ["'self'", 'https://*.googletagmanager.com', `'nonce-${res.locals.nonce}'`],
      imgSrc: ["'self'", 'data:', 'https://touchpoints.app.cloud.gov', 'www.googletagmanager.com', '*.google-analytics.com'],
      connectSrc: ["'self'", '*.google-analytics.com', '*.analytics.google.com', '*.googletagmanager.com'],
      defaultSrc: ["'self'"],
    },
  });
  cspMiddleware(req, res, next);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client')));
}

app.use('/api/v1', require('./routes/externalApi').default);

app.use('/api', require('./routes/apiDirectory').default);

// TODO: change `app.get...` with `router.get...` once our oauth callback has been updated
app.get(oauth2CallbackPath, cookieSession, async (req, res) => {
  try {
    const user = await hsesAuth.code.getToken(req.originalUrl);
    // user will have accessToken and refreshToken
    logger.debug(`HSES AccessToken: ${user.accessToken}`);

    const dbUser = await retrieveUserDetails(user);
    req.session.userId = dbUser.id;
    req.session.uuid = uuidv4();
    auditLogger.info(`User ${dbUser.id} logged in`);

    logger.debug(`referrer path: ${req.session.referrerPath}`);
    res.redirect(join(process.env.TTA_SMART_HUB_URI, req.session.referrerPath || ''));
  } catch (error) {
    auditLogger.error(`Error logging in: ${error}`);
    res.status(INTERNAL_SERVER_ERROR).end();
  }
});

if (process.env.NODE_ENV === 'production') {
  const html = fs.readFileSync(path.join(__dirname, 'client', 'index.html')).toString();

  app.use('*', (req, res) => {
    const noncedIndex = html.replaceAll('__NONCE__', res.locals.nonce);
    res.set('Content-Type', 'text/html');
    res.send(noncedIndex);
  });
}

// Set timing parameters.
// Run at 4 am ET
const schedule = '0 4 * * *';
const timezone = 'America/New_York';

const runJob = () => {
  try {
    return updateGrantsRecipients();
  } catch (error) {
    auditLogger.error(`Error processing HSES file: ${error}`);
    logger.error(error.stack);
  }
  return false;
};

// Run only on one instance
if (process.env.CF_INSTANCE_INDEX === '0' && process.env.NODE_ENV === 'production') {
  const job = new CronJob(schedule, () => runJob(), null, true, timezone);
  job.start();
}

export default app;
