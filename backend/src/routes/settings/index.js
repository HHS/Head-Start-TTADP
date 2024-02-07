import express from 'express';
import {
  getUserEmailSettings,
  getUserSettings,
  unsubscribe,
  subscribe,
  updateSettings,
} from './handlers';

const router = express.Router();

router.get('/', getUserSettings);
router.get('/email', getUserEmailSettings);

router.put('/', updateSettings);
router.put('/email/unsubscribe', unsubscribe);
router.put('/email/subscribe', subscribe);

export default router;
