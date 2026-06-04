import express from 'express';
import transactionWrapper from '../transactionWrapper';
import { allTopics } from './handlers';

const router = express.Router();
router.get('/', transactionWrapper(allTopics));
export default router;
