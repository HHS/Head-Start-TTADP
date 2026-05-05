import express from 'express';
import { nameTransactionByPath } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';
import { getWidget } from './handlers';

const router = express.Router();

router.get('/:widgetId', nameTransactionByPath, transactionWrapper(getWidget));

export default router;
