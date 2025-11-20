import React from 'react';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import CourseEdit from '../CourseEdit';

describe('CourseEdit', () => {
  const courseId = '1';
  const courseUrl = `/api/courses/${courseId}`;
  const course = {
    id: courseId,
    name: 'Test Course',
  };
  const history = createMemoryHistory();
  const renderCourseEdit = () => {
    render(
      <Router history={history}>
        <CourseEdit match={{ params: { courseId } }} />
      </Router>,
    );
  };

  beforeEach(() => {
    fetchMock.get(courseUrl, course);
    fetchMock.put(courseUrl, { ...course, name: 'Updated Course' });
    fetchMock.delete(courseUrl, 204);
  });

  afterEach(() => fetchMock.restore());

  it('loads and displays the course', async () => {
    act(renderCourseEdit);
    expect(await screen.findByText('Test Course')).toBeInTheDocument();
  });

  it('updates the course name', async () => {
    act(renderCourseEdit);
    const input = await screen.findByPlaceholderText('Test Course');
    act(() => {
      userEvent.type(input, 'Updated Course');
    });
    act(() => {
      userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    });
    expect(await screen.findByText('Updated Course')).toBeInTheDocument();
  });
});
