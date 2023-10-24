import express from 'express';
import getRequestErrors, { getRequestError, deleteRequestErrors } from './handlers';
import userRouter from './user';
import recipientRouter from './recipient';
import grantRouter from './grant';
import roleRouter from './role';
import siteAlertRouter from './siteAlert';
import redisRouter from './redis';
import nationalCenterRouter from './nationalCenter';
import emailRouter from './email';
import groupRouter from './group';
import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

router.use(userAdminAccessMiddleware);
router.get('/requestErrors', transactionWrapper(getRequestErrors));
router.get('/requestErrors/:id', transactionWrapper(getRequestError));
router.delete('/requestErrors', transactionWrapper(deleteRequestErrors));
router.use('/users', userRouter);
router.use('/recipients', recipientRouter);
router.use('/grants', grantRouter);
router.use('/groups', groupRouter);
router.use('/roles', roleRouter);
router.use('/alerts', siteAlertRouter);
router.use('/redis', redisRouter);
router.use('/national-center', nationalCenterRouter);
router.use('/email', emailRouter);

export default router;
