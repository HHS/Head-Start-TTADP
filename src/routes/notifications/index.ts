import express from 'express';
import { checkNotificationIdParam } from '../../middleware/checkIdParamMiddleware';

import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  createGlobalNotificationHandler,
  getArchivedNotificationsHandler,
  getNotificationsHandler,
  updateNotificationHandler,
} from './handlers';

const router = express.Router();

router.post(
  '/admin',
  userAdminAccessMiddleware,
  transactionWrapper(createGlobalNotificationHandler)
);
router.put(
  '/:notificationId',
  checkNotificationIdParam,
  transactionWrapper(updateNotificationHandler)
);
router.get('/archived', transactionWrapper(getArchivedNotificationsHandler));
router.get('/', transactionWrapper(getNotificationsHandler));

export default router;
