import {} from 'dotenv/config';
import fs from 'fs';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import join from 'url-join';
import { omit } from 'lodash';
import { INTERNAL_SERVER_ERROR } from 'http-codes';
import axios from 'axios';
import { SignJWT, importJWK } from 'jose';

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import { registerEventListener } from './processHandler';
// import { hsesAuth } from './middleware/authMiddleware';
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
      defaultSrc: ["'self'", 'wss://tta-smarthub-sandbox.app.cloud.gov', 'wss://tta-smarthub-dev.app.cloud.gov'],
    },
  });
  cspMiddleware(req, res, next);
});

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'dss') {
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/index.html', serveIndex);
  app.use(express.static(path.join(__dirname, '../client'), { index: false }));
}

app.use('/api/v1', require('./routes/externalApi').default);
app.use('/api', require('./routes/apiDirectory').default);

// Disable "X-Powered-By" header
app.disable('x-powered-by');

// Utility to sign client_assertion
async function signClientAssertion() {
  const base64 = process.env.PRIVATE_JWK_BASE64;
  const jwk = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
  const key = await importJWK(jwk, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const tokenEndpoint = `${process.env.AUTH_BASE}/oidc/api/openid_connect/token`;

  return new SignJWT({
    iss: process.env.AUTH_CLIENT_ID,
    sub: process.env.AUTH_CLIENT_ID,
    aud: tokenEndpoint,
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
}

// TODO: change `app.get...` with `router.get...` once our oauth callback has been updated
app.get(oauth2CallbackPath, cookieSession, async (req, res) => {
  // try {
  //   const user = await hsesAuth.code.getToken(req.originalUrl);
  //   // user will have accessToken and refreshToken
  //   logger.debug(`HSES AccessToken: ${user.accessToken}`);
  try {
    const { code } = req.query;
    const redirectUri = `${process.env.REDIRECT_URI_HOST}/oauth2-client/login/oauth2/code/`;
    const tokenEndpoint = `${process.env.AUTH_BASE}/oidc/api/openid_connect/token`;

    const clientAssertion = await signClientAssertion();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.AUTH_CLIENT_ID,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    });

    const tokenResponse = await axios.post(tokenEndpoint, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { accessToken } = tokenResponse.data;
    // Retrieve user info
    const userInfo = await axios.get(`${process.env.AUTH_BASE}/oidc/api/openid_connect/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    // const dbUser = await retrieveUserDetails(user);
    const dbUser = await retrieveUserDetails(userInfo.data);
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
