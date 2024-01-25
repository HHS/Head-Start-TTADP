import '@testing-library/jest-dom';
import React from 'react';
import {
  render, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import Courses from '../Courses';

describe('Courses', () => {
  const renderTest = () => {
    render(<Courses />);
  };

  afterEach(() => fetchMock.restore());

  it('renders page', async () => {
    act(() => {
      renderTest();
    });

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });
});
