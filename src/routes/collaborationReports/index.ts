import express from 'express';
import { getCollaborationReportsHandler } from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

router.get('/', transactionWrapper(getCollaborationReportsHandler));

export default router;
