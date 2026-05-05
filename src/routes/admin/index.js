import express from 'express';
import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';
import transactionWrapper from '../transactionWrapper';
import buildInfo from './buildInfo';
import courseRouter from './course';
import goalRouter from './goal';
import groupRouter from './group';
import getRequestErrors, { deleteRequestErrors, getRequestError } from './handlers';
import legacyReportRouter from './legacyReports';
import nationalCenterRouter from './nationalCenter';
import recipientRouter from './recipient';
import redisRouter from './redis';
import roleRouter from './role';
import siteAlertRouter from './siteAlert';
import ssRouter from './ss';
import trainingReportRouter from './trainingReport';
import userRouter from './user';

const router = express.Router();

router.use(userAdminAccessMiddleware);
router.get('/requestErrors', transactionWrapper(getRequestErrors));
router.get('/requestErrors/:id', transactionWrapper(getRequestError));
router.delete('/requestErrors', transactionWrapper(deleteRequestErrors));
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
