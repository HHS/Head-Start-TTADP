/* eslint-disable import/prefer-default-export */
import { Request, Response } from 'express';
import handleErrors from '../../lib/apiErrorHandler';
import {
  getAllCourses,
} from '../../services/course';

const namespace = 'HANDLERS:COURSES';
const logContext = {
  namespace,
};

export async function allCourses(req: Request, res: Response) {
  try {
    // we only verify site access for getting all courses
    // (everyone with site access can see them, theoretically)
    const courses = await getAllCourses();
    res.json(courses);
  } catch (err) {
    await handleErrors(err, req, res, logContext);
  }
}
