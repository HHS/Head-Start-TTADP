import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  createHandler,
  updateHandler,
  getHandler,
} from './handlers';

const router = express.Router();

router.get('/id/:eventId', transactionWrapper(getHandler));
router.get('/regionId/:regionId', transactionWrapper(getHandler));
router.get('/ownerId/:ownerId', transactionWrapper(getHandler));
router.get('/pocId/:pocId', transactionWrapper(getHandler));
router.get('/collaboratorId/:collaboratorId', transactionWrapper(getHandler));
router.post('/', transactionWrapper(createHandler));
router.put('/id/:eventId', transactionWrapper(updateHandler));

export default router;
