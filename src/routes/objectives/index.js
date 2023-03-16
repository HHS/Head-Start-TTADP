import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import { createObjectivesForOtherEntity } from './handlers';

const router = express.Router();

router.post('/other-entity/new', authMiddleware, transactionWrapper(createObjectivesForOtherEntity));

export default router;
