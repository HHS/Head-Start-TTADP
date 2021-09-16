import express from 'express';
import {
  searchGrantees,
} from './handlers';

const router = express.Router();
router.get('/search', searchGrantees);

export default router;
