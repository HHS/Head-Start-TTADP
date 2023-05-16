import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  createHandler,
  getEvent,
} from './handlers';

const router = express.Router();

router.get('/id/:eventId', transactionWrapper(getEvent));
router.get('/regionId/:regionId', transactionWrapper(getEvent));
router.get('/ownerId/:ownerId', transactionWrapper(getEvent));
router.get('/pocId/:pocId', transactionWrapper(getEvent));
router.get('/collaboratorId/:collaboratorId', transactionWrapper(getEvent));
router.post('/', transactionWrapper(createHandler));

export default router;
