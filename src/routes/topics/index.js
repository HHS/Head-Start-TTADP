import express from 'express';
import {
  allTopics,
} from './handlers';

const router = express.Router();
router.get('/', allTopics);
export default router;
