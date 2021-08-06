import express from 'express';
import { getWidget } from './handlers';

const nr = require('newrelic');

const router = express.Router();

// Middleware to set transaction name
function nameWidgetTransactions(req, res, next) {
  nr.setTransactionName(`GET /api/widgets/${req.params.widgetId}`);
  next();
}

router.get('/:widgetId', nameWidgetTransactions, getWidget);

export default router;
