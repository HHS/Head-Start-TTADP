import express from 'express';
import {
  getGrantee,
  searchGrantees,
} from './handlers';

const router = express.Router();
router.get('/search', searchGrantees);
router.get('/:granteeId', getGrantee);

export default router;
