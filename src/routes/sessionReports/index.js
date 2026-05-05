import express from 'express';
import { checkIdParam } from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  createHandler,
  deleteHandler,
  getGroups,
  getHandler,
  getParticipants,
  getSessionReportsHandler,
  updateHandler,
} from './handlers';

const router = express.Router();
const context = 'sessionReports';

router.get('/', transactionWrapper(getSessionReportsHandler, `${context} /`));
router.get('/id/:id', transactionWrapper(getHandler, `${context} /id/:id`));
router.get(
  '/participants/:regionId',
  (req, res, next) => checkIdParam(req, res, next, 'regionId'),
  transactionWrapper(getParticipants)
);
router.get('/eventId/:eventId', transactionWrapper(getHandler, `${context} /eventId/:eventId`));
router.post('/', transactionWrapper(createHandler, context));
router.put('/id/:id', transactionWrapper(updateHandler, context));
router.delete('/id/:id', transactionWrapper(deleteHandler, context));
router.get('/groups', transactionWrapper(getGroups));

export default router;
