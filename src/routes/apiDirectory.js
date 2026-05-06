import express from 'express';
import httpContext from 'express-http-context';
import unless from 'express-unless';
import join from 'url-join';
import { v4 as uuidv4 } from 'uuid';
import handleErrors from '../lib/apiErrorHandler';
import { auditLogger } from '../logger';
import authMiddleware, { login, logoutOidc } from '../middleware/authMiddleware';
import sanitizeRequestBody from '../middleware/sanitizeRequestBody';
import { currentUserId } from '../services/currentUser';
import { userById } from '../services/users';
import activityReportsRouter from './activityReports';
import adminRouter from './admin';
import citationsRouter from './citations';
import collaborationReportsRouter from './collaborationReports';
import communicationLogRouter from './communicationLog';
import coursesRouter from './courses';
import eventRouter from './events';
import feedRouter from './feeds';
import filesRouter from './files';
import goalsRouter from './goals';
import goalTemplatesRouter from './goalTemplates';
import groupsRouter from './groups';
import monitoringRouter from './monitoring';
import nationalCenterRouter from './nationalCenter';
import objectiveRouter from './objectives';
import recipientRouter from './recipient';
import recipientSpotlightRouter from './recipientSpotlight';
import resourcesRouter from './resources';
import rolesRouter from './roles';
import sessionReportsRouter from './sessionReports';
import settingsRouter from './settings';
import siteAlertsRouter from './siteAlerts';
import ssdiRouter from './ssdi';
import topicsRouter from './topics';
import transactionWrapper from './transactionWrapper';
import usersRouter from './users';
import widgetsRouter from './widgets';

export const loginPath = '/login';

authMiddleware.unless = unless;

const sanitizeMiddleware = sanitizeRequestBody();
sanitizeMiddleware.unless = unless;

const router = express.Router();

router.use(httpContext.middleware);
router.use(authMiddleware.unless({ path: [join('/api', loginPath)] }));
router.use(sanitizeMiddleware.unless({ path: ['/api/files'] }));

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

// Explicitly set Content-Type for all API responses to prevent MIME-sniffing
// and ensure browsers treat responses as data, not HTML
router.use((req, res, next) => {
  res.set('Content-Type', 'application/json; charset=utf-8');
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
router.get('/logout-oidc', logoutOidc);

router.get(loginPath, login);

// Server 404s need to be explicitly handled by express
router.use('*', (_req, res) => {
  res.status(404).json({});
});

export default router;
