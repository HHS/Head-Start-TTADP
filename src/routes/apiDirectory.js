import express from 'express';
import unless from 'express-unless';
import join from 'url-join';

import authMiddleware, { login } from '../middleware/authMiddleware';
import filesRouter from './files';
import activityReportsRouter from './activityReports';
import usersRouter from './users';
import widgetsRouter from './widgets';
import granteeRouter from './grantee';
import { userById } from '../services/users';
import { auditLogger } from '../logger';
import handleErrors from '../lib/apiErrorHandler';
import adminRouter from './admin';

export const loginPath = '/login';

authMiddleware.unless = unless;

const router = express.Router();

router.use(authMiddleware.unless({ path: [join('/api', loginPath)] }));

router.use('/admin', adminRouter);
router.use('/activity-reports', activityReportsRouter);
router.use('/users', usersRouter);
router.use('/widgets', widgetsRouter);
router.use('/files', filesRouter);
router.use('/grantee', granteeRouter);

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
