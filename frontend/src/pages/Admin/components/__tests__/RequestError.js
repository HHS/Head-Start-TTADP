import '@testing-library/jest-dom';
import React from 'react';
import {
  render, act, waitFor,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import fetchMock from 'fetch-mock';
import RequestError from '../RequestError';

describe('RequestError', () => {
  const renderTest = () => {
    render(
      <MemoryRouter initialEntries={['/1']}>
        <Routes>
          <Route path=":errorId" element={<RequestError />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  afterEach(() => fetchMock.restore());

  it('renders a list of errors', async () => {
    fetchMock.get('/api/admin/requestErrors/1', {
      id: 1,
      responseCode: 500,
      method: 'GET',
      operation: 'Test Operation 1',
      responseBody: {
        name: { e: 'Error 1' },
        parent: { p: 'Error 1 Parent' },
        original: { o: 'Error 1 Original' },
        sql: { s: 'Error 1 SQL' },
        parameters: { p: 'Error 1 Parameters' },
        errorStack: { e: 'Error 1 Stack' },
      },
    });

    act(() => {
      renderTest();
    });

    await waitFor(() => expect(fetchMock.called('/api/admin/requestErrors/1')).toBe(true));
  });

  it('handles error when fetching error', async () => {
    fetchMock.get('/api/admin/requestErrors/1', 500);

    act(() => {
      renderTest();
    });

    await waitFor(() => expect(fetchMock.called('/api/admin/requestErrors/1')).toBe(true));
  });
});
