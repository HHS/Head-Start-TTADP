/* eslint-disable import/prefer-default-export */
import { Request, Response } from 'express';
import filtersToScopes from '../../scopes';
import handleErrors from '../../lib/apiErrorHandler';
import { setReadRegions } from '../../services/accessValidation';
import {
  getAllCourses,
} from '../../services/course';
import { currentUserId } from '../../services/currentUser';
import getCachedResponse from '../../lib/cache';
import { getCourseUrlWidgetData } from '../../services/dashboards/course';

const COURSE_DATA_CACHE_VERSION = 1.5;

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

export async function getCourseUrlWidgetDataWithCache(req, res) {
  const userId = await currentUserId(req, res);
  const query = await setReadRegions(req.query, userId);
  const key = `getCourseWidgetUrlData?v=${COURSE_DATA_CACHE_VERSION}&${JSON.stringify(query)}`;

  const response = await getCachedResponse(
    key,
    async () => {
      const scopes = await filtersToScopes(query, {});
      const data = await getCourseUrlWidgetData(scopes);
      return JSON.stringify(data);
    },
    JSON.parse,
  );

  res.json(response);
}
