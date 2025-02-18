import '@testing-library/jest-dom';
import { Router } from 'react-router';
import React from 'react';
import {
  render,
  act,
  screen,
} from '@testing-library/react';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import Courses from '../Courses';

describe('Courses', () => {
  const renderTest = () => {
    const history = createMemoryHistory();
    render(
      <Router history={history}>
        <Courses />
      </Router>,
    );
  };

  beforeEach(() => {
    fetchMock.get('/api/courses', [
      {
        id: 1,
        name: 'Course 1',
      },
      {
        id: 2,
        name: 'Course 2',
      },
    ]);
  });

  afterEach(() => fetchMock.restore());

  it('renders page', async () => {
    act(() => {
      renderTest();
    });

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  it('allows exporting courses', async () => {
    act(() => {
      renderTest();
    });

    expect(fetchMock.called('/api/courses')).toBe(true);

    const exportButton = await screen.findByRole('button', { name: 'Export courses as CSV' });
    const link = {
      click: jest.fn(),
      remove: jest.fn(),
    };

    jest.spyOn(document, 'createElement').mockImplementation(() => link);

    act(() => {
      exportButton.click();
    });

    expect(link.download).toBe('courses.csv');
    expect(link.href).toBe('data:text/csv;charset=utf-8,course%20name%0A%22Course%201%22%0A%22Course%202%22%0A');
    expect(link.click).toHaveBeenCalledTimes(1);
  });
});
