import {} from 'dotenv/config';
import fs from 'fs';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import join from 'url-join';
import { omit } from 'lodash';
import { INTERNAL_SERVER_ERROR } from 'http-codes';

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import { registerEventListener } from './processHandler';
import { hsesAuth } from './middleware/authMiddleware';
import { retrieveUserDetails } from './services/currentUser';
import cookieSession from './middleware/sessionMiddleware';

import { logger, auditLogger, requestLogger } from './logger';
import runCronJobs from './lib/cron';

const app = express();

const oauth2CallbackPath = '/oauth2-client/login/oauth2/code/';
let index;

registerEventListener();

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'dss') {
  index = fs.readFileSync(path.join(__dirname, '../client', 'index.html')).toString();
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
  // set the X-Content-Type-Options header to prevent MIME-sniffing
  res.set('X-Content-Type-Options', 'nosniff');

  // set nonce
  res.locals.nonce = crypto.randomBytes(16).toString('hex');

  // set CSP
  const cspMiddleware = helmet.contentSecurityPolicy({
    directives: {
      ...omit(
        helmet.contentSecurityPolicy.getDefaultDirectives(),
        'upgrade-insecure-requests',
        'block-all-mixed-content',
        'script-src',
        'img-src',
        'default-src',
        'style-src',
        'font-src',
      ),
      styleSrc: ["'self'", "'unsafe-inline'"],
      // styleSrc: ["'self'", `'nonce-${res.locals.nonce}'`,
      // "'sha256-7oERheaqPgauHfP5d4xw0v6p4MUYc+/Quwioe/4rjOI='", "'unsafe-inline'"],
      fontSrc: ["'self'", `'nonce-${res.locals.nonce}'`],
      'form-action': ["'self'"],
      scriptSrc: ["'self'", `'nonce-${res.locals.nonce}'`, '*.googletagmanager.com'],
      scriptSrcElem: ["'self'", `'nonce-${res.locals.nonce}'`, 'https://*.googletagmanager.com'],
      imgSrc: ["'self'", 'data:', 'www.googletagmanager.com', '*.google-analytics.com'],
      connectSrc: ["'self'", '*.google-analytics.com', '*.analytics.google.com', '*.googletagmanager.com'],
      defaultSrc: [
        "'self'",
        'wss://tta-smarthub-sandbox.app.cloud.gov',
        'wss://tta-smarthub-dev.app.cloud.gov',
        'wss://tta-smarthub-dev-green.app.cloud.gov',
        'wss://tta-smarthub-dev-blue.app.cloud.gov',
        'wss://tta-smarthub-dev-red.app.cloud.gov',
      ],
    },
  });
  cspMiddleware(req, res, next);
});

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'dss') {
  app.use('/index.html', serveIndex);
  app.use(express.static(path.join(__dirname, '../client'), { index: false }));
}

app.use('/api/v1', require('./routes/externalApi').default);
app.use('/api', require('./routes/apiDirectory').default);

// Disable "X-Powered-By" header
app.disable('x-powered-by');

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

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'dss') {
  app.use('*', serveIndex);
}

runCronJobs();

export default app;
