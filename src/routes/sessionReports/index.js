import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  createHandler,
  updateHandler,
  getHandler,
  deleteHandler,
  getParticipants,
} from './handlers';
import { checkIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();

router.get('/id/:id', transactionWrapper(getHandler));
router.get('/participants/:regionId', (req, res, next) => checkIdParam(req, res, next, 'regionId'), transactionWrapper(getParticipants));
router.get('/eventId/:eventId', transactionWrapper(getHandler));
router.post('/', transactionWrapper(createHandler));
router.put('/id/:id', transactionWrapper(updateHandler));
router.delete('/id/:id', transactionWrapper(deleteHandler));

export default router;
