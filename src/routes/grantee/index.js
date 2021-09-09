import express from 'express';
import {
  getGrantee,
} from './handlers';

const router = express.Router();
router.get('/:granteeId', getGrantee);

export default router;
