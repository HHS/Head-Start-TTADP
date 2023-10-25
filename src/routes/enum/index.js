import express from 'express';
import {
  findAllFromEnum,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/enumName/:enumName/enumType/:enumType', transactionWrapper(findAllFromEnum));
export default router;
