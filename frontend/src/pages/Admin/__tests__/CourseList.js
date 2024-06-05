import '@testing-library/jest-dom';
import React from 'react';
import {
  act,
  render,
} from '@testing-library/react';
import CourseList from '../CourseList';

const courses = [
  { id: 1, name: 'Course 1' },
  { id: 2, name: 'Course 2' },
];

describe('CourseList', () => {
  const renderIt = () => {
    render(<CourseList courses={courses} />);
  };

  beforeEach(() => {

  });

  afterEach(() => {

  });

  it('renders and shows all courses', async () => {
    act(() => {
      renderIt();
    });

    const courseFilterInput = document.querySelector('input[name="courses-filter"]');
    expect(courseFilterInput).toBeInTheDocument();

    const course1Link = document.querySelector('a[href="/admin/course/1"]');
    const course2Link = document.querySelector('a[href="/admin/course/2"]');

    expect(course1Link).toBeInTheDocument();
    expect(course2Link).toBeInTheDocument();
  });

  it('filters courses', async () => {
    act(() => {
      renderIt();
    });

    const courseFilterInput = document.querySelector('input[name="courses-filter"]');
    expect(courseFilterInput).toBeInTheDocument();

    act(() => {
      courseFilterInput.value = '1';
      courseFilterInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const course1Link = document.querySelector('a[href="/admin/course/1"]');
    const course2Link = document.querySelector('a[href="/admin/course/2"]');
    expect(course1Link).toBeInTheDocument();
    expect(course2Link).not.toBeInTheDocument();
  });
});
