import {} from 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import axios from 'axios';
import cookieSession from 'cookie-session';
import path from 'path';
import join from 'url-join';
import { omit } from 'lodash';
import isEmail from 'validator/lib/isEmail';
import { INTERNAL_SERVER_ERROR } from 'http-codes';
import { CronJob } from 'cron';
import { hsesAuth } from './middleware/authMiddleware';
import updateGrantsGrantees from './lib/updateGrantsGrantees';

import findOrCreateUser from './services/accessValidation';

import { logger, auditLogger, requestLogger } from './logger';

const app = express();

const oauth2CallbackPath = '/oauth2-client/login/oauth2/code/';

app.use(requestLogger);
app.use(express.json({ limit: '2MB' }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...omit(helmet.contentSecurityPolicy.getDefaultDirectives(), 'upgrade-insecure-requests', 'block-all-mixed-content', 'script-src', 'img-src', 'default-src'),
      'form-action': ["'self'"],
      scriptSrc: ["'self'", 'https://touchpoints.app.cloud.gov/touchpoints/7d519b5e.js'],
      // imgSrc: ["'self'", 'data:', 'https://touchpoints.app.cloud.gov/assets/us_flag_small-9c507b1ff21f65c4b8f0c45d0e0d0a10bb5c9864c1a76e07aa3293da574968a1.png'],
      imgSrc: ["'self'", 'data:', 'https://touchpoints.app.cloud.gov/*'],
      defaultSrc: ["'self'", 'https://touchpoints.app.cloud.gov/touchpoints/7d519b5e/submissions.json'],
    },
  },
}));

app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET],

  // Cookie Options. httpOnly is set by default to true for https
  sameSite: 'lax',
  secureProxy: (process.env.NODE_ENV === 'production'),
}));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client')));
}

app.use('/api', require('./routes/apiDirectory').default);

// TODO: change `app.get...` with `router.get...` once our oauth callback has been updated
app.get(oauth2CallbackPath, async (req, res) => {
  try {
    const user = await hsesAuth.code.getToken(req.originalUrl);
    // user will have accessToken and refreshToken
    const requestObj = user.sign({
      method: 'get',
      url: `${process.env.AUTH_BASE}/auth/user/me`,
    });

    const { url } = requestObj;
    const { data } = await axios.get(url, requestObj);

    logger.debug(`User details response data: ${JSON.stringify(data, null, 2)}`);

    let name; let username; let userId; let
      authorities;
    if (data.principal.attributes) { // PIV card use response
      name = data.name;
      username = data.principal.attributes.user.username;
      userId = data.principal.attributes.user.userId;
      authorities = data.principal.attributes.user.authorities;
    } else {
      name = data.name;
      username = data.principal.username;
      userId = data.principal.userId;
      authorities = data.principal.authorities;
    }

    let email = null;
    if (isEmail(username)) {
      email = username;
    }

    const dbUser = await findOrCreateUser({
      name,
      email,
      hsesUsername: username,
      hsesAuthorities: authorities.map(({ authority }) => authority),
      hsesUserId: userId.toString(),
    });

    req.session.userId = dbUser.id;
    auditLogger.info(`User ${dbUser.id} logged in`);

    logger.debug(`referrer path: ${req.session.referrerPath}`);
    res.redirect(join(process.env.TTA_SMART_HUB_URI, req.session.referrerPath || ''));
  } catch (error) {
    auditLogger.error(`Error logging in: ${error}`);
    res.status(INTERNAL_SERVER_ERROR).end();
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });
}

// Set timing parameters.
// Run at 4 am ET
const schedule = '0 4 * * *';
const timezone = 'America/New_York';

const runJob = () => {
  try {
    return updateGrantsGrantees();
  } catch (error) {
    auditLogger.error(`Error processing HSES file: ${error}`);
    logger.error(error.stack);
  }
  return false;
};

// Run only on one instance
if (process.env.CF_INSTANCE_INDEX === '0') {
  const job = new CronJob(schedule, () => runJob(), null, true, timezone);
  job.start();
}

module.exports = app;
