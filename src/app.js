import crypto from 'crypto';
import {} from 'dotenv/config';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from 'http-codes';
import { omit } from 'lodash';
import path from 'path';
import qs from 'qs';
import join from 'url-join';
import { v4 as uuidv4 } from 'uuid';
import { runCronJobs } from './lib/cron';
import { auditLogger, logger, requestLogger } from './logger';
import { getAccessToken, getMissingLoginState, getUserInfo } from './middleware/authMiddleware';
import { getPublicJwk } from './middleware/jwkKeyManager';
import sanitizeUrlParams from './middleware/sanitizeUrlParams';
import sessionMiddleware from './middleware/sessionMiddleware';
import { registerEventListener } from './processHandler';
import { retrieveUserDetails } from './services/currentUser';

const app = express();

// Behind cloud.gov’s router/LB the app sees HTTP from the proxy even though the client used HTTPS.
// Tell Express to trust the first proxy so req.secure reflects X-Forwarded-Proto === 'https'.
app.set('trust proxy', 1);

// Express's default `qs` query parser converts bracket-notation arrays with more
// than 20 elements into objects keyed by index. That silently breaks filters
// that can have many selected values (e.g. `stateCode.nin[]=...` with all 60+
// states/territories selected on the goal dashboard), because downstream filter
// code expects an array. Raise the limit so large multi-select filters parse as
// arrays. `parameterLimit` already bounds the overall payload size.
app.set('query parser', (str) => qs.parse(str, { arrayLimit: 1000 }));

const oauth2CallbackPath = '/oauth2-client/login/oauth2/code/';
let index;

// Shown when the login callback can't be completed because the login state is gone or HSES
// reported an error. The user restarts login themselves; redirecting automatically could loop
// forever if the browser keeps dropping the session cookie.
const sendLoginRecoveryPage = (res) => {
  const loginUrl = join(process.env.TTA_SMART_HUB_URI, '/api/login');
  res
    .status(BAD_REQUEST)
    .set('Content-Type', 'text/html')
    .send(
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
        '<title>Login could not be completed</title></head><body>' +
        '<h1>Login could not be completed</h1>' +
        '<p>Your login session expired or was interrupted before it finished.</p>' +
        `<p><a href="${loginUrl}">Start login again</a></p>` +
        '</body></html>'
    );
};

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
        'font-src'
      ),
      styleSrc: ["'self'", "'unsafe-inline'"],
      // styleSrc: ["'self'", `'nonce-${res.locals.nonce}'`,
      // "'sha256-7oERheaqPgauHfP5d4xw0v6p4MUYc+/Quwioe/4rjOI='", "'unsafe-inline'"],
      fontSrc: ["'self'", `'nonce-${res.locals.nonce}'`],
      'form-action': ["'self'"],
      scriptSrc: ["'self'", `'nonce-${res.locals.nonce}'`, '*.googletagmanager.com'],
      scriptSrcElem: ["'self'", `'nonce-${res.locals.nonce}'`, 'https://*.googletagmanager.com'],
      imgSrc: ["'self'", 'data:', 'www.googletagmanager.com', '*.google-analytics.com'],
      connectSrc: [
        "'self'",
        '*.google-analytics.com',
        '*.analytics.google.com',
        '*.googletagmanager.com',
      ],
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
    // Log a stable reason and presence flags only; never the url, code, state, nonce or cookies.
    const missingLoginState = req.query?.error ? 'idp_error' : getMissingLoginState(req);
    if (missingLoginState) {
      auditLogger.error('Login callback cannot be completed', {
        reason: missingLoginState,
        hasSession: !!req.session,
        hasPkce: !!req.session?.pkce,
        hasCode: !!req.query?.code,
        hasState: !!req.query?.state,
        hasIdpError: !!req.query?.error,
      });
      return sendLoginRecoveryPage(res);
    }

    const accessToken = await getAccessToken(req);
    if (!accessToken) {
      auditLogger.alertError('No access token retrieved', 'auth_access_token_missing');
      return res.status(INTERNAL_SERVER_ERROR).end();
    }
    const subject = req.session?.claims?.sub;
    if (!subject) {
      auditLogger.alertError('No subject retrieved', 'auth_subject_missing');
      return res.status(INTERNAL_SERVER_ERROR).end();
    }
    const data = await getUserInfo(accessToken, subject);
    const dbUser = await retrieveUserDetails(data);
    const claims = req.session?.claims || {};
    const idToken = req.session?.id_token || '';

    // console.log('REQ SESSION BEFORE REGEN:', req.session);
    await new Promise((resolve) => {
      req.session.regenerate((err) => {
        if (err) {
          auditLogger.alertError(`Session regenerate failed: ${err}`, 'auth_login_failure', err);
          res.status(INTERNAL_SERVER_ERROR).end();
          return resolve();
        }

        req.session.accessToken = accessToken;
        req.session.userId = dbUser.id;
        req.session.uuid = uuidv4();
        req.session.claims = claims;
        req.session.id_token = idToken;

        const redirectPath =
          req.session.referrerPath && req.session.referrerPath !== '/logout'
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
    auditLogger.alertError(`Error logging in: ${error}`, 'auth_login_failure', error);
    return res.status(INTERNAL_SERVER_ERROR).end();
  }
});

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'dss') {
  app.use('*', serveIndex);
}

runCronJobs();

export default app;
