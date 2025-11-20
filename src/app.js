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
import { getAccessToken, getUserInfo } from './middleware/authMiddleware';
import { getPublicJwk } from './middleware/jwkKeyManager';
import { retrieveUserDetails } from './services/currentUser';
import sessionMiddleware from './middleware/sessionMiddleware';

import { logger, auditLogger, requestLogger } from './logger';
import runCronJobs from './lib/cron';
import sanitizeUrlParams from './middleware/sanitizeUrlParams';

const app = express();

// Behind cloud.gov’s router/LB the app sees HTTP from the proxy even though the client used HTTPS.
// Tell Express to trust the first proxy so req.secure reflects X-Forwarded-Proto === 'https'.
app.set('trust proxy', 1);

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

// Sanitize URL parameters to prevent HTML injection in URLs
app.use(sanitizeUrlParams);

app.use(sessionMiddleware);

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
        'wss://tta-smarthub-dev-green.app.cloud.gov',
        'wss://tta-smarthub-dev-blue.app.cloud.gov',
        'wss://tta-smarthub-dev-red.app.cloud.gov',
        'wss://tta-smarthub-dev-gold.app.cloud.gov',
        'wss://tta-smarthub-dev-pink.app.cloud.gov',
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

// Private Key JWT Client Authentication Flow
// The client JSON Web Key Set (JWKS) is a set of keys containing the public keys used for
// a more secure client authentication that uses assertion instead of a client secret.
// https://auth0.com/docs/authenticate/enterprise-connections/private-key-jwt-client-auth#private-key-jwt-client-authentication-flow
app.get('/.well-known/jwks.json', async (_req, res) => {
  res.json({ keys: [await getPublicJwk()] });
});

app.get(oauth2CallbackPath, async (req, res) => {
  try {
    const accessToken = await getAccessToken(req);
    if (!accessToken) {
      auditLogger.error('No access token retrieved');
      return res.status(INTERNAL_SERVER_ERROR).end();
    }
    const subject = req.session?.claims?.sub;
    if (!subject) {
      auditLogger.error('No subject retrieved');
      return res.status(INTERNAL_SERVER_ERROR).end();
    }
    const data = await getUserInfo(accessToken, subject);
    const dbUser = await retrieveUserDetails(data);
    const claims = req.session?.claims || {};
    const idToken = req.session?.id_token || '';
    const prevPkce = req.session?.pkce;

    // console.log('REQ SESSION BEFORE REGEN:', req.session);
    await new Promise((resolve) => {
      req.session.regenerate((err) => {
        if (err) {
          auditLogger(`Session regenerate failed: ${err}`);
          res.status(INTERNAL_SERVER_ERROR).end();
          return resolve();
        }

        req.session.accessToken = accessToken;
        req.session.userId = dbUser.id;
        req.session.uuid = uuidv4();
        req.session.claims = claims;
        req.session.id_token = idToken;
        req.session.pkce = prevPkce;

        const redirectPath = (req.session.referrerPath && req.session.referrerPath !== '/logout')
          ? req.session.referrerPath
          : '/';

        logger.debug(`referrer path: ${req.session.referrerPath}`);
        auditLogger.info(`User ${dbUser.id} logged in`);

        res.redirect(join(process.env.TTA_SMART_HUB_URI, redirectPath));
        return resolve();
      });
    });

    return undefined;
  } catch (error) {
    auditLogger.error(`Error logging in: ${error}`);
    return res.status(INTERNAL_SERVER_ERROR).end();
  }
});

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'dss') {
  app.use('*', serveIndex);
}

runCronJobs();

export default app;
