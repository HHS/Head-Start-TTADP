import express from 'express';
import {
  allCourses,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(allCourses));
export default router;
