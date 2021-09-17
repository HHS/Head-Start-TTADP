import express from 'express';
import { getWidget } from './handlers';
import { nameTransactionByPath } from '../../middleware/newRelicMiddleware';

const router = express.Router();

router.get('/:widgetId', nameTransactionByPath, getWidget);

export default router;
