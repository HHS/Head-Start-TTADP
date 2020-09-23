import {} from 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import axios from 'axios';
import session from 'express-session';
import memorystore from 'memorystore';
import unless from 'express-unless';
import _ from 'lodash';
import path from 'path';

import authMiddleware, { hsesAuth } from './middleware/authMiddleware';

const app = express();
const router = express.Router();

const MemoryStore = memorystore(session);

const oauth2CallbackPath = '/oauth2-client/login/oauth2/code/';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new MemoryStore({ // Potentially change this to a different store
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
  saveUninitialized: false,
  resave: false,
}));

authMiddleware.unless = unless;
app.use(authMiddleware.unless({ path: oauth2CallbackPath }));

router.get('/', (req, res) => {
  res.send('Hello from ttadp');
});

router.get(oauth2CallbackPath, async (req, res) => {
  try {
    const user = await hsesAuth.code.getToken(req.originalUrl);
    // user will have accessToken and refreshToken
    const requestObj = user.sign({
      method: 'get',
      url: `${process.env.AUTH_BASE}/auth/user/me`,
    });

    const { url } = requestObj;

    const response = await axios.get(url, requestObj);
    const { data } = response;
    const { authorities } = data;
    req.session.userId = 1; // temporary
    req.session.role = _.get(authorities[0], 'authority');
    // TODO: replace with logging message
    console.log(`role: ${req.session.role}`);
    res.redirect(req.session.originalUrl);
  } catch (error) {
    // console.log(error);
  }
});

app.use('/', router);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client')));
}

const server = app.listen(process.env.PORT || 8080, () => {
  // TODO: add a logging message
});

module.exports = server;
