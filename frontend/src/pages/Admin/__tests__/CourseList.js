import { Router } from 'react-router';
import React from 'react';
import {
  render,
  screen,
  fireEvent,
} from '@testing-library/react';
import { createMemoryHistory } from 'history';
import CourseList from '../CourseList';

describe('CourseList', () => {
  const courses = [
    { id: 1, name: 'Introduction to Dogs' },
    { id: 2, name: 'Advanced Penguins' },
    { id: 3, name: 'Data Structures and Kangaroos' },
  ];

  const renderComponent = (c) => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <CourseList courses={c || courses} />
      </Router>,
    );
  };

  it('renders without courses', () => {
    // render(<CourseList courses={[]} />);
    renderComponent([]);
    expect(screen.queryByLabelText('Filter courses by name')).toBeInTheDocument();
  });

  it('renders with courses and allows filtering', () => {
    // render(<CourseList courses={courses} />);
    renderComponent();
    expect(screen.getByLabelText('Filter courses by name')).toBeInTheDocument();
    expect(screen.getByText('Introduction to Dogs')).toBeInTheDocument();
    expect(screen.getByText('Advanced Penguins')).toBeInTheDocument();
    expect(screen.getByText('Data Structures and Kangaroos')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter courses by name'), { target: { value: 'dog' } });
    expect(screen.getByText('Introduction to Dogs')).toBeInTheDocument();
    expect(screen.queryByText('Advanced Penguins')).not.toBeInTheDocument();
    expect(screen.queryByText('Data Structures and Kangaroos')).not.toBeInTheDocument();
  });

  it('handles no matching filter results', () => {
    // render(<CourseList courses={courses} />);
    renderComponent();
    fireEvent.change(screen.getByLabelText('Filter courses by name'), { target: { value: 'asdf' } });
    expect(screen.queryByText('Introduction to Dogs')).not.toBeInTheDocument();
    expect(screen.queryByText('Advanced Penguins')).not.toBeInTheDocument();
    expect(screen.queryByText('Data Structures and Kangaroos')).not.toBeInTheDocument();
  });
});
