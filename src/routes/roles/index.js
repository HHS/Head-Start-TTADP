import express from 'express';
import {
  allRoles,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(allRoles));
export default router;
