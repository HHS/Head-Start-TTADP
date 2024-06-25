import express from 'express';
import {
  allCourses,
  createCourseByName,
  deleteCourseById,
  getCourseById,
  getCourseUrlWidgetDataWithCache,
  updateCourseById,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(allCourses));
router.get('/dashboard', transactionWrapper(getCourseUrlWidgetDataWithCache));
router.get('/:id', transactionWrapper(getCourseById));
router.put('/:id', transactionWrapper(updateCourseById));
router.post('/', transactionWrapper(createCourseByName));
router.delete('/:id', transactionWrapper(deleteCourseById));
export default router;
