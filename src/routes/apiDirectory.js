import express from 'express';
import unless from 'express-unless';
import httpContext from 'express-http-context';
import join from 'url-join';
import { v4 as uuidv4 } from 'uuid';

import authMiddleware, { login } from '../middleware/authMiddleware';
import cookieSession from '../middleware/sessionMiddleware';
import filesRouter from './files';
import activityReportsRouter from './activityReports';
import usersRouter from './users';
import widgetsRouter from './widgets';
import recipientRouter from './recipient';
import { userById } from '../services/users';
import { auditLogger } from '../logger';
import handleErrors from '../lib/apiErrorHandler';
import adminRouter from './admin';

export const loginPath = '/login';

authMiddleware.unless = unless;

const router = express.Router();

router.use(httpContext.middleware);
router.use(cookieSession);
router.use(authMiddleware.unless({ path: [join('/api', loginPath)] }));

router.use((req, res, next) => {
  try {
    const { userId } = req.session;
    const transactionId = uuidv4();
    const { cookie } = req.headers;
    const sessionSig = () => {
      try {
        if (cookie !== undefined && (typeof cookie === 'string' || cookie instanceof String)) {
          const sessionSigs = cookie.split(' ').filter((s) => s.includes('session.sig='));
          return sessionSigs.lenght > 0
            ? sessionSigs[0].replace('session.sig=', '')
            : '';
        }
      } catch (err) {
        auditLogger.error(err);
      }
      return '';
    };

    httpContext.set('loggedUser', userId);
    httpContext.set('transactionId', transactionId);
    httpContext.set('sessionSig', sessionSig);
    // auditLogger.info(`Audit Data loggedUser: ${userId}`);
  } catch (err) {
    auditLogger.error(err);
  }
  next();
});

router.use('/admin', adminRouter);
router.use('/activity-reports', activityReportsRouter);
router.use('/users', usersRouter);
router.use('/widgets', widgetsRouter);
router.use('/files', filesRouter);
router.use('/recipient', recipientRouter);

router.get('/user', async (req, res) => {
  const { userId } = req.session;
  try {
    const user = await userById(userId);
    res.json(user.toJSON());
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:SELF' });
  }
});

router.get('/logout', (req, res) => {
  const { userId } = req.session;
  auditLogger.info(`User ${userId} logged out`);
  req.session = null;
  res.sendStatus(204);
});

router.get(loginPath, login);

// Server 404s need to be explicitly handled by express
router.get('*', (req, res) => {
  res.sendStatus(404);
});

export default router;
