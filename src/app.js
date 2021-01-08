import {} from 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import axios from 'axios';
import session from 'express-session';
import memorystore from 'memorystore';
import path from 'path';
import join from 'url-join';
import { INTERNAL_SERVER_ERROR } from 'http-codes';
import { CronJob } from 'cron';
import { hsesAuth } from './middleware/authMiddleware';
import updateGrantsGrantees from './lib/updateGrantsGrantees';

import findOrCreateUser from './services/accessValidation';

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
    sameSite: 'lax',
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
    const { principal: { username, userId } } = data;

    const dbUser = await findOrCreateUser({
      email: username,
      hsesUserId: userId.toString(),
    });

    req.session.userId = dbUser.id;
    logger.info(`role: ${req.session.userId} ${req.session.referrerPath}`);
    res.redirect(join(process.env.TTA_SMART_HUB_URI, req.session.referrerPath));
  } catch (error) {
    logger.error(`Error logging in: ${error}`);
    res.status(INTERNAL_SERVER_ERROR).end();
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
  });
}

// Set timing parameters.
// Run at midnight
const schedule = '0 0 * * *';
const timezone = 'America/New_York';

const runJob = () => {
  try {
    updateGrantsGrantees();
  } catch (error) {
    logger.error(`Error processing HSES file: ${error}`);
  }
};

const job = new CronJob(schedule, () => runJob(), null, true, timezone);
job.start();

module.exports = app;
