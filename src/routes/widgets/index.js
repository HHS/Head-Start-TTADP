import express from 'express';
import { getWidget } from './handlers';

const router = express.Router();

router.get('/:widgetId', getWidget);

export default router;
