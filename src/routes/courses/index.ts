import express from 'express';
import {
  allCourses,
  getCourseUrlWidgetDataWithCache,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(allCourses));
router.get('/dashboard', transactionWrapper(getCourseUrlWidgetDataWithCache));
export default router;
