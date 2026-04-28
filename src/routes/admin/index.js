import express from 'express';
import getRequestErrors, { getRequestError, deleteRequestErrors } from './handlers';
import { getMonitoringDiagnostics, getMonitoringDiagnostic } from './monitoringHandlers';
import userRouter from './user';
import recipientRouter from './recipient';
import roleRouter from './role';
import siteAlertRouter from './siteAlert';
import redisRouter from './redis';
import nationalCenterRouter from './nationalCenter';
import groupRouter from './group';
import goalRouter from './goal';
import ssRouter from './ss';
import trainingReportRouter from './trainingReport';
import legacyReportRouter from './legacyReports';
import courseRouter from './course';
import buildInfo from './buildInfo';
import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';
import transactionWrapper from '../transactionWrapper';
import { MONITORING_DIAGNOSTIC_RESOURCES } from '../../services/monitoringDiagnostics';

const router = express.Router();

router.use(userAdminAccessMiddleware);
router.get('/requestErrors', transactionWrapper(getRequestErrors));
router.get('/requestErrors/:id', transactionWrapper(getRequestError));
router.delete('/requestErrors', transactionWrapper(deleteRequestErrors));
Object.keys(MONITORING_DIAGNOSTIC_RESOURCES).forEach((resource) => {
  router.get(`/${resource}`, transactionWrapper(getMonitoringDiagnostics(resource)));
  router.get(`/${resource}/:id`, transactionWrapper(getMonitoringDiagnostic(resource)));
});
router.use('/users', userRouter);
router.use('/recipients', recipientRouter);
router.use('/groups', groupRouter);
router.use('/goals', goalRouter);
router.use('/roles', roleRouter);
router.use('/alerts', siteAlertRouter);
router.use('/redis', redisRouter);
router.use('/national-center', nationalCenterRouter);
router.use('/training-reports', trainingReportRouter);
router.use('/legacy-reports', legacyReportRouter);
router.use('/courses', courseRouter);
router.use('/ss', ssRouter);
router.use('/buildInfo', buildInfo);

export default router;
