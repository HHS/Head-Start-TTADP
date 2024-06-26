/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import {
  destroy,
  get,
  post,
  put,
} from './index';

export async function getCourses() {
  const courses = await get(join('/', 'api', 'courses'));
  return courses.json();
  // response like [
  //   { id: 1, name: 'Guiding Children\'s Behavior (BTS-P)' },
  //   { id: 2, name: 'Setting Up the Classroom (BTS-P)' },
  //   { id: 3, name: 'Social and Emotional Support (BTS-P)' },
  //   { id: 4, name: 'Learning the Ropes (BTS-P)' },
  //   { id: 5, name: 'Approaches to Individualizing (BTS-P)' },
  //   { id: 6, name: 'Ongoing Assessment (BTS-P)' },
  //   { id: 7, name: 'Families and Home Visiting (BTS-P)' },
  // ];
}

export async function getCourseById(id) {
  const course = await get(join('/', 'api', 'courses', id));
  return course.json();
  // response like { id: 1, name: 'Guiding Children\'s Behavior (BTS-P)' }
}

export async function updateCourseById(id, data) {
  const course = await put(join('/', 'api', 'courses', id), data);
  return course.json();
  // response like { id: 1, name: 'Guiding Children\'s Behavior (BTS-P)' }
}

export async function deleteCourseById(id) {
  return destroy(join('/', 'api', 'courses', id));
  // response like { id: 1, name: 'Guiding Children\'s Behavior (BTS-P)' }
}

export async function createCourseByName(name) {
  const course = await post(join('/', 'api', 'courses'), { name });
  return course.json();
  // response like { id: 1, name: 'Guiding Children\'s Behavior (BTS-P)' }
}

export const fetchCourseDashboardData = async (query) => {
  const request = join('/', 'api', 'courses', 'dashboard', `?${query}`);
  const res = await get(request);
  const data = await res.json();

  return {
    ...data,
  };
};
