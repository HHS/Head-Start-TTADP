import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  createHandler,
  updateHandler,
  getHandler,
  deleteHandler,
  getByStatus,
  findEventCreatorsHandler,
} from './handlers';

const router = express.Router();

router.get('/id/:eventId', transactionWrapper(getHandler));
router.get('/regionId/:regionId', transactionWrapper(getHandler));
router.get('/:status', transactionWrapper(getByStatus));
router.get('/ownerId/:ownerId', transactionWrapper(getHandler));
router.get('/pocId/:pocId', transactionWrapper(getHandler));
router.get('/collaboratorId/:collaboratorId', transactionWrapper(getHandler));
router.post('/', transactionWrapper(createHandler));
router.put('/id/:eventId', transactionWrapper(updateHandler));
router.delete('/id/:eventId', transactionWrapper(deleteHandler));
router.get('/creators/:eventId', transactionWrapper(findEventCreatorsHandler));

export default router;
