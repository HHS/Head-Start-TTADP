import express from 'express';
import Sequelize from 'sequelize';
import { nameTransactionByPath } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';
import { getWidget, postWidget } from './handlers';

const router = express.Router();
const widgetTransactionOptions = {
  isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
};

router.get(
  '/:widgetId',
  nameTransactionByPath,
  transactionWrapper(getWidget, '', false, widgetTransactionOptions)
);
router.post(
  '/:widgetId',
  nameTransactionByPath,
  transactionWrapper(postWidget, '', false, widgetTransactionOptions)
);

export default router;
