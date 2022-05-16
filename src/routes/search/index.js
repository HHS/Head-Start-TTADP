import express from 'express';
import {
  searchIndex,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(searchIndex));
export default router;
