/* eslint-disable import/prefer-default-export */
import join from 'url-join';
import { get } from './index';

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

export const fetchCourseDashboardData = async (query) => {
  const res = await get(join('/', 'api', 'courses', 'dashboard', `?${query}`));
  const data = await res.json();

  return {
    ...data,
  };
};
