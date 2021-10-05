import express from 'express';
import {
  getGrantee,
  searchGrantees,
} from './handlers';

const router = express.Router();
router.get('/:granteeId', getGrantee);
router.get('/search', searchGrantees);

export default router;
