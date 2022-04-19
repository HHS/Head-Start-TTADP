import express from 'express';
import { getWidget } from './handlers';
import { nameTransactionByPath } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

router.get('/:widgetId', nameTransactionByPath, transactionWrapper(getWidget));

export default router;
