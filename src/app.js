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
import {
  approvedDigest, changesRequestedDigest, collaboratorDigest, submittedDigest,
} from './lib/mailer';
import { EMAIL_DIGEST_FREQ } from './constants';

const app = express();
const oauth2CallbackPath = '/oauth2-client/login/oauth2/code/';
let index;

if (process.env.NODE_ENV === 'production') {
  index = fs.readFileSync(path.join(__dirname, 'client', 'index.html')).toString();
}

const serveIndex = (req, res) => {
  const noncedIndex = index.replaceAll('__NONCE__', res.locals.nonce);
  res.set('Content-Type', 'text/html');
  res.send(noncedIndex);
};

app.use(requestLogger);
app.use(express.json({ limit: '2MB' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('hex');
  const cspMiddleware = helmet.contentSecurityPolicy({
    directives: {
      ...omit(helmet.contentSecurityPolicy.getDefaultDirectives(), 'upgrade-insecure-requests', 'block-all-mixed-content', 'script-src', 'img-src', 'default-src'),
      'form-action': ["'self'"],
      scriptSrc: ["'self'", '*.googletagmanager.com'],
      scriptSrcElem: ["'self'", 'https://*.googletagmanager.com', `'nonce-${res.locals.nonce}'`],
      imgSrc: ["'self'", 'data:', 'www.googletagmanager.com', '*.google-analytics.com'],
      connectSrc: ["'self'", '*.google-analytics.com', '*.analytics.google.com', '*.googletagmanager.com'],
      defaultSrc: ["'self'"],
    },
  });
  cspMiddleware(req, res, next);
});

if (process.env.NODE_ENV === 'production') {
  app.use('/index.html', serveIndex);
  app.use(express.static(path.join(__dirname, 'client'), { index: false }));
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
  app.use('*', serveIndex);
}

// Set timing parameters.
// Run at 4 am ET
const schedule = '0 4 * * *';
// const dailyEmailDigestSchedule = '*/10 * * * * *';
// Run daily at 2 am
// const dailySched = '0 2 * * *';
const dailySched = '*/30 * * * *';
// Run at 2 am every Monday
const weeklySched = '0 2 * * 1';
// Run at 2 am on the first of the month
const monthlySched = '0 2 1 * *';
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

const runDailyEmailJob = () => {
  (async () => {
    try {
      await collaboratorDigest(EMAIL_DIGEST_FREQ.DAILY);
      await changesRequestedDigest(EMAIL_DIGEST_FREQ.DAILY);
      await submittedDigest(EMAIL_DIGEST_FREQ.DAILY);
      await approvedDigest(EMAIL_DIGEST_FREQ.DAILY);
    } catch (error) {
      auditLogger.error(`Error processing Daily Email Digest job: ${error}`);
      logger.error(`Daily Email Digest Error: ${error.stack}`);
    }
  })();
  return true;
};

const runMonthlyEmailJob = () => {
  (async () => {
    try {
      await collaboratorDigest(EMAIL_DIGEST_FREQ.WEEKLY);
      await changesRequestedDigest(EMAIL_DIGEST_FREQ.WEEKLY);
      await submittedDigest(EMAIL_DIGEST_FREQ.WEEKLY);
      await approvedDigest(EMAIL_DIGEST_FREQ.WEEKLY);
    } catch (error) {
      auditLogger.error(`Error processing Weekly Email Digest job: ${error}`);
      logger.error(`Monthly Email Digest Error: ${error.stack}`);
    }
  })();
  return true;
};

const runWeeklyEmailJob = () => {
  (async () => {
    try {
      await collaboratorDigest(EMAIL_DIGEST_FREQ.MONTHLY);
      await changesRequestedDigest(EMAIL_DIGEST_FREQ.MONTHLY);
      await submittedDigest(EMAIL_DIGEST_FREQ.MONTHLY);
      await approvedDigest(EMAIL_DIGEST_FREQ.MONTHLY);
    } catch (error) {
      auditLogger.error(`Error processing Daily Email Digest job: ${error}`);
      logger.error(`Weekly Email Digest Error: ${error.stack}`);
    }
  })();
  return true;
};

// TODO: to be removed; leaving it here temporarily for any non-prod testing
const dailyJob = new CronJob(dailySched, () => runDailyEmailJob(), null, true, timezone);
dailyJob.start();

// Run only on one instance
if (process.env.CF_INSTANCE_INDEX === '0' && process.env.NODE_ENV === 'production') {
  const job = new CronJob(schedule, () => runJob(), null, true, timezone);
  job.start();
  // TODO: Uncomment this when going into prod
  // const dailyJob= new CronJob(dailySched, () => runDailyEmailJob(), null, true, timezone);
  // dailyJob.start();
  const weeklyJob = new CronJob(weeklySched, () => runWeeklyEmailJob(), null, true, timezone);
  weeklyJob.start();
  const monthlyJob = new CronJob(monthlySched, () => runMonthlyEmailJob(), null, true, timezone);
  monthlyJob.start();
}

export default app;
