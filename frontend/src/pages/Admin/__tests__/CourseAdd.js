import '@testing-library/jest-dom';
import React from 'react';
import {
  act,
  render,
} from '@testing-library/react';
import CourseAdd from '../CourseAdd';

const refresh = jest.fn();

describe('CourseAdd', () => {
  const renderIt = () => {
    render(<CourseAdd refresh={refresh} />);
  };

  beforeEach(() => {

  });

  afterEach(() => {

  });

  it('renders', async () => {
    act(() => {
      renderIt();
    });

    const courseNameInput = document.querySelector('input[name="coursename"]');
    expect(courseNameInput).toBeInTheDocument();
  });

  it('calls refresh when submitting', async () => {
    act(() => {
      renderIt();
    });

    const courseNameInput = document.querySelector('input[name="coursename"]');
    const addButton = document.querySelector('button[data-testid="add-course"]');

    expect(courseNameInput).toBeInTheDocument();

    act(() => {
      courseNameInput.value = 'New Course';
      addButton.click();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
