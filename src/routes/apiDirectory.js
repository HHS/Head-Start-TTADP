import express from 'express';
import unless from 'express-unless';
import httpContext from 'express-http-context';
import join from 'url-join';
import { v4 as uuidv4 } from 'uuid';

import authMiddleware, { login } from '../middleware/authMiddleware';
import cookieSession from '../middleware/sessionMiddleware';
import filesRouter from './files';
import activityReportsRouter from './activityReports';
import collaborationReportsRouter from './collaborationReports';
import usersRouter from './users';
import widgetsRouter from './widgets';
import resourcesRouter from './resources';
import recipientRouter from './recipient';
import { userById } from '../services/users';
import { auditLogger } from '../logger';
import handleErrors from '../lib/apiErrorHandler';
import adminRouter from './admin';
import goalsRouter from './goals';
import topicsRouter from './topics';
import rolesRouter from './roles';
import siteAlertsRouter from './siteAlerts';
import transactionWrapper from './transactionWrapper';
import settingsRouter from './settings';
import groupsRouter from './groups';
import goalTemplatesRouter from './goalTemplates';
import eventRouter from './events';
import sessionReportsRouter from './sessionReports';
import nationalCenterRouter from './nationalCenter';
import feedRouter from './feeds';
import communicationLogRouter from './communicationLog';
import monitoringRouter from './monitoring';
import coursesRouter from './courses';
import { currentUserId } from '../services/currentUser';
import objectiveRouter from './objectives';
import ssdiRouter from './ssdi';
import citationsRouter from './citations';
import recipientSpotlightRouter from './recipientSpotlight';

export const loginPath = '/login';

authMiddleware.unless = unless;

const router = express.Router();

router.use(httpContext.middleware);
router.use(cookieSession);
router.use(authMiddleware.unless({ path: [join('/api', loginPath)] }));

router.use((req, res, next) => {
  try {
    const { userId, uuid } = req.session;
    const transactionId = uuidv4();

    httpContext.set('loggedUser', userId);
    httpContext.set('transactionId', transactionId);
    httpContext.set('sessionSig', uuid);
  } catch (err) {
    auditLogger.error(err);
  }
  next();
});

router.use('/admin', adminRouter);
router.use('/activity-reports', activityReportsRouter);
router.use('/collaboration-reports', collaborationReportsRouter);
router.use('/users', usersRouter);
router.use('/widgets', widgetsRouter);
router.use('/files', filesRouter);
router.use('/recipient', recipientRouter);
router.use('/goals', goalsRouter);
router.use('/objectives', objectiveRouter);
router.use('/topic', topicsRouter);
router.use('/role', rolesRouter);
router.use('/settings', settingsRouter);
router.use('/groups', groupsRouter);
router.use('/alerts', siteAlertsRouter);
router.use('/feeds', feedRouter);
router.use('/resources', resourcesRouter);
router.use('/goal-templates', goalTemplatesRouter);
router.use('/events', eventRouter);
router.use('/session-reports', sessionReportsRouter);
router.use('/national-center', nationalCenterRouter);
router.use('/communication-logs', communicationLogRouter);
router.use('/monitoring', monitoringRouter);
router.use('/courses', coursesRouter);
router.use('/citations', citationsRouter);
router.use('/ssdi', ssdiRouter);
router.use('/recipient-spotlight', recipientSpotlightRouter);

const getUser = async (req, res) => {
  const userId = await currentUserId(req, res);
  try {
    const user = await userById(userId);
    res.json(user.toJSON());
  } catch (error) {
    await handleErrors(req, res, error, { namespace: 'SERVICE:SELF' });
  }
};

router.get('/user', transactionWrapper(getUser));
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
