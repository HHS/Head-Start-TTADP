import express from 'express';
import {
  getRecipient,
  searchRecipients,
} from './handlers';

const router = express.Router();
router.get('/search', searchRecipients);
router.get('/:recipientId', getRecipient);

export default router;
