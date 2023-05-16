import express from 'express';
import transactionWrapper from '../../transactionWrapper';
import { createHandler } from './handlers';

const router = express.Router();

router.post('/', transactionWrapper(createHandler));

export default router;
