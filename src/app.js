import {} from 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import axios from 'axios';
import session from 'express-session';
import memorystore from 'memorystore';
import unless from 'express-unless';
import _ from 'lodash';
import path from 'path';
import join from 'url-join';

import logger, { requestLogger } from './logger';
import authMiddleware, { hsesAuth, login } from './middleware/authMiddleware';

const app = express();
const router = express.Router();
const MemoryStore = memorystore(session);
const oauth2CallbackPath = '/oauth2-client/login/oauth2/code/';
const loginPath = '/login';

app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(session({
  secret: process.env.SESSION_SECRET,
  key: 'session',
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: Number(process.env.SESSION_TIMEOUT),
  },
  rolling: true,
  store: new MemoryStore({ // Potentially change this to a different store
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
  saveUninitialized: false,
  resave: false,
}));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client')));
}

authMiddleware.unless = unless;
// TODO: update unless to replace `oauth1CallbackPath with `join('/api', oauth2CallbackPath)`
// once our oauth callback has been updated
router.use(authMiddleware.unless({ path: [join('/api', loginPath)] }));

router.get('/hello', (req, res) => {
  logger.info('Hello from ttadp');
  res.send('Hello from ttadp');
});

router.post('/hello', (req, res) => {
  logger.info('Hello from ttadp');
  res.send('Hello from ttadp');
});

router.get('/user', (req, res) => {
  const { userId, role, name } = req.session;
  res.send({ userId, role, name });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.sendStatus(204);
});

router.get(loginPath, login);

// Server 404s need to be explicitly handled by express
router.get('*', (req, res) => {
  res.sendStatus(404);
});

app.use('/api', router);

// TODO: change `app.get...` with `router.get...` once our oauth callback has been updated
app.get(oauth2CallbackPath, async (req, res) => {
  try {
    const user = await hsesAuth.code.getToken(req.originalUrl);
    // user will have accessToken and refreshToken
    const requestObj = user.sign({
      method: 'get',
      url: 'https://uat.hsesinfo.org/auth/user/me',
    });

    const { url } = requestObj;

    const response = await axios.get(url, requestObj);
    const { data } = response;
    const { authorities } = data;
    req.session.userId = 1; // temporary
    req.session.role = _.get(authorities[0], 'authority');
    logger.info(`role: ${req.session.role}`);
    res.redirect(join(process.env.TTA_SMART_HUB_URI, req.session.referrerPath));
  } catch (error) {
    // console.log(error);
  }
});

// Client 404s are handled by client side routing
if (process.env.NODE_ENV === 'production') {
  app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });
}

module.exports = app;
