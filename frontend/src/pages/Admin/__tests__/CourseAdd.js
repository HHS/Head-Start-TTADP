import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import CourseAdd from '../CourseAdd';

describe('CourseAdd', () => {
  const mockRefresh = jest.fn();

  beforeEach(() => {
    fetchMock.reset();
    render(<CourseAdd refresh={mockRefresh} />);
  });

  it('renders the CourseAdd component', () => {
    expect(screen.getByText('Add a new course')).toBeInTheDocument();
    expect(screen.getByLabelText('Course name')).toBeInTheDocument();
    expect(screen.getByTestId('add-course')).toBeInTheDocument();
  });
});
