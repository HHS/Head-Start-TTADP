import express from 'express';
import {
  allTopics,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(allTopics));
export default router;
