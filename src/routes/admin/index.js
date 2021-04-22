import express from 'express';

import userRouter from './user';
import granteeRouter from './grantee';
import grantRouter from './grant';
import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';

const router = express.Router();

router.use(userAdminAccessMiddleware);
router.use('/users', userRouter);
router.use('/grantees', granteeRouter);
router.use('/grants', grantRouter);

export default router;
