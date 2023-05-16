import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  createHandler,
  updateHandler,
  getHandler,
} from './handlers';

const router = express.Router();

router.get('/id/:id', transactionWrapper(getHandler));
router.get('/eventId/:eventId', transactionWrapper(getHandler));
router.post('/', transactionWrapper(createHandler));
router.put('/id/:id', transactionWrapper(updateHandler));

export default router;
