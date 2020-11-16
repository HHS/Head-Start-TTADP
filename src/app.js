import {} from 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import axios from 'axios';
import session from 'express-session';
import memorystore from 'memorystore';
import _ from 'lodash';
import path from 'path';
import join from 'url-join';
import { hsesAuth } from './middleware/authMiddleware';

import logger, { requestLogger } from './logger';

const app = express();
const MemoryStore = memorystore(session);
const oauth2CallbackPath = '/oauth2-client/login/oauth2/code/';

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

app.use('/api', require('./routes/apiDirectory').default);

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
    logger.info(`role: ${req.session.role} ${req.session.referrerPath}`);
    res.redirect(join(process.env.TTA_SMART_HUB_URI, req.session.referrerPath));
  } catch (error) {
    // console.log(error);
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });
}

module.exports = app;
